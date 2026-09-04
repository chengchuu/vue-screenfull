import { initializeNavigation, initializeThemeControls } from "./theme";

declare const __SITE_THEME_CONFIG__: {
  storageKey: string;
};

initializeThemeControls(__SITE_THEME_CONFIG__);
initializeNavigation();
