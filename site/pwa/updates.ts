import { isSafePWAEnv } from "mazey";
import { Workbox } from "workbox-window";
import { announcePwaStatus } from "./status";

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

export function shouldRegisterServiceWorker(
  config: ServiceWorkerConfig,
  documentRef: Document,
  windowRef: Window,
  navigatorRef: Navigator,
): boolean {
  return (
    config.enabled &&
    isSafePWAEnv({
      scope: config.scope,
      environment: {
        window: windowRef,
        navigator: navigatorRef,
        document: documentRef,
      },
    })
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
    announcePwaStatus(
      documentRef,
      `A new version of the ${appName} website is ${wasWaiting ? "ready" : "available"}.`,
    );
  };
  const handleUpdate = () => {
    if (!updateAvailable || activationApproved) return;
    activationApproved = true;
    if (button) button.disabled = true;
    announcePwaStatus(
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
      announcePwaStatus(
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
  if (
    !shouldRegisterServiceWorker(config, documentRef, windowRef, navigatorRef)
  )
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
    announcePwaStatus(documentRef, "Offline support could not be started.");
    return null;
  }
}
