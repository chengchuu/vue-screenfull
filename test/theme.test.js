/** @jest-environment jsdom */

const { readFileSync } = require("node:fs");
const path = require("node:path");
const {
  initializeNavigation,
  initializeThemeControls,
} = require("../site/theme.ts");
const { THEME_COLOR, THEME_CONFIG } = require("../scripts/site-config");

function mediaQuery(initialMatches = false) {
  const listeners = [];
  const media = {
    matches: initialMatches,
    addEventListener: jest.fn((_name, listener) => listeners.push(listener)),
    removeEventListener: jest.fn((_name, listener) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }),
    change(matches) {
      media.matches = matches;
      for (const listener of listeners) listener({ matches });
    },
  };
  return media;
}

function installMatchMedia(media) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => media),
  });
}

function themeButtonMarkup() {
  return `<button class="theme-toggle" type="button" data-theme-toggle
    aria-label="Current theme: Light. Switch to dark theme.">
    <svg data-theme-icon="light" aria-hidden="true" focusable="false"></svg>
    <svg data-theme-icon="dark" aria-hidden="true" focusable="false" hidden></svg>
  </button>`;
}

function renderThemeControls({ buttons = 1, typeDoc = false } = {}) {
  document.documentElement.removeAttribute("data-theme-controls-ready");
  document.head.innerHTML = `
    <meta name="theme-color" content="${THEME_COLOR}" data-theme-color
      data-theme-color-light="${THEME_CONFIG.colorLight}"
      data-theme-color-dark="${THEME_CONFIG.colorDark}">
  `;
  document.body.innerHTML = `${themeButtonMarkup().repeat(buttons)}
    ${
      typeDoc
        ? `<select id="tsd-theme">
            <option value="os">OS</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>`
        : ""
    }`;
}

function expectRenderedTheme(theme) {
  const current = theme === "light" ? "Light" : "Dark";
  const next = theme === "light" ? "dark" : "light";

  expect(document.documentElement.dataset.bsTheme).toBe(theme);
  expect(document.documentElement.dataset.theme).toBe(theme);
  expect(document.documentElement.style.colorScheme).toBe(theme);
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    expect(button.getAttribute("aria-label")).toBe(
      `Current theme: ${current}. Switch to ${next} theme.`,
    );
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    expect(
      button.querySelector('[data-theme-icon="light"]').hasAttribute("hidden"),
    ).toBe(theme !== "light");
    expect(
      button.querySelector('[data-theme-icon="dark"]').hasAttribute("hidden"),
    ).toBe(theme !== "dark");
  }
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    theme === "light" ? THEME_CONFIG.colorLight : THEME_CONFIG.colorDark,
  );
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
  document.documentElement.style.removeProperty("color-scheme");
});

test("templates use official inline Bootstrap theme icons", () => {
  const iconPaths = ["sun-fill.svg", "moon-stars-fill.svg"].flatMap((name) =>
    [
      ...readFileSync(
        path.join("node_modules", "bootstrap-icons", "icons", name),
        "utf8",
      ).matchAll(/d="([^"]+)"/g),
    ].map((match) => match[1]),
  );

  for (const [file, buttonCount] of [
    ["site/index.html", 2],
    ["examples/index.html", 1],
  ]) {
    const html = readFileSync(file, "utf8");
    const buttons = [
      ...html.matchAll(
        /<button\b[^>]*data-theme-toggle[^>]*>[\s\S]*?<\/button>/g,
      ),
    ];
    expect(buttons).toHaveLength(buttonCount);
    expect(html).not.toContain("data-theme-select");
    for (const [button] of buttons) {
      expect(button).toContain('type="button"');
      expect(button).toContain(
        'aria-label="Current theme: Light. Switch to dark theme."',
      );
      expect(button).not.toContain("aria-pressed");
      const icons = [
        ...button.matchAll(
          /<svg\b[^>]*data-theme-icon="(?:light|dark)"[^>]*>/g,
        ),
      ];
      expect(icons).toHaveLength(2);
      expect(icons[0][0]).not.toContain(" hidden");
      expect(icons[1][0]).toContain(" hidden");
      for (const [icon] of icons) {
        expect(icon).toContain('width="16"');
        expect(icon).toContain('height="16"');
        expect(icon).toContain('aria-hidden="true"');
        expect(icon).toContain('focusable="false"');
      }
      for (const iconPath of iconPaths) expect(button).toContain(iconPath);
    }
  }
});

test("theme toggles use exact circular dimensions", () => {
  const css = readFileSync("site/theme.css", "utf8");
  const mainButton = css.match(/\.theme-toggle\s*\{([^}]*)\}/)?.[1];
  const apiButton = css.match(
    /\.vue-screenfull-project-links \.theme-toggle\s*\{([^}]*)\}/,
  )?.[1];
  const icon = css.match(/\.theme-toggle svg\s*\{([^}]*)\}/)?.[1];

  expect(mainButton).toMatch(/(?:^|\s)width: 32px;/);
  expect(mainButton).toMatch(/(?:^|\s)min-width: 32px;/);
  expect(mainButton).toMatch(/(?:^|\s)height: 32px;/);
  expect(mainButton).toMatch(/(?:^|\s)min-height: 32px;/);
  expect(mainButton).toMatch(/(?:^|\s)padding: 7px;/);
  expect(mainButton).toContain("box-sizing: border-box");
  expect(mainButton).toContain("border-radius: 50%");
  expect(apiButton).toMatch(/(?:^|\s)width: 28px;/);
  expect(apiButton).toMatch(/(?:^|\s)min-width: 28px;/);
  expect(apiButton).toMatch(/(?:^|\s)height: 28px;/);
  expect(apiButton).toMatch(/(?:^|\s)min-height: 28px;/);
  expect(icon).toMatch(/(?:^|\s)width: 16px;/);
  expect(icon).toMatch(/(?:^|\s)height: 16px;/);
});

test("URL preference overrides storage and synchronizes every theme side effect", () => {
  renderThemeControls({ typeDoc: true });
  history.replaceState({}, "", "/?theme=dark");
  localStorage.setItem(THEME_CONFIG.storageKey, "light");
  installMatchMedia(mediaQuery(false));

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme("dark");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe("dark");
  expect(localStorage.getItem("tsd-theme")).toBe("dark");
  expect(document.querySelector("#tsd-theme").value).toBe("dark");
  cleanup();
});

test("controls parsed after the head script receive the resolved theme", () => {
  document.head.innerHTML = `<meta name="theme-color" content="${THEME_COLOR}"
    data-theme-color data-theme-color-light="${THEME_CONFIG.colorLight}"
    data-theme-color-dark="${THEME_CONFIG.colorDark}">`;
  localStorage.setItem(THEME_CONFIG.storageKey, "dark");
  installMatchMedia(mediaQuery(false));
  const cleanup = initializeThemeControls(THEME_CONFIG);
  document.body.innerHTML = themeButtonMarkup();
  document.dispatchEvent(new Event("DOMContentLoaded"));

  expectRenderedTheme("dark");
  cleanup();
});

test.each([
  ["light", true],
  ["dark", false],
])("saved %s preference ignores system changes", (preference, matches) => {
  renderThemeControls();
  localStorage.setItem(THEME_CONFIG.storageKey, preference);
  const media = mediaQuery(matches);
  installMatchMedia(media);

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme(preference);
  media.change(!matches);
  expectRenderedTheme(preference);
  cleanup();
});

test("system preference follows both media directions and keeps TypeDoc on OS", () => {
  renderThemeControls({ typeDoc: true });
  localStorage.setItem(THEME_CONFIG.storageKey, "system");
  const media = mediaQuery(false);
  installMatchMedia(media);

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme("light");
  expect(document.querySelector("#tsd-theme").value).toBe("os");
  media.change(true);
  expectRenderedTheme("dark");
  expect(document.querySelector("#tsd-theme").value).toBe("os");
  media.change(false);
  expectRenderedTheme("light");
  cleanup();
});

test.each([
  [false, "dark"],
  [true, "light"],
])("first system-theme click persists %s", (matches, expected) => {
  renderThemeControls();
  const media = mediaQuery(matches);
  installMatchMedia(media);

  const cleanup = initializeThemeControls(THEME_CONFIG);
  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme(expected);
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe(expected);
  media.change(!matches);
  expectRenderedTheme(expected);
  cleanup();
});

test("multiple controls remain synchronized through repeated toggles", () => {
  renderThemeControls({ buttons: 2 });
  installMatchMedia(mediaQuery(false));
  const setItem = jest.spyOn(Storage.prototype, "setItem");
  const cleanup = initializeThemeControls(THEME_CONFIG);
  const buttons = document.querySelectorAll("[data-theme-toggle]");

  buttons[0].click();
  expectRenderedTheme("dark");
  buttons[1].click();
  expectRenderedTheme("light");
  expect(
    setItem.mock.calls
      .filter(([key]) => key === THEME_CONFIG.storageKey)
      .map(([, value]) => value),
  ).toEqual(["dark", "light"]);
  cleanup();
});

test.each([
  ["corrupted", true, "dark"],
  [null, false, "light"],
])("stored value %s falls through to system", (stored, matches, expected) => {
  renderThemeControls();
  if (stored !== null) localStorage.setItem(THEME_CONFIG.storageKey, stored);
  installMatchMedia(mediaQuery(matches));

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme(expected);
  expect(localStorage.getItem("tsd-theme")).toBe("os");
  cleanup();
});

test("unavailable media queries use Mazey's light fallback", () => {
  renderThemeControls();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => {
      throw new Error("Media query unavailable");
    },
  });

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme("light");
  expect(localStorage.getItem("tsd-theme")).toBe("light");
  cleanup();
});

test("failed persistence retains the explicit session theme", () => {
  renderThemeControls();
  const media = mediaQuery(true);
  installMatchMedia(media);
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expectRenderedTheme("dark");
  expect(() =>
    document.querySelector("[data-theme-toggle]").click(),
  ).not.toThrow();
  expectRenderedTheme("light");
  media.change(false);
  expectRenderedTheme("light");
  cleanup();
});

test("TypeDoc Settings and buttons synchronize without recursive changes", () => {
  renderThemeControls({ typeDoc: true });
  const media = mediaQuery(true);
  installMatchMedia(media);
  const control = document.querySelector("#tsd-theme");
  const nativeChanges = jest.fn(() => {
    document.documentElement.dataset.theme = control.value;
    localStorage.setItem("tsd-theme", control.value);
  });
  control.addEventListener("change", nativeChanges);

  const cleanup = initializeThemeControls(THEME_CONFIG);
  expect(control.value).toBe("os");
  expectRenderedTheme("dark");

  control.value = "light";
  control.dispatchEvent(new Event("change", { bubbles: true }));
  expectRenderedTheme("light");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe("light");
  expect(nativeChanges).toHaveBeenCalledTimes(1);

  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("dark");
  expect(control.value).toBe("dark");
  expect(nativeChanges).toHaveBeenCalledTimes(1);

  control.value = "os";
  control.dispatchEvent(new Event("change", { bubbles: true }));
  expectRenderedTheme("dark");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBe("system");
  expect(localStorage.getItem("tsd-theme")).toBe("os");
  expect(nativeChanges).toHaveBeenCalledTimes(2);
  media.change(false);
  expectRenderedTheme("light");
  cleanup();
});

test("unsupported TypeDoc values restore the last valid state", () => {
  renderThemeControls({ typeDoc: true });
  installMatchMedia(mediaQuery(false));
  const control = document.querySelector("#tsd-theme");
  control.addEventListener("change", () => {
    document.documentElement.dataset.theme = control.value;
    localStorage.setItem("tsd-theme", control.value);
  });
  const cleanup = initializeThemeControls(THEME_CONFIG);
  control.append(new Option("Unsupported", "unsupported"));
  control.value = "unsupported";
  control.dispatchEvent(new Event("change", { bubbles: true }));

  expectRenderedTheme("light");
  expect(control.value).toBe("os");
  expect(localStorage.getItem("tsd-theme")).toBe("os");
  expect(localStorage.getItem(THEME_CONFIG.storageKey)).toBeNull();
  cleanup();
});

test("theme initialization and cleanup are idempotent", () => {
  renderThemeControls();
  const media = mediaQuery(false);
  installMatchMedia(media);

  const cleanup = initializeThemeControls(THEME_CONFIG);
  const duplicateCleanup = initializeThemeControls(THEME_CONFIG);
  expect(media.addEventListener).toHaveBeenCalledTimes(1);
  duplicateCleanup();
  cleanup();
  cleanup();
  expect(media.removeEventListener).toHaveBeenCalledTimes(1);
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
