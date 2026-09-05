import {
  listenMediaQueryChanges,
  resolveThemePreference,
  setThemePreference,
} from "mazey";
import type { ResolvedTheme, ThemePreference } from "mazey";

export interface SiteThemeConfig {
  storageKey: string;
}

const systemThemeQuery = "(prefers-color-scheme: dark)";

export function initializeThemeControls({
  storageKey,
}: SiteThemeConfig): () => void {
  const root = document.documentElement;
  if (root.dataset.themeControlsReady === "true") return () => undefined;

  let media: MediaQueryList | null = null;
  try {
    media = window.matchMedia(systemThemeQuery);
  } catch {
    // Mazey provides its documented light fallback without system detection.
  }

  const resolvedForSession = (preference: ThemePreference): ResolvedTheme =>
    preference === "system" ? (media?.matches ? "dark" : "light") : preference;

  let selectedPreference: ThemePreference = "system";
  let resolvedTheme: ResolvedTheme = "light";
  let sessionOnlySelection = false;

  const apply = (preference: ThemePreference, resolved: ResolvedTheme) => {
    selectedPreference = preference;
    resolvedTheme = resolved;
    root.dataset.bsTheme = resolved;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][data-theme-color]',
    );
    if (themeColor) {
      themeColor.content =
        resolved === "dark"
          ? (themeColor.dataset.themeColorDark ?? themeColor.content)
          : (themeColor.dataset.themeColorLight ?? themeColor.content);
    }

    try {
      window.localStorage.setItem(
        "tsd-theme",
        preference === "system" ? "os" : preference,
      );
    } catch {
      // TypeDoc synchronization is optional when storage is unavailable.
    }

    document
      .querySelectorAll<HTMLSelectElement>("[data-theme-select]")
      .forEach((control) => {
        if (control.value !== preference) control.value = preference;
      });
  };

  const initial = resolveThemePreference(storageKey);
  apply(initial.label === "System" ? "system" : initial.value, initial.value);

  const handleChange = (event: Event) => {
    const control = event.target;
    if (!(control instanceof HTMLSelectElement)) return;
    if (!control.matches("[data-theme-select]")) return;

    const preference = control.value as ThemePreference;
    let persisted: boolean;
    try {
      persisted = setThemePreference(storageKey, preference);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      apply(selectedPreference, resolvedTheme);
      return;
    }

    const current = resolveThemePreference(storageKey);
    if (persisted) {
      sessionOnlySelection = false;
      apply(
        current.label === "System" ? "system" : current.value,
        current.value,
      );
      return;
    }

    sessionOnlySelection = true;
    apply(preference, resolvedForSession(preference));
  };

  const handleSystemTheme = () => {
    if (selectedPreference !== "system") return;
    const current = resolveThemePreference(storageKey);
    apply(
      "system",
      sessionOnlySelection ? resolvedForSession("system") : current.value,
    );
  };

  const handleDomReady = () => apply(selectedPreference, resolvedTheme);

  root.dataset.themeControlsReady = "true";
  document.addEventListener("change", handleChange);
  document.addEventListener("DOMContentLoaded", handleDomReady, { once: true });
  const removeMediaListener = listenMediaQueryChanges(media, handleSystemTheme);

  return () => {
    document.removeEventListener("change", handleChange);
    document.removeEventListener("DOMContentLoaded", handleDomReady);
    removeMediaListener();
    delete root.dataset.themeControlsReady;
  };
}

export function initializeNavigation(): () => void {
  const root = document.documentElement;
  if (root.dataset.navEnhanced === "true") return () => undefined;

  const closeNavigation = (restoreFocus: boolean) => {
    const toggle = document.querySelector<HTMLButtonElement>(
      '[data-nav-toggle][aria-expanded="true"]',
    );
    if (!toggle) return;
    const navigation = document.getElementById(
      toggle.getAttribute("aria-controls") ?? "",
    );
    toggle.setAttribute("aria-expanded", "false");
    if (navigation) navigation.dataset.open = "false";
    if (restoreFocus) toggle.focus();
  };

  const handleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest<HTMLButtonElement>("[data-nav-toggle]");
    if (toggle) {
      const navigation = document.getElementById(
        toggle.getAttribute("aria-controls") ?? "",
      );
      if (!navigation) return;
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      navigation.dataset.open = String(!expanded);
      return;
    }
    if (target.closest("[data-mobile-nav] a")) closeNavigation(false);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeNavigation(true);
  };

  root.dataset.navEnhanced = "true";
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);

  return () => {
    document.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleKeydown);
    delete root.dataset.navEnhanced;
  };
}
