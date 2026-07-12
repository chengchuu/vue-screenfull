import {
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
  shallowReadonly,
  shallowRef,
} from "vue";
import { createScreenfullController } from "../core/controller";
import { makeError } from "../core/errors";
import { resolveScreenfullTarget } from "../core/target";
import type {
  ScreenfullChangeListener,
  ScreenfullError,
  ScreenfullErrorListener,
  ScreenfullOptions,
  ScreenfullRequestOptions,
  ScreenfullResult,
  ScreenfullStatus,
  ScreenfullTarget,
  UseScreenfullReturn,
} from "../typing";

export function useScreenfull(
  options: ScreenfullOptions = {},
): UseScreenfullReturn {
  const controller = createScreenfullController(options);
  const isEnabled = ref(controller.isEnabled);
  const isFullscreen = ref(controller.isFullscreen);
  const isFallback = ref(controller.isFallback);
  const fullscreenElement = shallowRef<Element | null>(controller.element);
  const targetElement = shallowRef<Element | null>(null);
  const status = ref<ScreenfullStatus>(controller.status);
  const error = shallowRef<ScreenfullError | null>(controller.error);
  const doc =
    options.document ??
    (typeof document === "undefined" ? undefined : document);

  const sync: ScreenfullChangeListener = (state) => {
    isEnabled.value = state.isEnabled;
    isFullscreen.value = state.isFullscreen;
    isFallback.value = state.isFallback;
    fullscreenElement.value = state.element;
    status.value = state.status;
    error.value = controller.error;
  };
  const syncError: ScreenfullErrorListener = (value) => {
    error.value = value;
    status.value = controller.status;
  };
  controller.on("change", sync);
  controller.on("error", syncError);

  const invalid = (): ScreenfullResult => {
    const value = makeError(
      doc ? "INVALID_TARGET" : "NOT_IN_BROWSER",
      doc
        ? "The target is not a valid element or selector in this document."
        : "Fullscreen is unavailable outside a browser document.",
    );
    error.value = value;
    status.value = doc ? "error" : "unsupported";
    try {
      options.onError?.(value);
    } catch (cause) {
      if (typeof console !== "undefined")
        console.error("[vue-screenfull] Listener failed.", cause);
    }
    return { ok: false, mode: "none", element: null, error: value };
  };
  const resolve = (target?: ScreenfullTarget) => {
    const value = resolveScreenfullTarget(target, doc);
    targetElement.value = value;
    return value;
  };
  const request = async (
    target?: ScreenfullTarget,
    requestOptions?: ScreenfullRequestOptions,
  ) => {
    const element = resolve(target);
    return element ? controller.request(element, requestOptions) : invalid();
  };
  const toggle = async (
    target?: ScreenfullTarget,
    requestOptions?: ScreenfullRequestOptions,
  ) => {
    if (controller.isFullscreen) return controller.exit();
    const element = resolve(target);
    return element ? controller.request(element, requestOptions) : invalid();
  };
  const clearError = () => {
    controller.clearError();
    error.value = null;
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      controller.off("change", sync);
      controller.off("error", syncError);
      void controller.destroy();
    });
  }

  return {
    isEnabled: readonly(isEnabled),
    isFullscreen: readonly(isFullscreen),
    isFallback: readonly(isFallback),
    fullscreenElement: shallowReadonly(fullscreenElement),
    targetElement: shallowReadonly(targetElement),
    status: readonly(status),
    error: readonly(error),
    request,
    exit: () => controller.exit(),
    toggle,
    clearError,
  };
}

export function useScreenfullTarget(
  target: ScreenfullTarget,
  options: ScreenfullOptions = {},
): UseScreenfullReturn {
  const screenfull = useScreenfull(options);
  return {
    ...screenfull,
    request: (_target, requestOptions) =>
      screenfull.request(target, requestOptions),
    toggle: (_target, requestOptions) =>
      screenfull.toggle(target, requestOptions),
  };
}
