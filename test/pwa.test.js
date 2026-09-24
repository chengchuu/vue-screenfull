/** @jest-environment jsdom */

const { initializeInstallExperience } = require("../site/pwa/install");
const {
  registerServiceWorker,
  shouldRegisterServiceWorker,
} = require("../site/pwa/registration");

function installMatchMedia(matches = false) {
  const media = new EventTarget();
  Object.assign(media, { matches, media: "(display-mode: standalone)" });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => media),
  });
  return media;
}

function appendManifest(documentRef = document) {
  const manifest = documentRef.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/vue-screenfull/manifest.webmanifest";
  documentRef.head.appendChild(manifest);
}

function renderControls() {
  document.body.innerHTML = `
    <section data-pwa-install-help>
      <span data-pwa-install-container hidden>
        <button data-pwa-install hidden disabled>Install app</button>
      </span>
    </section>
    <p data-pwa-status></p>
  `;
}

class WorkboxFake {
  addEventListener = jest.fn();
  messageSkipWaiting = jest.fn();
  register = jest.fn().mockResolvedValue({ scope: "/vue-screenfull/" });
}

test("the native install prompt is exposed only after the browser offers it", async () => {
  renderControls();
  installMatchMedia(false);
  const cleanup = initializeInstallExperience(
    document,
    window,
    navigator,
    "vue-screenfull",
  );
  const button = document.querySelector("[data-pwa-install]");
  expect(button.hidden).toBe(true);
  expect(button.disabled).toBe(true);
  expect(document.querySelector("[data-pwa-install-help]").hidden).toBe(false);

  const event = new Event("beforeinstallprompt", { cancelable: true });
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: "dismissed" });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(button.hidden).toBe(false);
  expect(button.disabled).toBe(false);
  button.click();
  await event.userChoice;
  await Promise.resolve();
  expect(event.prompt).toHaveBeenCalledTimes(1);
  expect(button.hidden).toBe(true);
  expect(document.querySelector("[data-pwa-status]").textContent).toContain(
    "dismissed",
  );
  cleanup();
});

test("pages without custom install controls preserve the browser prompt", () => {
  document.body.innerHTML = "<p data-pwa-status></p>";
  installMatchMedia(false);
  const cleanup = initializeInstallExperience(
    document,
    window,
    navigator,
    "vue-screenfull",
  );
  const event = new Event("beforeinstallprompt", { cancelable: true });
  event.prompt = jest.fn();
  event.userChoice = Promise.resolve({ outcome: "dismissed" });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(event.prompt).not.toHaveBeenCalled();
  cleanup();
});

test("standalone install state supports display mode and iOS standalone", () => {
  renderControls();
  const displayMode = installMatchMedia(true);
  const removeListener = jest.spyOn(displayMode, "removeEventListener");
  const cleanup = initializeInstallExperience(
    document,
    window,
    navigator,
    "vue-screenfull",
  );
  expect(document.querySelector("[data-pwa-install-help]").hidden).toBe(true);
  cleanup();
  cleanup();
  expect(removeListener).toHaveBeenCalledTimes(1);

  renderControls();
  const changedDisplayMode = installMatchMedia(false);
  const changedCleanup = initializeInstallExperience(
    document,
    window,
    navigator,
    "vue-screenfull",
  );
  expect(document.querySelector("[data-pwa-install-help]").hidden).toBe(false);
  changedDisplayMode.matches = true;
  changedDisplayMode.dispatchEvent(new Event("change"));
  expect(document.querySelector("[data-pwa-install-help]").hidden).toBe(true);
  changedCleanup();

  renderControls();
  installMatchMedia(false);
  const iosCleanup = initializeInstallExperience(
    document,
    window,
    { standalone: true },
    "vue-screenfull",
  );
  expect(document.querySelector("[data-pwa-install-help]").hidden).toBe(true);
  iosCleanup();
});

test("registration requires an enabled safe PWA environment", async () => {
  const config = {
    appName: "vue-screenfull",
    enabled: true,
    scope: "/vue-screenfull/",
    url: "/vue-screenfull/service-worker.js",
  };
  const serviceWorker = { controller: {} };
  const navigatorRef = { serviceWorker };
  const windowRef = {
    isSecureContext: true,
    location: new URL("https://chengchuu.github.io/vue-screenfull/playground/"),
    matchMedia: jest.fn().mockReturnValue({ matches: false }),
    sessionStorage,
  };
  appendManifest();

  expect(
    shouldRegisterServiceWorker(config, document, windowRef, navigatorRef),
  ).toBe(true);
  expect(
    shouldRegisterServiceWorker(
      config,
      document,
      {
        ...windowRef,
        location: new URL("https://chengchuu.github.io/vue-screenfull/"),
      },
      navigatorRef,
    ),
  ).toBe(true);
  expect(
    shouldRegisterServiceWorker(
      { ...config, enabled: false },
      document,
      windowRef,
      navigatorRef,
    ),
  ).toBe(false);
  expect(
    shouldRegisterServiceWorker(
      config,
      document,
      { ...windowRef, isSecureContext: false },
      navigatorRef,
    ),
  ).toBe(false);
  expect(shouldRegisterServiceWorker(config, document, windowRef, {})).toBe(
    false,
  );
  expect(
    shouldRegisterServiceWorker(
      config,
      document.implementation.createHTMLDocument("No manifest"),
      windowRef,
      navigatorRef,
    ),
  ).toBe(false);
  expect(
    shouldRegisterServiceWorker(
      config,
      document,
      {
        ...windowRef,
        location: new URL("https://chengchuu.github.io/vue-screenfull-other/"),
      },
      navigatorRef,
    ),
  ).toBe(false);
  expect(
    shouldRegisterServiceWorker(
      { ...config, scope: "https://example.com/vue-screenfull/" },
      document,
      windowRef,
      navigatorRef,
    ),
  ).toBe(false);

  const workbox = new WorkboxFake();
  await registerServiceWorker(
    config,
    document,
    windowRef,
    navigatorRef,
    (url, options) => {
      expect(url).toBe(config.url);
      expect(options).toEqual({ scope: config.scope });
      return workbox;
    },
  );
  expect(workbox.register).toHaveBeenCalledTimes(1);
  expect(workbox.addEventListener).not.toHaveBeenCalled();
  expect(workbox.messageSkipWaiting).not.toHaveBeenCalled();
});

test("registration failure is announced without throwing", async () => {
  renderControls();
  appendManifest();
  const config = {
    appName: "vue-screenfull",
    enabled: true,
    scope: "/vue-screenfull/",
    url: "/vue-screenfull/service-worker.js",
  };
  const windowRef = {
    isSecureContext: true,
    location: new URL("https://chengchuu.github.io/vue-screenfull/"),
    matchMedia: jest.fn().mockReturnValue({ matches: false }),
    sessionStorage,
  };
  const navigatorRef = { serviceWorker: { controller: {} } };
  const workbox = new WorkboxFake();
  workbox.register.mockRejectedValueOnce(new Error("registration failed"));
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  await expect(
    registerServiceWorker(
      config,
      document,
      windowRef,
      navigatorRef,
      () => workbox,
    ),
  ).resolves.toBeNull();
  expect(document.querySelector("[data-pwa-status]").textContent).toBe(
    "Offline support could not be started.",
  );
  expect(consoleError).toHaveBeenCalledTimes(1);
  consoleError.mockRestore();
});
