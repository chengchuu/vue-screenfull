/** @jest-environment jsdom */
import { effectScope, h, ref, createApp } from "vue";
import VueScreenfull, {
  Screenfull,
  createScreenfullController,
  detectFullscreenApi,
  resolveScreenfullTarget,
  useScreenfull,
  vScreenfull,
} from "../src/index";

let activeElement = null;
let requestImplementation;

function installNative(prefix = "standard") {
  const names =
    prefix === "old-webkit"
      ? [
          "webkitRequestFullScreen",
          "webkitCancelFullScreen",
          "webkitCurrentFullScreenElement",
          "webkitCancelFullScreen",
        ]
      : prefix === "webkit"
        ? [
            "webkitRequestFullscreen",
            "webkitExitFullscreen",
            "webkitFullscreenElement",
            "webkitFullscreenEnabled",
          ]
        : [
            "requestFullscreen",
            "exitFullscreen",
            "fullscreenElement",
            "fullscreenEnabled",
          ];
  requestImplementation = async function () {
    activeElement = this;
    document.dispatchEvent(
      new Event(
        prefix === "standard" ? "fullscreenchange" : "webkitfullscreenchange",
      ),
    );
  };
  Object.defineProperty(Element.prototype, names[0], {
    configurable: true,
    get: () => requestImplementation,
  });
  Object.defineProperty(document, names[1], {
    configurable: true,
    writable: true,
    value: async () => {
      activeElement = null;
      document.dispatchEvent(
        new Event(
          prefix === "standard" ? "fullscreenchange" : "webkitfullscreenchange",
        ),
      );
    },
  });
  Object.defineProperty(document, names[2], {
    configurable: true,
    get: () => activeElement,
  });
  if (names[3] !== names[1]) {
    Object.defineProperty(document, names[3], {
      configurable: true,
      value: true,
    });
  }
  return names;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  activeElement = null;
  for (const name of [
    "requestFullscreen",
    "webkitRequestFullscreen",
    "webkitRequestFullScreen",
    "exitFullscreen",
    "webkitExitFullscreen",
    "webkitCancelFullScreen",
    "fullscreenElement",
    "webkitFullscreenElement",
    "webkitCurrentFullScreenElement",
    "fullscreenEnabled",
    "webkitFullscreenEnabled",
  ]) {
    delete Element.prototype[name];
    delete document[name];
  }
  jest.restoreAllMocks();
});

test.each([
  ["standard", "requestFullscreen"],
  ["webkit", "webkitRequestFullscreen"],
  ["old-webkit", "webkitRequestFullScreen"],
])("detects the %s Fullscreen API", (prefix, requestName) => {
  installNative(prefix);
  expect(detectFullscreenApi(document).requestFullscreen).toBe(requestName);
});

test("requests, tracks native changes, toggles, and removes listeners", async () => {
  installNative();
  const target = document.body.appendChild(document.createElement("section"));
  const changes = jest.fn();
  const controller = createScreenfullController();
  controller.on("change", changes);
  await expect(controller.request(target)).resolves.toMatchObject({
    ok: true,
    mode: "native",
  });
  expect(controller.element).toBe(target);
  expect(controller.isFullscreen).toBe(true);
  await controller.toggle(target);
  expect(controller.isFullscreen).toBe(false);
  expect(changes).toHaveBeenCalled();
  const count = changes.mock.calls.length;
  await controller.destroy();
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(changes).toHaveBeenCalledTimes(count);
});

test("waits for a fullscreen event when a legacy request returns void", async () => {
  installNative();
  let dispatchChange;
  requestImplementation = function () {
    activeElement = this;
    dispatchChange = () =>
      document.dispatchEvent(new Event("fullscreenchange"));
  };
  const target = document.body.appendChild(document.createElement("section"));
  const controller = createScreenfullController();
  let settled = false;
  const request = controller.request(target).then((result) => {
    settled = true;
    return result;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  dispatchChange();
  await expect(request).resolves.toMatchObject({ ok: true, mode: "native" });
  await controller.destroy();
});

test("emits when native fullscreen switches between similar elements", async () => {
  installNative();
  const first = document.body.appendChild(document.createElement("div"));
  const second = document.body.appendChild(document.createElement("div"));
  const changes = jest.fn();
  const controller = createScreenfullController();
  controller.on("change", changes);
  activeElement = first;
  document.dispatchEvent(new Event("fullscreenchange"));
  activeElement = second;
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(changes).toHaveBeenCalledTimes(2);
  expect(changes.mock.calls[1][0].element).toBe(second);
  await controller.destroy();
});

test("switches native targets without exiting fullscreen first", async () => {
  installNative();
  const first = document.body.appendChild(document.createElement("div"));
  const second = document.body.appendChild(document.createElement("div"));
  const controller = createScreenfullController();
  await controller.request(first);
  const exit = jest.spyOn(document, "exitFullscreen");
  await expect(controller.request(second)).resolves.toMatchObject({
    ok: true,
    element: second,
  });
  expect(exit).not.toHaveBeenCalled();
  expect(controller.element).toBe(second);
  await controller.destroy();
});

test("exits native fullscreen before falling back during a target switch", async () => {
  installNative();
  window.scrollTo = jest.fn();
  const first = document.body.appendChild(document.createElement("div"));
  const second = document.body.appendChild(document.createElement("div"));
  const controller = createScreenfullController({ fallback: "css" });
  await controller.request(first);
  const exit = jest.spyOn(document, "exitFullscreen");
  requestImplementation = async () => {
    throw new DOMException("Request denied", "NotAllowedError");
  };

  await expect(controller.request(second)).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
    element: second,
  });
  expect(exit).toHaveBeenCalledTimes(1);
  expect(activeElement).toBeNull();
  expect(controller.element).toBe(second);
  expect(controller.isFallback).toBe(true);
  await controller.exit();
  expect(controller.isFullscreen).toBe(false);
  await controller.destroy();
});

test("rejects detached targets and normalizes denied requests", async () => {
  installNative();
  const controller = createScreenfullController();
  await expect(controller.request(null)).resolves.toMatchObject({
    error: { code: "INVALID_TARGET" },
  });
  await expect(
    controller.request(document.createElement("div")),
  ).resolves.toMatchObject({
    error: { code: "TARGET_NOT_CONNECTED" },
  });
  const target = document.body.appendChild(document.createElement("div"));
  requestImplementation = async () => {
    throw new DOMException("Permission denied", "NotAllowedError");
  };
  await expect(controller.request(target)).resolves.toMatchObject({
    error: { code: "PERMISSION_DENIED" },
  });
  await controller.destroy();
});

test("prevents overlapping native requests", async () => {
  installNative();
  let release;
  requestImplementation = () => new Promise((resolve) => (release = resolve));
  const target = document.body.appendChild(document.createElement("div"));
  const controller = createScreenfullController();
  const first = controller.request(target);
  await expect(controller.request(target)).resolves.toMatchObject({
    error: { code: "REQUEST_IN_PROGRESS" },
  });
  expect(controller.status).toBe("requesting");
  release();
  await first;
  await controller.destroy();
});

test("isolates throwing callbacks without leaving the controller pending", async () => {
  installNative();
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const target = document.body.appendChild(document.createElement("div"));
  const laterListener = jest.fn();
  const controller = createScreenfullController({
    onChange: () => {
      throw new Error("consumer callback failed");
    },
  });
  controller.on("change", () => {
    throw new Error("consumer listener failed");
  });
  controller.on("change", laterListener);
  await expect(controller.request(target)).resolves.toMatchObject({ ok: true });
  expect(controller.status).toBe("fullscreen");
  expect(laterListener).toHaveBeenCalled();
  expect(consoleError).toHaveBeenCalled();
  await expect(controller.exit()).resolves.toMatchObject({ ok: true });
  await controller.destroy();
});

test("ignores a pending request transition after destroy", async () => {
  installNative();
  let release;
  requestImplementation = () => new Promise((resolve) => (release = resolve));
  const target = document.body.appendChild(document.createElement("div"));
  const controller = createScreenfullController();
  const changes = jest.fn();
  controller.on("change", changes);
  const pending = controller.request(target);
  expect(changes).toHaveBeenCalledTimes(1);
  await controller.destroy();
  release();
  await pending;
  expect(changes).toHaveBeenCalledTimes(1);
});

test("cleans a fallback that resolves after destroy without emitting", async () => {
  let release;
  const handler = {
    enter: jest.fn(() => new Promise((resolve) => (release = resolve))),
    exit: jest.fn(),
  };
  const target = document.body.appendChild(document.createElement("div"));
  const changes = jest.fn();
  const controller = createScreenfullController({ fallback: handler });
  controller.on("change", changes);
  const pending = controller.request(target);
  await controller.destroy();
  release();
  await expect(pending).resolves.toMatchObject({ ok: false, mode: "none" });
  expect(handler.exit).toHaveBeenCalledTimes(1);
  expect(changes).toHaveBeenCalledTimes(1);
});

test("activates CSS fallback and restores styles and body scroll", async () => {
  window.scrollTo = jest.fn();
  const target = document.body.appendChild(document.createElement("section"));
  target.style.position = "relative";
  document.body.style.overflow = "visible";
  const controller = createScreenfullController({ fallback: "css" });
  await expect(controller.request(target)).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
  });
  expect(target.style.position).toBe("fixed");
  expect(target.classList.contains("vue-screenfull-fallback")).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await expect(controller.exit()).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
    element: null,
  });
  expect(target.style.position).toBe("relative");
  expect(target.classList.contains("vue-screenfull-fallback")).toBe(false);
  expect(document.body.style.overflow).toBe("visible");
  await controller.destroy();
});

test("keeps a target-local exit reachable and restores initiating focus", async () => {
  window.scrollTo = jest.fn();
  const trigger = document.body.appendChild(document.createElement("button"));
  const target = document.body.appendChild(document.createElement("section"));
  target.appendChild(document.createElement("video"));
  const exit = target.appendChild(document.createElement("button"));
  trigger.focus();
  const controller = createScreenfullController({
    fallback: "css",
    restoreFocus: true,
  });

  await expect(controller.request(target)).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
    element: target,
  });
  exit.focus();
  expect(document.activeElement).toBe(exit);

  await controller.exit();
  expect(document.activeElement).toBe(trigger);
  expect(target.contains(exit)).toBe(true);
  await controller.destroy();
});

test.each([
  ["document root", () => document.documentElement],
  ["body", () => document.body],
])("keeps a %s CSS fallback scrollable", async (_label, getTarget) => {
  window.scrollTo = jest.fn();
  document.body.style.setProperty("overflow", "visible", "important");
  const target = getTarget();
  const controller = createScreenfullController({ fallback: "css" });

  await expect(controller.request(target)).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
  });
  expect(target.style.getPropertyValue("overflow")).toBe("auto");
  expect(target.style.getPropertyPriority("overflow")).toBe("important");
  expect(document.body.style.getPropertyValue("overflow")).not.toBe("hidden");

  await controller.exit();
  expect(document.body.style.getPropertyValue("overflow")).toBe("visible");
  expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  await controller.destroy();
});

test("rejects a second CSS fallback without leaking body scroll state", async () => {
  window.scrollTo = jest.fn();
  const first = document.body.appendChild(document.createElement("section"));
  const second = document.body.appendChild(document.createElement("section"));
  const controllerA = createScreenfullController({ fallback: "css" });
  const controllerB = createScreenfullController({ fallback: "css" });
  await expect(controllerA.request(first)).resolves.toMatchObject({
    ok: true,
    mode: "fallback",
  });
  await expect(controllerB.request(second)).resolves.toMatchObject({
    ok: false,
    error: { code: "FALLBACK_FAILED" },
  });
  expect(second.style.position).toBe("");
  await controllerA.exit();
  expect(document.body.style.overflow).toBe("");
  await controllerA.destroy();
  await controllerB.destroy();
});

test("preserves important styles and a pre-existing fallback class", async () => {
  window.scrollTo = jest.fn();
  const target = document.body.appendChild(document.createElement("section"));
  target.classList.add("existing-fallback");
  target.style.setProperty("position", "relative", "important");
  document.body.style.setProperty("overflow", "clip", "important");
  const controller = createScreenfullController({
    fallback: "css",
    fallbackClass: "existing-fallback",
  });
  await controller.request(target);
  expect(target.style.getPropertyValue("position")).toBe("fixed");
  await controller.exit();
  expect(target.style.getPropertyValue("position")).toBe("relative");
  expect(target.style.getPropertyPriority("position")).toBe("important");
  expect(target.classList.contains("existing-fallback")).toBe(true);
  expect(document.body.style.getPropertyValue("overflow")).toBe("clip");
  expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
  await controller.destroy();
});

test("resolves elements, Vue refs, component refs, selectors, and defaults", () => {
  const target = document.body.appendChild(document.createElement("div"));
  target.id = "target";
  expect(resolveScreenfullTarget(undefined, document)).toBe(
    document.documentElement,
  );
  expect(resolveScreenfullTarget(null, document)).toBeNull();
  expect(resolveScreenfullTarget(ref(null), document)).toBeNull();
  expect(resolveScreenfullTarget("#target", document)).toBe(target);
  expect(resolveScreenfullTarget("[", document)).toBeNull();
  expect(resolveScreenfullTarget(ref(target), document)).toBe(target);
  expect(resolveScreenfullTarget(ref({ $el: target }), document)).toBe(target);
  expect(resolveScreenfullTarget({ nodeType: 1 }, document)).toBeNull();
});

test("composable instances synchronize through document events and clean up with scopes", async () => {
  installNative();
  const target = document.body.appendChild(document.createElement("div"));
  const scopeA = effectScope();
  const scopeB = effectScope();
  const a = scopeA.run(() => useScreenfull());
  const b = scopeB.run(() => useScreenfull());
  await a.request(ref(target));
  expect(a.isFullscreen.value).toBe(true);
  expect(b.isFullscreen.value).toBe(true);
  scopeA.stop();
  await b.exit();
  expect(b.isFullscreen.value).toBe(false);
  scopeB.stop();
});

test("returns a structured invalid-selector error from the composable", async () => {
  const scope = effectScope();
  const screenfull = scope.run(() => useScreenfull({ fallback: "css" }));
  await expect(screenfull.request("[")).resolves.toMatchObject({
    error: { code: "INVALID_TARGET" },
  });
  screenfull.clearError();
  expect(screenfull.error.value).toBeNull();
  scope.stop();
});

test("keeps invalid-target results structured when onError throws", async () => {
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const scope = effectScope();
  const screenfull = scope.run(() =>
    useScreenfull({
      onError: () => {
        throw new Error("consumer callback failed");
      },
    }),
  );
  await expect(screenfull.request("#missing")).resolves.toMatchObject({
    ok: false,
    error: { code: "INVALID_TARGET" },
  });
  expect(consoleError).toHaveBeenCalled();
  scope.stop();
});

test("returns INVALID_TARGET for explicit null instead of fullscreening the page", async () => {
  installNative();
  const request = jest.fn(requestImplementation);
  requestImplementation = request;
  const scope = effectScope();
  const screenfull = scope.run(() => useScreenfull());
  await expect(screenfull.request(null)).resolves.toMatchObject({
    ok: false,
    error: { code: "INVALID_TARGET" },
  });
  expect(request).not.toHaveBeenCalled();
  scope.stop();
});

test("plugin registers the component and directive", () => {
  const component = jest.fn();
  const directive = jest.fn();
  VueScreenfull.install(
    { component, directive },
    { componentName: "Fs", directiveName: "fs" },
  );
  expect(component).toHaveBeenCalledWith("Fs", Screenfull);
  expect(directive).toHaveBeenCalledWith("fs", vScreenfull);
});

test("renderless component exposes slot actions and directive cleans its click listener", async () => {
  const root = document.body.appendChild(document.createElement("div"));
  let slot;
  const app = createApp(() =>
    h(
      Screenfull,
      { fallback: "css" },
      {
        default: (value) => {
          slot = value;
          return h("span", "slot");
        },
      },
    ),
  );
  app.mount(root);
  expect(typeof slot.toggle).toBe("function");
  app.unmount();

  const button = document.body.appendChild(document.createElement("button"));
  const remove = jest.spyOn(button, "removeEventListener");
  vScreenfull.mounted(button, {
    value: { action: "exit" },
    arg: undefined,
    modifiers: {},
    instance: null,
    oldValue: undefined,
    dir: vScreenfull,
  });
  button.click();
  vScreenfull.unmounted(button);
  expect(remove).toHaveBeenCalledWith("click", expect.any(Function));
});

test("renderless component honors an explicit slot action target", async () => {
  window.scrollTo = jest.fn();
  const root = document.body.appendChild(document.createElement("div"));
  const target = document.body.appendChild(document.createElement("section"));
  let slot;
  const app = createApp(() =>
    h(
      Screenfull,
      { fallback: "css" },
      {
        default: (value) => {
          slot = value;
          return h("span", "slot");
        },
      },
    ),
  );
  app.mount(root);
  await slot.request(target);
  expect(target.style.position).toBe("fixed");
  expect(document.documentElement.style.position).toBe("");
  await slot.exit();
  app.unmount();
});

test("directive does not fullscreen the page when its target cannot be resolved", async () => {
  installNative();
  const request = jest.fn(requestImplementation);
  requestImplementation = request;
  const button = document.body.appendChild(document.createElement("button"));
  const binding = {
    value: "#missing-target",
    arg: "request",
    modifiers: {},
    instance: null,
    oldValue: undefined,
    dir: vScreenfull,
  };
  vScreenfull.mounted(button, binding);
  button.click();
  await Promise.resolve();
  expect(request).not.toHaveBeenCalled();
  expect(activeElement).toBeNull();
  vScreenfull.unmounted(button);
});
