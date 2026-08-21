import { createApp, h, ref } from "vue";
import {
  detectFullscreenApi,
  useScreenfull,
  type ScreenfullResult,
} from "../src";

createApp({
  setup() {
    const target = ref<HTMLElement | null>(null);
    const image = ref<HTMLElement | null>(null);
    const videoTarget = ref<HTMLElement | null>(null);
    const history = ref<string[]>(["Playground ready"]);
    const lastAction = ref("none");
    const lastResultMode = ref<ScreenfullResult["mode"]>("none");
    const actionFeedback = ref(
      "Choose an action to see its structured result here.",
    );
    const showMissingTargetExplanation = ref(false);
    const fallbackEnabled = ref(true);
    const browserApiAvailable = Boolean(detectFullscreenApi(document));
    const screenfull = useScreenfull({ fallback: "css", restoreFocus: true });
    const run = async (
      label: string,
      action: () => Promise<ScreenfullResult>,
    ) => {
      lastAction.value = label;
      showMissingTargetExplanation.value =
        label === "Test missing-target error";
      screenfull.clearError();
      const result = await action();
      lastResultMode.value = result.mode;
      actionFeedback.value = result.ok
        ? `${label} completed successfully${result.element ? ` using ${result.mode} mode` : ""}.`
        : `${label} returned ${result.error.code}: ${result.error.message}`;
      history.value = [
        `${new Date().toLocaleTimeString()} ${label}: ${result.ok ? result.mode : result.error?.code}`,
        ...history.value,
      ].slice(0, 8);
    };
    const button = (
      label: string,
      action: () => Promise<ScreenfullResult>,
      className?: string,
    ) =>
      h(
        "button",
        {
          class: className,
          type: "button",
          onClick: () => void run(label, action),
        },
        label,
      );
    return () =>
      h("main", [
        h("header", { class: "playground-intro" }, [
          h("p", { class: "eyebrow" }, "Vue 3 · Composition API · SSR safe"),
          h("h1", "vue-screenfull playground"),
          h(
            "p",
            "Try fullscreen controls for pages, elements, images, and videos.",
          ),
        ]),
        h(
          "section",
          { class: "controls", "aria-label": "Whole page controls" },
          [
            h("h2", "Page-level actions"),
            h("div", { class: "controls__buttons" }, [
              button("Fullscreen page", () => screenfull.request()),
              button("Exit fullscreen", screenfull.exit),
              button("Test missing-target error", () =>
                screenfull.request("#does-not-exist"),
              ),
            ]),
            h(
              "p",
              {
                class: "action-feedback",
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true",
              },
              actionFeedback.value,
            ),
            showMissingTargetExplanation.value
              ? h(
                  "p",
                  { class: "error-demo__explanation" },
                  'The error demo intentionally requests the missing selector "#does-not-exist" so you can inspect an INVALID_TARGET result without opening fullscreen.',
                )
              : null,
          ],
        ),
        h("section", { class: "demo-grid" }, [
          h("article", { ref: target, class: "card target" }, [
            h("span", { class: "badge" }, "ELEMENT"),
            h("h2", "A focused workspace"),
            h(
              "p",
              "This card has a visible exit control in both native and fallback modes.",
            ),
            button("Toggle this card", () => screenfull.toggle(target)),
            button("Exit fullscreen", screenfull.exit),
          ]),
          h("article", { ref: image, class: "card image-card" }, [
            h("div", {
              class: "art",
              role: "img",
              "aria-label": "Abstract purple and orange landscape",
            }),
            h("h2", "Image-style content"),
            button("View image fullscreen", () => screenfull.request(image)),
            button("Exit image fullscreen", screenfull.exit),
          ]),
          h("article", { class: "card" }, [
            h("div", { ref: videoTarget, class: "video-target" }, [
              h("video", {
                controls: true,
                muted: true,
                playsinline: true,
              }),
              button(
                "Exit video fullscreen",
                screenfull.exit,
                "video-target__exit",
              ),
            ]),
            h("h2", "Video target"),
            h(
              "p",
              "This example targets a video wrapper so its exit control remains reachable. Direct HTMLVideoElement targets remain supported by the library API.",
            ),
            button("View video fullscreen", () =>
              screenfull.request(videoTarget),
            ),
          ]),
        ]),
        h("section", { class: "panel" }, [
          h("h2", "Diagnostics"),
          h("dl", [
            h("div", [
              h("dt", "Browser API available"),
              h("dd", String(browserApiAvailable)),
            ]),
            h("div", [
              h("dt", "Native fullscreen enabled"),
              h("dd", String(screenfull.isEnabled.value)),
            ]),
            h("div", [
              h("dt", "Last result mode"),
              h("dd", lastResultMode.value),
            ]),
            h("div", [h("dt", "Status"), h("dd", screenfull.status.value)]),
            h("div", [
              h("dt", "Is fallback"),
              h("dd", String(screenfull.isFallback.value)),
            ]),
            h("div", [
              h("dt", "Is fullscreen"),
              h("dd", String(screenfull.isFullscreen.value)),
            ]),
            h("div", [
              h("dt", "Controller fullscreen element"),
              h("dd", screenfull.fullscreenElement.value?.tagName ?? "none"),
            ]),
            h("div", [
              h("dt", "Document fullscreen element"),
              h("dd", document.fullscreenElement?.tagName ?? "none"),
            ]),
            h("div", [h("dt", "Last action"), h("dd", lastAction.value)]),
            h("div", [
              h("dt", "Last error code"),
              h("dd", screenfull.error.value?.code ?? "none"),
            ]),
            h("div", [
              h("dt", "Last error message"),
              h("dd", screenfull.error.value?.message ?? "none"),
            ]),
            h("div", [
              h("dt", "User activation state"),
              h(
                "dd",
                String(navigator.userActivation?.isActive ?? "not detectable"),
              ),
            ]),
            h("div", [
              h("dt", "Fallback enabled"),
              h("dd", String(fallbackEnabled.value)),
            ]),
          ]),
          screenfull.error.value
            ? h("p", { class: "error" }, screenfull.error.value.message)
            : null,
        ]),
        h("section", { class: "panel" }, [
          h("h2", "Event history"),
          h(
            "ol",
            history.value.map((item) => h("li", item)),
          ),
        ]),
        h("section", { class: "notes" }, [
          h("h2", "Embedding and mobile notes"),
          h(
            "p",
            'An embedding iframe generally needs allow="fullscreen" and allowfullscreen. iPhone, WebViews, and managed devices may restrict arbitrary-element fullscreen; runtime detection is authoritative.',
          ),
          h(
            "p",
            "Migration: screenfull.toggle(element) becomes useScreenfull().toggle(element), with reactive refs and structured results.",
          ),
        ]),
        h("footer", [
          h("h2", "Project documentation"),
          h("ul", [
            h("li", [h("a", { href: "../" }, "Project overview")]),
            h("li", [h("a", { href: "../api/" }, "Public API reference")]),
          ]),
        ]),
      ]);
  },
}).mount("#app");
