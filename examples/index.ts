import { createApp, h, ref } from "vue";
import { useScreenfull, type ScreenfullResult } from "../src";

createApp({
  setup() {
    const target = ref<HTMLElement | null>(null);
    const image = ref<HTMLElement | null>(null);
    const video = ref<HTMLVideoElement | null>(null);
    const history = ref<string[]>(["Playground ready"]);
    const lastAction = ref("none");
    const fallbackEnabled = ref(true);
    const screenfull = useScreenfull({ fallback: "css", restoreFocus: true });
    const run = async (
      label: string,
      action: () => Promise<ScreenfullResult>,
    ) => {
      lastAction.value = label;
      const result = await action();
      history.value = [
        `${new Date().toLocaleTimeString()} ${label}: ${result.ok ? result.mode : result.error?.code}`,
        ...history.value,
      ].slice(0, 8);
    };
    const button = (label: string, action: () => Promise<ScreenfullResult>) =>
      h(
        "button",
        { type: "button", onClick: () => void run(label, action) },
        label,
      );
    return () =>
      h("main", [
        h("header", [
          h("p", { class: "eyebrow" }, "Vue 3 · Composition API · SSR safe"),
          h("h1", "vue-screenfull playground"),
          h(
            "p",
            "Try native fullscreen and the clearly labelled CSS pseudo-fullscreen fallback.",
          ),
        ]),
        h(
          "section",
          { class: "controls", "aria-label": "Whole page controls" },
          [
            button("Fullscreen page", () => screenfull.request()),
            button("Exit", screenfull.exit),
            button("Invalid target", () =>
              screenfull.request("#does-not-exist"),
            ),
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
          ]),
          h("article", { class: "card" }, [
            h("video", {
              ref: video,
              controls: true,
              muted: true,
              playsinline: true,
            }),
            h("h2", "Video target"),
            h(
              "p",
              "The sample has no remote media; choose fullscreen to verify video-element targeting.",
            ),
            button("View video fullscreen", () => screenfull.request(video)),
          ]),
        ]),
        h("section", { class: "panel", "aria-live": "polite" }, [
          h("h2", "Diagnostics"),
          h("dl", [
            h("div", [
              h("dt", "Browser API available"),
              h("dd", String(Boolean(screenfull.isEnabled.value))),
            ]),
            h("div", [
              h("dt", "Native fullscreen enabled"),
              h("dd", String(screenfull.isEnabled.value)),
            ]),
            h("div", [
              h("dt", "Current mode"),
              h(
                "dd",
                screenfull.isFallback.value
                  ? "fallback"
                  : screenfull.isFullscreen.value
                    ? "native"
                    : "none",
              ),
            ]),
            h("div", [
              h("dt", "Current fullscreen element"),
              h("dd", screenfull.fullscreenElement.value?.tagName ?? "none"),
            ]),
            h("div", [
              h("dt", "Pending state"),
              h(
                "dd",
                ["requesting", "exiting"].indexOf(screenfull.status.value) >= 0
                  ? "yes"
                  : "no",
              ),
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
            ? h(
                "p",
                { role: "alert", class: "error" },
                screenfull.error.value.message,
              )
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
      ]);
  },
}).mount("#app");
