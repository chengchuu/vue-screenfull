(() => {
  const key = "vue-screenfull-theme";
  const allowed = new Set(["system", "light", "dark"]);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;

  function preference() {
    try {
      const value = localStorage.getItem(key) || "system";
      return allowed.has(value) ? value : "system";
    } catch {
      return "system";
    }
  }

  function apply(value, persist) {
    const selected = allowed.has(value) ? value : "system";
    const resolved =
      selected === "system" ? (media.matches ? "dark" : "light") : selected;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    try {
      if (persist) localStorage.setItem(key, selected);
      localStorage.setItem(
        "tsd-theme",
        selected === "system" ? "os" : selected,
      );
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    document.querySelectorAll("[data-theme-select]").forEach((control) => {
      if (control.value !== selected) control.value = selected;
    });
  }

  root.dataset.navEnhanced = "true";
  apply(preference(), false);

  document.addEventListener("change", (event) => {
    if (event.target.matches?.("[data-theme-select]"))
      apply(event.target.value, true);
  });

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-nav-toggle]");
    if (toggle) {
      const navigation = document.getElementById(
        toggle.getAttribute("aria-controls"),
      );
      if (!navigation) return;
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      navigation.dataset.open = String(!expanded);
      return;
    }
    const link = event.target.closest?.("[data-mobile-nav] a");
    if (link) closeNavigation(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation(true);
  });

  function closeNavigation(restoreFocus) {
    const toggle = document.querySelector(
      '[data-nav-toggle][aria-expanded="true"]',
    );
    if (!toggle) return;
    const navigation = document.getElementById(
      toggle.getAttribute("aria-controls"),
    );
    toggle.setAttribute("aria-expanded", "false");
    if (navigation) navigation.dataset.open = "false";
    if (restoreFocus) toggle.focus();
  }

  media.addEventListener?.("change", () => {
    if (preference() === "system") apply("system", false);
  });
})();
