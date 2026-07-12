/** @jest-environment jsdom */

test("theme selection persists and mobile navigation restores focus", () => {
  document.body.innerHTML = `
    <button type="button" aria-expanded="false" aria-controls="test-navigation" data-nav-toggle>Menu</button>
    <nav id="test-navigation" data-mobile-nav>
      <a href="#target">Target</a>
      <select data-theme-select aria-label="Theme">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </nav>
  `;
  const mediaListeners = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: true,
      addEventListener: (...args) => mediaListeners.push(args[1]),
    }),
  });
  localStorage.clear();
  localStorage.setItem("vue-screenfull-theme", "system");
  jest.resetModules();
  require("../site/theme.js");

  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.getElementById("test-navigation");
  const select = document.querySelector("[data-theme-select]");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(select.value).toBe("system");

  select.value = "light";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("vue-screenfull-theme")).toBe("light");
  expect(localStorage.getItem("tsd-theme")).toBe("light");

  toggle.click();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(navigation.dataset.open).toBe("true");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(navigation.dataset.open).toBe("false");
  expect(document.activeElement).toBe(toggle);
  expect(mediaListeners).toHaveLength(1);
});
