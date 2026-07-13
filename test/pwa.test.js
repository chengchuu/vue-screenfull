/** @jest-environment jsdom */

const {
  initializeInstallExperience,
  isStandaloneMode,
} = require("../site/pwa/install");
const {
  monitorWorkboxUpdates,
  registerServiceWorker,
  shouldRegisterServiceWorker,
} = require("../site/pwa/updates");

function installMatchMedia(matches = false) {
  const media = new EventTarget();
  Object.assign(media, { matches, media: "(display-mode: standalone)" });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => media),
  });
}

function renderControls() {
  document.body.innerHTML = `
    <section data-pwa-install-help>
      <span data-pwa-install-container hidden>
        <button data-pwa-install hidden disabled>Install app</button>
      </span>
    </section>
    <aside data-pwa-update hidden><button data-pwa-update-now>Update now</button></aside>
    <p data-pwa-status></p>
  `;
}

class WorkboxFake extends EventTarget {
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

test("standalone detection supports display mode and iOS standalone", () => {
  installMatchMedia(true);
  expect(isStandaloneMode(window, navigator)).toBe(true);
  installMatchMedia(false);
  expect(isStandaloneMode(window, { ...navigator, standalone: true })).toBe(
    true,
  );
});

test("registration is restricted to secure project-scope pages", async () => {
  const config = {
    appName: "vue-screenfull",
    enabled: true,
    scope: "/vue-screenfull/",
    url: "/vue-screenfull/service-worker.js",
  };
  const serviceWorker = { controller: {} };
  const navigatorRef = { serviceWorker };
  const locationRef = {
    hostname: "chengchuu.github.io",
    pathname: "/vue-screenfull/playground/",
    protocol: "https:",
  };
  expect(shouldRegisterServiceWorker(config, locationRef, navigatorRef)).toBe(
    true,
  );
  expect(
    shouldRegisterServiceWorker(
      config,
      { ...locationRef, pathname: "/another-project/" },
      navigatorRef,
    ),
  ).toBe(false);

  renderControls();
  const workbox = new WorkboxFake();
  const windowRef = { location: locationRef, sessionStorage };
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
});

test("waiting updates reload once and only after explicit approval", () => {
  renderControls();
  const workbox = new WorkboxFake();
  const reload = jest.fn();
  const windowRef = { location: { reload }, sessionStorage };
  const navigatorRef = { serviceWorker: { controller: {} } };
  const cleanup = monitorWorkboxUpdates(
    workbox,
    document,
    windowRef,
    navigatorRef,
    "vue-screenfull",
  );

  const waiting = new Event("waiting");
  waiting.wasWaitingBeforeRegister = true;
  workbox.dispatchEvent(waiting);
  expect(document.querySelector("[data-pwa-update]").hidden).toBe(false);
  workbox.dispatchEvent(new Event("controlling"));
  expect(reload).not.toHaveBeenCalled();

  document.querySelector("[data-pwa-update-now]").click();
  expect(workbox.messageSkipWaiting).toHaveBeenCalledTimes(1);
  expect(document.querySelector("[data-pwa-update-now]").disabled).toBe(true);
  workbox.dispatchEvent(new Event("controlling"));
  workbox.dispatchEvent(new Event("controlling"));
  expect(reload).toHaveBeenCalledTimes(1);
  cleanup();
});

test("a first install without an existing controller is not shown as an update", () => {
  renderControls();
  const workbox = new WorkboxFake();
  const cleanup = monitorWorkboxUpdates(
    workbox,
    document,
    { location: { reload: jest.fn() }, sessionStorage },
    { serviceWorker: { controller: null } },
    "vue-screenfull",
  );
  workbox.dispatchEvent(new Event("waiting"));
  expect(document.querySelector("[data-pwa-update]").hidden).toBe(true);
  workbox.dispatchEvent(new Event("controlling"));
  expect(document.querySelector("[data-pwa-status]").textContent).toBe("");
  cleanup();
});

test("an externally controlled update is announced without reloading", () => {
  renderControls();
  const workbox = new WorkboxFake();
  const reload = jest.fn();
  const cleanup = monitorWorkboxUpdates(
    workbox,
    document,
    { location: { reload }, sessionStorage },
    { serviceWorker: { controller: {} } },
    "vue-screenfull",
  );
  const controlling = new Event("controlling");
  controlling.isUpdate = true;
  controlling.isExternal = true;
  workbox.dispatchEvent(controlling);
  expect(reload).not.toHaveBeenCalled();
  expect(document.querySelector("[data-pwa-status]").textContent).toContain(
    "another tab",
  );
  cleanup();
});
