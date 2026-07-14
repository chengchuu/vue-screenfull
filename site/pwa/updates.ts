import { Workbox } from "workbox-window";

export interface ServiceWorkerConfig {
  appName: string;
  enabled: boolean;
  scope: string;
  url: string;
}

interface WorkboxLike {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  messageSkipWaiting(): void;
  register(): Promise<ServiceWorkerRegistration | undefined>;
}

type WorkboxFactory = (url: string, options: { scope: string }) => WorkboxLike;

const RELOAD_KEY = "vue-screenfull-pwa-update-reload";

function announce(documentRef: Document, message: string): void {
  documentRef
    .querySelectorAll<HTMLElement>("[data-pwa-status]")
    .forEach((region) => (region.textContent = message));
}

export function shouldRegisterServiceWorker(
  config: ServiceWorkerConfig,
  locationRef: Location,
  navigatorRef: Navigator,
): boolean {
  const local = new Set(["localhost", "127.0.0.1", "[::1]"]).has(
    locationRef.hostname,
  );
  return (
    config.enabled &&
    "serviceWorker" in navigatorRef &&
    (locationRef.protocol === "https:" || local) &&
    locationRef.pathname.startsWith(config.scope)
  );
}

export function monitorWorkboxUpdates(
  workbox: WorkboxLike,
  documentRef: Document,
  windowRef: Window,
  navigatorRef: Navigator,
  appName: string,
): () => void {
  const notice = documentRef.querySelector<HTMLElement>("[data-pwa-update]");
  const button = documentRef.querySelector<HTMLButtonElement>(
    "[data-pwa-update-now]",
  );
  let updateAvailable = false;
  let activationApproved = false;
  let reloadHandled = false;

  try {
    if (windowRef.sessionStorage.getItem(RELOAD_KEY) === "complete")
      windowRef.sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }

  const handleWaiting = (event: Event) => {
    if (!navigatorRef.serviceWorker.controller) return;
    updateAvailable = true;
    if (notice) notice.hidden = false;
    if (button) button.disabled = false;
    const wasWaiting = Boolean(
      (event as Event & { wasWaitingBeforeRegister?: boolean })
        .wasWaitingBeforeRegister,
    );
    announce(
      documentRef,
      `A new version of the ${appName} website is ${wasWaiting ? "ready" : "available"}.`,
    );
  };
  const handleUpdate = () => {
    if (!updateAvailable || activationApproved) return;
    activationApproved = true;
    if (button) button.disabled = true;
    announce(
      documentRef,
      "Activating the website update. This page will reload once.",
    );
    try {
      windowRef.sessionStorage.setItem(RELOAD_KEY, "pending");
    } catch {
      // The in-memory approval flag still prevents an unsolicited reload.
    }
    workbox.messageSkipWaiting();
  };
  const handleControlling = (event: Event) => {
    if (notice) notice.hidden = true;
    if (!activationApproved || reloadHandled) {
      const lifecycleEvent = event as Event & { isUpdate?: boolean };
      if (!updateAvailable && lifecycleEvent.isUpdate !== true) return;
      announce(
        documentRef,
        "The website updated in another tab. Refresh when it is convenient.",
      );
      return;
    }
    reloadHandled = true;
    try {
      windowRef.sessionStorage.setItem(RELOAD_KEY, "complete");
    } catch {
      // The in-memory reload guard still prevents duplicate reloads.
    }
    windowRef.location.reload();
  };

  workbox.addEventListener("waiting", handleWaiting);
  workbox.addEventListener("controlling", handleControlling);
  button?.addEventListener("click", handleUpdate);

  return () => {
    workbox.removeEventListener("waiting", handleWaiting);
    workbox.removeEventListener("controlling", handleControlling);
    button?.removeEventListener("click", handleUpdate);
  };
}

export async function registerServiceWorker(
  config: ServiceWorkerConfig,
  documentRef: Document,
  windowRef: Window,
  navigatorRef: Navigator,
  createWorkbox: WorkboxFactory = (url, options) =>
    new Workbox(url, options) as WorkboxLike,
): Promise<ServiceWorkerRegistration | null> {
  if (!shouldRegisterServiceWorker(config, windowRef.location, navigatorRef))
    return null;
  const workbox = createWorkbox(config.url, { scope: config.scope });
  monitorWorkboxUpdates(
    workbox,
    documentRef,
    windowRef,
    navigatorRef,
    config.appName,
  );
  try {
    return (await workbox.register()) ?? null;
  } catch (error) {
    console.error(
      `Failed to register the ${config.appName} service worker.`,
      error,
    );
    announce(documentRef, "Offline support could not be started.");
    return null;
  }
}
