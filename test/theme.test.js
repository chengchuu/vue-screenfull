/** @jest-environment jsdom */

const {
  initializeNavigation,
  initializeThemeControls,
} = require("../site/theme.ts");
const { THEME_COLOR, THEME_CONFIG } = require("../scripts/site-config");

function renderThemeControl() {
  document.documentElement.removeAttribute("data-theme-controls-ready");
  document.head.innerHTML = `
    <meta name="theme-color" content="${THEME_COLOR}" data-theme-color
      data-theme-color-light="${THEME_CONFIG.colorLight}"
      data-theme-color-dark="${THEME_CONFIG.colorDark}">
  `;
  document.body.innerHTML = `
    <select data-theme-select aria-label="Theme">
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  `;
}

function mockMedia(matches = false) {
  const listeners = [];
  const media = {
    matches,
    addEventListener: jest.fn((_name, listener) => listeners.push(listener)),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => media,
  });
  return { listeners, media };
}

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  history.replaceState({}, "", "/");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-bs-theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-controls-ready");
  document.documentElement.removeAttribute("data-nav-enhanced");
});

test("initial theme follows Mazey URL precedence and synchronizes page state", () => {
  renderThemeControl();
  history.replaceState({}, "", "/?theme=dark");
  localStorage.setItem(THEME_CONFIG.storageKey, "light");
  mockMedia(false);

  const cleanup = initializeThemeControls(THEME_CONFIG);

  expect(document.documentElement.dataset.bsTheme).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");
  expect(document.querySelector("[data-theme-select]").value).toBe("dark");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe("dark");
  expect(localStorage.getItem("tsd-theme")).toBe("dark");
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    THEME_CONFIG.colorDark,
  );
  cleanup();
});

test("controls parsed after the head script receive the initial preference", () => {
  document.documentElement.removeAttribute("data-theme-controls-ready");
  document.head.innerHTML = `
    <meta name="theme-color" content="${THEME_COLOR}" data-theme-color
      data-theme-color-light="${THEME_CONFIG.colorLight}"
      data-theme-color-dark="${THEME_CONFIG.colorDark}">
  `;
  localStorage.setItem(THEME_CONFIG.storageKey, "dark");
  mockMedia(false);
  const cleanup = initializeThemeControls(THEME_CONFIG);
  document.body.innerHTML = `
    <select data-theme-select>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  `;

  document.dispatchEvent(new Event("DOMContentLoaded"));

  expect(document.querySelector("[data-theme-select]").value).toBe("dark");
  cleanup();
});

test("system preference follows color-scheme changes until explicitly changed", () => {
  renderThemeControl();
  const { listeners, media } = mockMedia(false);
  const cleanup = initializeThemeControls(THEME_CONFIG);
  const select = document.querySelector("[data-theme-select]");

  expect(document.documentElement.dataset.bsTheme).toBe("light");
  expect(select.value).toBe("system");
  media.matches = true;
  listeners[0]();
  expect(document.documentElement.dataset.bsTheme).toBe("dark");
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    THEME_CONFIG.colorDark,
  );

  select.value = "light";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.documentElement.dataset.bsTheme).toBe("light");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe("light");
  expect(localStorage.getItem("tsd-theme")).toBe("light");
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    THEME_CONFIG.colorLight,
  );

  media.matches = false;
  listeners[0]();
  expect(document.documentElement.dataset.bsTheme).toBe("light");
  cleanup();
  expect(media.removeEventListener).toHaveBeenCalledTimes(1);
});

test("storage rejection still permits a session-only theme selection", () => {
  renderThemeControl();
  mockMedia(true);
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });

  let cleanup;
  expect(() => {
    cleanup = initializeThemeControls(THEME_CONFIG);
  }).not.toThrow();
  const select = document.querySelector("[data-theme-select]");
  select.value = "light";
  expect(() =>
    select.dispatchEvent(new Event("change", { bubbles: true })),
  ).not.toThrow();
  expect(document.documentElement.dataset.bsTheme).toBe("light");
  expect(select.value).toBe("light");
  cleanup();
});

test("session-only system selection ignores an older stored preference", () => {
  renderThemeControl();
  localStorage.setItem(THEME_CONFIG.storageKey, "dark");
  const { listeners, media } = mockMedia(false);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });
  const cleanup = initializeThemeControls(THEME_CONFIG);
  const select = document.querySelector("[data-theme-select]");

  select.value = "system";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.documentElement.dataset.bsTheme).toBe("light");

  media.matches = true;
  listeners[0]();
  expect(document.documentElement.dataset.bsTheme).toBe("dark");
  media.matches = false;
  listeners[0]();
  expect(document.documentElement.dataset.bsTheme).toBe("light");
  cleanup();
});

test("unsupported control values restore the active preference", () => {
  renderThemeControl();
  mockMedia(false);
  const cleanup = initializeThemeControls(THEME_CONFIG);
  const select = document.querySelector("[data-theme-select]");
  select.insertAdjacentHTML(
    "beforeend",
    '<option value="unsupported">Unsupported</option>',
  );
  select.value = "unsupported";

  expect(() =>
    select.dispatchEvent(new Event("change", { bubbles: true })),
  ).not.toThrow();
  expect(document.documentElement.dataset.bsTheme).toBe("light");
  expect(select.value).toBe("system");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBeNull();
  cleanup();
});

test("mobile navigation closes on Escape and restores focus", () => {
  document.body.innerHTML = `
    <button type="button" aria-expanded="false" aria-controls="navigation" data-nav-toggle>Menu</button>
    <nav id="navigation" data-mobile-nav><a href="#target">Target</a></nav>
  `;
  const cleanup = initializeNavigation();
  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.getElementById("navigation");

  toggle.click();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(navigation.dataset.open).toBe("true");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(navigation.dataset.open).toBe("false");
  expect(document.activeElement).toBe(toggle);
  cleanup();
});
