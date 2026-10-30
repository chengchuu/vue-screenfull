import { initializeInstallExperience } from "./pwa/install";
import {
  registerServiceWorker,
  shouldRegisterServiceWorker,
  type ServiceWorkerConfig,
} from "./pwa/updates";

declare const __SITE_PWA_CONFIG__: ServiceWorkerConfig;

interface WindowWithIdleCallback {
  requestIdleCallback?: (callback: () => void) => number;
}

export function initializeSitePwa(
  config: ServiceWorkerConfig,
  documentRef = document,
  windowRef = window,
  navigatorRef = navigator,
): void {
  if (documentRef.documentElement.dataset.pwaReady === "true") return;
  documentRef.documentElement.dataset.pwaReady = "true";
  initializeInstallExperience(
    documentRef,
    windowRef,
    navigatorRef,
    config.appName,
  );
  if (
    !shouldRegisterServiceWorker(config, documentRef, windowRef, navigatorRef)
  )
    return;

  const schedule = () => {
    const idleWindow = windowRef as unknown as WindowWithIdleCallback;
    const register = () =>
      void registerServiceWorker(config, documentRef, windowRef, navigatorRef);
    if (idleWindow.requestIdleCallback)
      idleWindow.requestIdleCallback(register);
    else windowRef.setTimeout(register, 0);
  };
  if (documentRef.readyState === "complete") schedule();
  else windowRef.addEventListener("load", schedule, { once: true });
}

if (
  typeof document !== "undefined" &&
  typeof window !== "undefined" &&
  typeof navigator !== "undefined"
) {
  initializeSitePwa(__SITE_PWA_CONFIG__);
}
