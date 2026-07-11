import { detectFullscreenApi } from "./api-map";
import { createFallback } from "./fallback";
import { makeError, normalizeError } from "./errors";
import type {
  RawFullscreenApi,
  ScreenfullChangeListener,
  ScreenfullController,
  ScreenfullError,
  ScreenfullErrorListener,
  ScreenfullFallbackHandler,
  ScreenfullOptions,
  ScreenfullRequestOptions,
  ScreenfullResult,
  ScreenfullState,
  ScreenfullStatus,
} from "../typing";

const success = (
  mode: "native" | "fallback",
  element: Element | null,
): ScreenfullResult => ({
  ok: true,
  mode,
  element,
  error: null,
});

export function createScreenfullController(
  supplied: ScreenfullOptions = {},
): ScreenfullController {
  const doc =
    supplied.document ??
    (typeof document === "undefined" ? undefined : document);
  const raw = doc ? detectFullscreenApi(doc) : null;
  const changes = new Set<ScreenfullChangeListener>();
  const errors = new Set<ScreenfullErrorListener>();
  let fallback: ScreenfullFallbackHandler | null = createFallback(supplied);
  let fallbackElement: Element | null = null;
  let activeFallbackOptions: ScreenfullOptions = supplied;
  let previousFocus: HTMLElement | null = null;
  let pending = false;
  let destroyed = false;
  let currentError: ScreenfullError | null = null;
  let currentStatus: ScreenfullStatus = !doc ? "unsupported" : "idle";

  const nativeElement = (): Element | null =>
    doc && raw
      ? ((doc as unknown as Record<string, unknown>)[
          raw.fullscreenElement
        ] as Element | null)
      : null;
  const state = (): ScreenfullState => ({
    isEnabled: Boolean(
      doc &&
      raw &&
      (doc as unknown as Record<string, unknown>)[raw.fullscreenEnabled] !==
        false,
    ),
    isFullscreen: Boolean(nativeElement() || fallbackElement),
    isFallback: Boolean(fallbackElement),
    element: nativeElement() || fallbackElement,
    status: currentStatus,
  });
  let lastState: ScreenfullState | null = null;
  let lastFullscreen = state().isFullscreen;
  const emitChange = () => {
    const value = state();
    if (
      lastState &&
      lastState.isEnabled === value.isEnabled &&
      lastState.isFullscreen === value.isFullscreen &&
      lastState.isFallback === value.isFallback &&
      lastState.status === value.status &&
      lastState.element === value.element
    )
      return;
    lastState = value;
    supplied.onChange?.(value);
    changes.forEach((listener) => listener(value));
  };
  const report = (
    error: ScreenfullError,
    preserveStatus = false,
  ): ScreenfullResult => {
    currentError = error;
    if (!preserveStatus)
      currentStatus =
        error.code === "NOT_SUPPORTED" || error.code === "NOT_IN_BROWSER"
          ? "unsupported"
          : "error";
    if (!destroyed) {
      supplied.onError?.(error);
      errors.forEach((listener) => listener(error));
      emitChange();
    }
    if (supplied.debug && typeof console !== "undefined")
      console.warn("[vue-screenfull]", error);
    return { ok: false, mode: "none", element: state().element, error };
  };
  const onNativeChange = () => {
    currentStatus = nativeElement() ? "fullscreen" : "idle";
    const value = state();
    if (value.isFullscreen !== lastFullscreen) {
      if (value.isFullscreen) supplied.onEnter?.(value);
      else supplied.onExit?.(value);
      lastFullscreen = value.isFullscreen;
    }
    emitChange();
  };
  const onNativeError = (event: Event) => {
    if (!pending) report(normalizeError(event, "request", doc));
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && fallbackElement) void api.exit();
  };
  const onNavigation = () => {
    if (state().isFullscreen) void api.exit();
  };

  const waitForNativeTransition = () => {
    let settled = false;
    let timeoutId: number | undefined;
    let resolveOutcome: (
      outcome: { ok: true } | { ok: false; cause: unknown },
    ) => void;
    const promise = new Promise<{ ok: true } | { ok: false; cause: unknown }>(
      (resolve) => {
        resolveOutcome = resolve;
      },
    );
    const cleanup = () => {
      if (!doc || !raw) return;
      doc.removeEventListener(raw.fullscreenchange, onChange);
      doc.removeEventListener(raw.fullscreenerror, onError);
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
    const settle = (outcome: { ok: true } | { ok: false; cause: unknown }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolveOutcome(outcome);
    };
    const onChange = () => settle({ ok: true });
    const onError = (event: Event) => settle({ ok: false, cause: event });
    if (doc && raw) {
      doc.addEventListener(raw.fullscreenchange, onChange);
      doc.addEventListener(raw.fullscreenerror, onError);
      timeoutId = globalThis.setTimeout(
        () =>
          settle({
            ok: false,
            cause: new Error("Timed out waiting for a fullscreen event."),
          }),
        3000,
      );
    }
    return { promise, cleanup };
  };

  const runNativeTransition = async (
    invoke: () => PromiseLike<void> | void,
  ): Promise<void> => {
    const transition = waitForNativeTransition();
    try {
      const returned = invoke();
      if (returned && typeof returned.then === "function") {
        await returned;
      } else {
        const outcome = await transition.promise;
        if (!outcome.ok) throw outcome.cause;
      }
    } finally {
      transition.cleanup();
    }
  };

  if (doc && raw) {
    doc.addEventListener(raw.fullscreenchange, onNativeChange);
    doc.addEventListener(raw.fullscreenerror, onNativeError);
  }
  if (doc) {
    doc.addEventListener("keydown", onKeydown);
    if (supplied.exitOnRouteChange)
      doc.defaultView?.addEventListener("popstate", onNavigation);
  }

  async function enterFallback(
    element: Element,
    requestOptions?: ScreenfullRequestOptions,
  ): Promise<ScreenfullResult> {
    const selected = requestOptions?.fallback ?? supplied.fallback;
    const options = { ...supplied, fallback: selected };
    fallback = createFallback(options);
    if (!doc || !fallback) {
      return report(
        makeError(
          "NOT_SUPPORTED",
          "The Fullscreen API is unavailable and no fallback is enabled.",
        ),
      );
    }
    try {
      activeFallbackOptions = options;
      await fallback.enter({ element, document: doc, options });
      if (destroyed) {
        await fallback.exit({ element, document: doc, options });
        const error = makeError(
          "REQUEST_FAILED",
          "The fullscreen controller was destroyed before the fallback request completed.",
        );
        return { ok: false, mode: "none", element: null, error };
      }
      fallbackElement = element;
      currentStatus = "fallback";
      const value = state();
      lastFullscreen = true;
      supplied.onFallback?.(value);
      supplied.onEnter?.(value);
      emitChange();
      return success("fallback", element);
    } catch (cause) {
      return report(normalizeError(cause, "fallback", doc));
    }
  }

  const api: ScreenfullController = {
    get isEnabled() {
      return state().isEnabled;
    },
    get isFullscreen() {
      return state().isFullscreen;
    },
    get isFallback() {
      return state().isFallback;
    },
    get element() {
      return state().element;
    },
    get status() {
      return currentStatus;
    },
    get error() {
      return currentError;
    },
    get raw(): Readonly<RawFullscreenApi> | null {
      return raw;
    },
    async request(element, requestOptions) {
      if (destroyed || !doc)
        return report(
          makeError(
            "NOT_IN_BROWSER",
            "Fullscreen is unavailable outside a browser document.",
          ),
        );
      if (pending)
        return report(
          makeError(
            "REQUEST_IN_PROGRESS",
            "A fullscreen transition is already in progress.",
          ),
          true,
        );
      const target = element === undefined ? doc.documentElement : element;
      if (!target || (target as Node).nodeType !== 1)
        return report(
          makeError(
            "INVALID_TARGET",
            "The fullscreen target is not an Element.",
          ),
        );
      if (!target.isConnected || target.ownerDocument !== doc)
        return report(
          makeError(
            "TARGET_NOT_CONNECTED",
            "The fullscreen target must be connected to the current document.",
          ),
        );
      if (state().isFullscreen) {
        if (state().element === target)
          return success(fallbackElement ? "fallback" : "native", target);
        const exited = await api.exit();
        if (!exited.ok) return exited;
      }
      previousFocus =
        supplied.restoreFocus === false
          ? null
          : (doc.activeElement as HTMLElement | null);
      pending = true;
      currentStatus = "requesting";
      emitChange();
      try {
        if (!raw || !api.isEnabled)
          return await enterFallback(target, requestOptions);
        const method = (target as unknown as Record<string, unknown>)[
          raw.requestFullscreen
        ];
        const nativeOptions = { ...requestOptions };
        delete nativeOptions.fallback;
        await runNativeTransition(() =>
          (
            method as (options?: FullscreenOptions) => PromiseLike<void> | void
          ).call(target, nativeOptions),
        );
        if (!destroyed) {
          currentStatus = nativeElement() ? "fullscreen" : "idle";
          emitChange();
        }
        return success("native", nativeElement() || target);
      } catch (cause) {
        if (destroyed) {
          const error = normalizeError(cause, "request", doc);
          return { ok: false, mode: "none", element: null, error };
        }
        const normalized = normalizeError(cause, "request", doc);
        if (requestOptions?.fallback || supplied.fallback)
          return await enterFallback(target, requestOptions);
        return report(normalized);
      } finally {
        pending = false;
      }
    },
    async exit() {
      if (destroyed || !doc)
        return report(
          makeError(
            "NOT_IN_BROWSER",
            "Fullscreen is unavailable outside a browser document.",
          ),
        );
      if (pending)
        return report(
          makeError(
            "REQUEST_IN_PROGRESS",
            "A fullscreen transition is already in progress.",
          ),
          true,
        );
      if (!state().isFullscreen) return success("native", null);
      pending = true;
      currentStatus = "exiting";
      emitChange();
      try {
        if (fallbackElement && fallback) {
          const element = fallbackElement;
          await fallback.exit({
            element,
            document: doc,
            options: activeFallbackOptions,
          });
          fallbackElement = null;
          currentStatus = "idle";
          const value = state();
          lastFullscreen = false;
          supplied.onExit?.(value);
          emitChange();
        } else if (raw && nativeElement()) {
          const method = (doc as unknown as Record<string, unknown>)[
            raw.exitFullscreen
          ];
          await runNativeTransition(() =>
            (method as () => PromiseLike<void> | void).call(doc),
          );
          currentStatus = nativeElement() ? "fullscreen" : "idle";
          emitChange();
        }
        previousFocus?.focus?.();
        previousFocus = null;
        return success(
          fallbackElement ? "fallback" : "native",
          state().element,
        );
      } catch (cause) {
        return report(normalizeError(cause, "exit", doc));
      } finally {
        pending = false;
      }
    },
    async toggle(element, requestOptions) {
      return state().isFullscreen
        ? api.exit()
        : api.request(element, requestOptions);
    },
    on(event, listener) {
      if (event === "change") changes.add(listener as ScreenfullChangeListener);
      else errors.add(listener as ScreenfullErrorListener);
    },
    off(event, listener) {
      if (event === "change")
        changes.delete(listener as ScreenfullChangeListener);
      else errors.delete(listener as ScreenfullErrorListener);
    },
    clearError() {
      currentError = null;
      if (currentStatus === "error")
        currentStatus = state().isFullscreen
          ? fallbackElement
            ? "fallback"
            : "fullscreen"
          : "idle";
      emitChange();
    },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      if (fallbackElement && fallback && doc) {
        const element = fallbackElement;
        try {
          await fallback.exit({
            element,
            document: doc,
            options: activeFallbackOptions,
          });
        } catch (cause) {
          currentError = normalizeError(cause, "fallback", doc);
        }
        fallbackElement = null;
      }
      if (doc && raw) {
        doc.removeEventListener(raw.fullscreenchange, onNativeChange);
        doc.removeEventListener(raw.fullscreenerror, onNativeError);
      }
      doc?.removeEventListener("keydown", onKeydown);
      if (supplied.exitOnRouteChange)
        doc?.defaultView?.removeEventListener("popstate", onNavigation);
      changes.clear();
      errors.clear();
    },
  };
  return api;
}
