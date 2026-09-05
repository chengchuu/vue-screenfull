/** @jest-environment jsdom */
import { nextTick } from "vue";

jest.mock("../src", () => {
  const { ref } = jest.requireActual("vue");
  const screenfull = {
    isEnabled: ref(false),
    isFullscreen: ref(false),
    isFallback: ref(false),
    fullscreenElement: ref(null),
    status: ref("idle"),
    error: ref(null),
    clearError: jest.fn(),
    exit: jest.fn(async () => {
      screenfull.isFullscreen.value = false;
      screenfull.isFallback.value = false;
      screenfull.fullscreenElement.value = null;
      screenfull.status.value = "idle";
      return { ok: true, mode: "fallback", element: null, error: null };
    }),
    request: jest.fn(async (element) => {
      screenfull.isFullscreen.value = true;
      screenfull.isFallback.value = true;
      screenfull.fullscreenElement.value = element.value;
      screenfull.status.value = "fallback";
      return {
        ok: true,
        mode: "fallback",
        element: element.value,
        error: null,
      };
    }),
    toggle: jest.fn(),
  };

  return {
    __mockScreenfull: screenfull,
    detectFullscreenApi: jest.fn(() => null),
    useScreenfull: jest.fn(() => screenfull),
  };
});

const buttonByText = (text) =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );

const diagnosticValue = (label) => {
  const term = [...document.querySelectorAll("dt")].find(
    (candidate) => candidate.textContent === label,
  );
  return term.nextElementSibling.textContent;
};

test("video fullscreen targets the complete card containing both controls", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { __mockScreenfull: screenfull } = require("../src");
  require("../examples/index");

  const card = document.querySelector(".video-card");
  const video = card.querySelector("video");
  const view = buttonByText("View video fullscreen");
  const exit = buttonByText("Exit video fullscreen");

  expect(video).not.toBeNull();
  expect(card.tagName).toBe("ARTICLE");
  expect(card.querySelector(".badge").textContent).toBe("VIDEO");
  expect(card.querySelector("h2").textContent).toBe("Video target");
  expect(card.querySelector("p")).not.toBeNull();
  expect(card.contains(view)).toBe(true);
  expect(card.contains(exit)).toBe(true);
  expect(view.classList).toContain("video-card__enter");
  expect(exit.classList).toContain("video-card__exit");

  view.click();
  await nextTick();
  await nextTick();

  expect(screenfull.request).toHaveBeenCalledWith(
    expect.objectContaining({ value: card }),
  );
  expect(diagnosticValue("Last result mode")).toBe("fallback");
  expect(diagnosticValue("Status")).toBe("fallback");
  expect(diagnosticValue("Is fallback")).toBe("true");
  expect(diagnosticValue("Is fullscreen")).toBe("true");
  expect(diagnosticValue("Controller fullscreen element")).toBe("ARTICLE");
  expect(diagnosticValue("Document fullscreen element")).toBe("none");

  exit.click();
  await nextTick();
  expect(screenfull.exit).toHaveBeenCalledTimes(1);
});

test("video card styles switch controls and preserve its fullscreen layout", () => {
  const { readFileSync } = require("node:fs");
  const html = readFileSync("examples/index.html", "utf8");
  const source = readFileSync("examples/index.ts", "utf8");

  expect(html).toMatch(
    /\.video-card__exit\s*\{[^}]*display:\s*none;[^}]*min-height:\s*44px/s,
  );
  for (const state of [
    ".video-card.vue-screenfull-fallback",
    ".video-card:fullscreen",
    ".video-card:-webkit-full-screen",
  ]) {
    expect(html).toContain(`${state} {`);
    expect(html).toContain(`${state} .video-card__enter {`);
    expect(html).toContain(`${state} .video-card__exit {`);
  }
  expect(
    html.match(/grid-template-rows:\s*auto minmax\(0, 1fr\) auto/g),
  ).toHaveLength(3);
  expect(
    html.match(
      /\.video-card[^\n]*\.video-card__enter\s*\{\s*display:\s*none;/g,
    ),
  ).toHaveLength(3);
  expect(
    html.match(
      /\.video-card[^\n]*\.video-card__exit\s*\{\s*display:\s*inline-flex;/g,
    ),
  ).toHaveLength(3);
  expect(html.match(/object-fit:\s*contain/g)).toHaveLength(3);
  expect(html).toContain("env(safe-area-inset-bottom)");
  expect(source).not.toMatch(/userAgent|userAgentData/);
});

test("mobile full-width sizing is limited to playground actions", () => {
  const { readFileSync } = require("node:fs");
  const html = readFileSync("examples/index.html", "utf8");
  const mobileStyles = html.match(
    /@media \(max-width: 480px\) \{([\s\S]*?)(?=@media|<\/style>)/,
  )[1];
  const selector = "#app main button";

  expect(mobileStyles).toMatch(
    /#app main button\s*\{[^}]*width:\s*100%;[^}]*margin-inline:\s*0;/s,
  );
  expect(mobileStyles).not.toMatch(/(?:^|\})\s*button\s*\{/);

  document.body.innerHTML = `
    <header>
      <button class="nav-toggle" type="button">Menu</button>
      <button class="theme-toggle" type="button">Theme</button>
    </header>
    <div id="app"><main><button class="playground-action" type="button">Action</button></main></div>
    <aside class="pwa-update"><button type="button" data-pwa-update-now>Update now</button></aside>
  `;

  expect(document.querySelector(".playground-action").matches(selector)).toBe(
    true,
  );
  expect(document.querySelector(".nav-toggle").matches(selector)).toBe(false);
  expect(document.querySelector(".theme-toggle").matches(selector)).toBe(false);
  expect(
    document.querySelector("[data-pwa-update-now]").matches(selector),
  ).toBe(false);
});
