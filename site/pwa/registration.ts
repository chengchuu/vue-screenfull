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
  register(): Promise<ServiceWorkerRegistration | undefined>;
}

type WorkboxFactory = (url: string, options: { scope: string }) => WorkboxLike;

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
