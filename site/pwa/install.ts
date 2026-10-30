import { isStandalonePWA, listenMediaQueryChanges } from "mazey";
import { announcePwaStatus } from "./status";

interface InstallChoice {
  outcome: "accepted" | "dismissed";
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function initializeInstallExperience(
  documentRef: Document,
  windowRef: Window,
  navigatorRef: NavigatorWithStandalone,
  appName: string,
): () => void {
  const buttons = Array.from(
    documentRef.querySelectorAll<HTMLButtonElement>("[data-pwa-install]"),
  );
  const help = Array.from(
    documentRef.querySelectorAll<HTMLElement>("[data-pwa-install-help]"),
  );
  const displayMode = windowRef.matchMedia("(display-mode: standalone)");
  const standaloneOptions = {
    environment: {
      window: windowRef,
      navigator: navigatorRef,
      document: documentRef,
    },
  };
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const hideControls = () => {
    buttons.forEach((button) => {
      button.hidden = true;
      button.disabled = true;
      const container = button.closest<HTMLElement>(
        "[data-pwa-install-container]",
      );
      if (container) container.hidden = true;
    });
  };
  const showInstalledState = () => {
    deferredPrompt = null;
    hideControls();
    help.forEach((element) => (element.hidden = true));
  };
  const handlePromptAvailable = (event: Event) => {
    if (!buttons.length || isStandalonePWA(standaloneOptions)) return;
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    deferredPrompt = promptEvent;
    buttons.forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      const container = button.closest<HTMLElement>(
        "[data-pwa-install-container]",
      );
      if (container) container.hidden = false;
    });
  };
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    buttons.forEach((button) => (button.disabled = true));
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      announcePwaStatus(
        documentRef,
        choice.outcome === "accepted"
          ? "The app installation was accepted."
          : "Installation was dismissed. You can use the browser menu later.",
      );
    } catch {
      announcePwaStatus(
        documentRef,
        "The install prompt could not open. Use the browser menu instead.",
      );
    } finally {
      hideControls();
    }
  };
  const handleInstalled = () => {
    showInstalledState();
    announcePwaStatus(documentRef, `${appName} was installed.`);
  };
  const handleDisplayMode = () => {
    if (isStandalonePWA(standaloneOptions)) showInstalledState();
  };

  hideControls();
  if (isStandalonePWA(standaloneOptions)) showInstalledState();
  buttons.forEach((button) => button.addEventListener("click", handleInstall));
  windowRef.addEventListener("beforeinstallprompt", handlePromptAvailable);
  windowRef.addEventListener("appinstalled", handleInstalled);
  const removeDisplayModeListener = listenMediaQueryChanges(
    displayMode,
    handleDisplayMode,
  );

  return () => {
    buttons.forEach((button) =>
      button.removeEventListener("click", handleInstall),
    );
    windowRef.removeEventListener("beforeinstallprompt", handlePromptAvailable);
    windowRef.removeEventListener("appinstalled", handleInstalled);
    removeDisplayModeListener();
  };
}
