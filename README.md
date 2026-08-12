# vue-screenfull

[![npm version][npm-version-image]][npm-url]
[![license][license-image]][license-url]

[npm-version-image]: https://img.shields.io/npm/v/vue-screenfull.svg
[npm-url]: https://www.npmjs.com/package/vue-screenfull
[license-image]: https://img.shields.io/npm/l/vue-screenfull.svg
[license-url]: https://github.com/chengchuu/vue-screenfull/blob/main/LICENSE

Reactive, strongly typed, and SSR-safe fullscreen utilities for Vue 3, with an optional CSS
pseudo-fullscreen fallback.

- [Project website](https://chengchuu.github.io/vue-screenfull/)
- [Live playground](https://chengchuu.github.io/vue-screenfull/playground/)
- [API documentation](https://chengchuu.github.io/vue-screenfull/api/)

## Features

- Reactive Composition API state with automatic scope cleanup.
- Standard, WebKit, Mozilla, and Microsoft-prefixed API detection.
- Vue template refs, component refs, elements, and safe CSS selectors.
- Structured results and actionable errors instead of swallowed rejections.
- Renderless component, directive, optional plugin, and framework-neutral controller.

## Installation

```bash
npm install vue-screenfull
```

`lib/vue-screenfull.min.js` exposes `VUE_SCREENFULL` and requires the global `Vue`. Although Vue is
an optional peer dependency, package-root imports still require Vue 3 at runtime.

## Basic Usage

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useScreenfull } from "vue-screenfull";

const target = useTemplateRef<HTMLElement>("target");
const { isEnabled, isFullscreen, error, toggle } = useScreenfull();
</script>

<template>
  <section ref="target">
    <p>Fullscreen content</p>
    <button type="button" :disabled="!isEnabled" @click="toggle(target)">
      {{ isFullscreen ? "Exit fullscreen" : "Enter fullscreen" }}
    </button>
    <p v-if="error" role="alert">{{ error.message }}</p>
  </section>
</template>
```

Call `request` or `toggle` directly from a click, keyboard, or touch handler. Browsers normally
require transient user activation and can reject a request even when `isEnabled.value` is true.

## Fullscreen a Specific Element

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useScreenfullTarget } from "vue-screenfull";
const panel = useTemplateRef<HTMLElement>("panel");
const { request, isFullscreen } = useScreenfullTarget(panel);
</script>
<template>
  <section ref="panel">
    <button type="button" @click="request()">Open panel</button>
    <span>Active: {{ isFullscreen }}</span>
  </section>
</template>
```

`useScreenfull().request()` with no target opens `document.documentElement`.
A selector such as `request("#player")` is resolved with `document.querySelector`. Invalid or
unmatched selectors return `INVALID_TARGET`.

## Toggle Fullscreen

```ts
const result = await toggle(target, { navigationUI: "hide" });
if (!result.ok) console.warn(result.error.code, result.error.suggestion);
```

For image content, pass the image template ref. For a video, pass an `HTMLVideoElement` ref.
Some mobile browsers offer video-only fullscreen independently of arbitrary-element fullscreen.

## Exit Fullscreen

```vue
<button type="button" @click="exit">Exit fullscreen</button>
```

Always include a visible exit button, particularly when fallback is enabled. Escape often exits
fullscreen, but its browser behavior cannot be overridden reliably. Native change events reflect
exits initiated through the browser UI.

## Check Support

```ts
const { isEnabled, status } = useScreenfull();
// isEnabled.value: native API currently enabled
// status.value: idle | requesting | fullscreen | exiting | fallback | unsupported | error
```

Feature detection is more reliable than user-agent checks across Safari, iOS/iPadOS, and WebViews.

## Handle Errors

```ts
const result = await request(target);
if (!result.ok) {
  console.error(
    result.error.code,
    result.error.message,
    result.error.suggestion,
  );
}
```

Errors distinguish unsupported/SSR environments, invalid or detached targets, user activation,
permissions and iframe policy, pending transitions, native request/exit failures, and fallback
failures. `error` keeps the last error until `clearError()` is called.

## CSS Fallback

```ts
const { request, exit, isFallback } = useScreenfull({
  fallback: "css",
  fallbackClass: "my-pseudo-fullscreen",
  lockScroll: true,
  restoreFocus: true,
});
```

CSS fallback fixes an `HTMLElement` to the visual viewport and preserves every inline style that it
changes. For element targets, it locks and restores background body scrolling. It keeps whole-page
targets scrollable, preserves the scroll position, adds the configured class, exits on Escape when
possible, and restores focus. Cleanup also runs when its Vue scope is disposed.

This mode is pseudo-fullscreen. It cannot hide address bars, browser controls, notifications, or
operating-system UI. Keep an accessible exit button inside the target:

```vue
<button type="button" @click="exit">Close full-page view</button>
```

A custom fallback implements `enter(context)` and `exit(context)` and is responsible for complete
cleanup.

## Component Usage

```vue
<Screenfull
  target="#article"
  fallback="css"
  v-slot="screenfull"
  @error="report"
>
  <button type="button" @click="screenfull.toggle()">
    {{ screenfull.isFullscreen ? "Exit" : "Open article" }}
  </button>
  <button v-if="screenfull.isFullscreen" type="button" @click="screenfull.exit">Exit</button>
</Screenfull>
```

The renderless component emits `change`, `enter`, `exit`, `error`, and `fallback`. Its default slot
receives all composable refs and actions without imposing a visual system.

## Directive Usage

```vue
<button v-screenfull>Fullscreen page</button>
<button v-screenfull="target">Toggle target</button>
<button v-screenfull:request="target">Enter target</button>
<button v-screenfull:exit>Exit</button>
<button
  v-screenfull="{ target, action: 'toggle', options: { navigationUI: 'hide' } }"
>Toggle</button>
```

Only `request`, `exit`, and `toggle` arguments are supported. The default is `toggle`.
Directives need local registration unless the plugin is installed:

```ts
const vScreenfull = importedDirective;
```

## Plugin Installation

```ts
import { createApp } from "vue";
import VueScreenfull from "vue-screenfull";
import App from "./App.vue";

createApp(App).use(VueScreenfull).mount("#app");
```

This registers `Screenfull` and `v-screenfull`. Use `componentName` and `directiveName` to change
their names. Named composable imports do not require plugin installation and remain tree-shakable.

## Vue-free Browser Entry

Use `vue-screenfull/browser` when the caller does not own a Vue root. This subpath exports only
`createScreenfullController`, `detectFullscreenApi`, and their framework-neutral types. It does not
load Vue or Mazey at runtime.

With npm:

```ts
import {
  createScreenfullController,
  type ScreenfullChangeListener,
} from "vue-screenfull/browser";

const controller = createScreenfullController({ restoreFocus: true });
const target = document.querySelector("#player");
const button = document.querySelector("#toggle-fullscreen");
const toggle = () => controller.toggle(target);
const onChange: ScreenfullChangeListener = (state) => {
  console.log(state.isFullscreen, state.element);
};

button?.addEventListener("click", toggle);
controller.on("change", onChange);

async function dispose() {
  button?.removeEventListener("click", toggle);
  controller.off("change", onChange);
  await controller.destroy();
}

// Call dispose() when the integration is disposed.
```

As a native browser ES module:

```html
<script type="module">
  import { createScreenfullController } from "https://cdn.jsdelivr.net/npm/vue-screenfull/lib/browser.mjs";

  const controller = createScreenfullController();
  const target = document.querySelector("#player");
  const button = document.querySelector("#toggle-fullscreen");
  const toggle = () => controller.toggle(target);

  button?.addEventListener("click", toggle);

  async function dispose() {
    button?.removeEventListener("click", toggle);
    await controller.destroy();
  }

  // Call dispose() when the integration is disposed.
</script>
```

As a classic script:

```html
<script src="https://cdn.jsdelivr.net/npm/vue-screenfull/lib/vue-screenfull.browser.min.js"></script>
<script>
  const controller = VUE_SCREENFULL_BROWSER.createScreenfullController();
  const target = document.querySelector("#player");
  const button = document.querySelector("#toggle-fullscreen");
  const toggle = () => controller.toggle(target);

  button?.addEventListener("click", toggle);

  function dispose() {
    button?.removeEventListener("click", toggle);
    return controller.destroy();
  }

  // Call dispose() when the integration is disposed.
</script>
```

Call `request` or `toggle` directly from a click, keyboard, or touch handler because browsers
normally require transient user activation. Retain the controller and call `destroy()` when the
integration is disposed so its listeners and any active CSS fallback are cleaned up.

## Advanced Usage

The framework-neutral controller is useful for migration and non-component integrations:

```ts
import { createScreenfullController } from "vue-screenfull/browser";

const controller = createScreenfullController({ restoreFocus: true });
const onChange = (state) => console.log(state.isFullscreen, state.element);
controller.on("change", onChange);
await controller.request(document.querySelector("#map"));
controller.off("change", onChange);
await controller.destroy();
```

`raw` is a read-only diagnostic mapping of detected browser property and event names, or `null`. It
is not the recommended API. Each composable creates one controller and disposes it with its Vue
scope. Multiple controllers synchronize through the same document's native events. Importing the
package does not register listeners or touch the DOM.

Reactive callbacks can observe changes without duplicate component wiring:

```ts
useScreenfull({ onEnter: announce, onExit: announce, onError: report });
```

`restoreFocus: true` (the default) focuses the initiating element after exit where practical.
`exitOnRouteChange` listens for browser `popstate`. For router-specific navigation, call `exit()`
from the application's route hook instead.

## iframe Usage

The embedding page controls permission. A typical iframe is:

```html
<iframe
  src="https://example.com/player"
  allow="fullscreen"
  allowfullscreen
></iframe>
```

A Permissions Policy restriction or missing iframe permission can still reject the request. The
library returns `IFRAME_PERMISSION_REQUIRED` when it can associate a denial with an embedded
document. It cannot override the parent page's policy.

## Mobile Considerations

- Use direct user gestures and keep a visible touch-sized exit control.
- Feature-detect rather than assuming support by device name.
- iPhone Safari and WKWebView behavior may be limited or video-specific.
- Dynamic browser chrome changes viewport height; CSS fallback uses `100dvh` where supported.
- Native navigation, tab switching, app switching, and OS gestures may exit fullscreen.
- Neither native capability nor this library guarantees browser/OS controls disappear.

## Browser Support

Support is detected at runtime. Current desktop releases of Chrome, Edge, Firefox, and Safari
commonly expose the API. Chrome, Firefox, and Samsung Internet on Android and Safari on iPadOS also
commonly expose it. iPhone Safari, Android and iOS WebViews, managed devices, and embedded documents
may restrict arbitrary-element fullscreen. This policy identifies support targets; it does not
guarantee support in every browser or operating-system release.

Native fullscreen can hide more browser UI, but the browser and operating system retain control.
The CSS fallback only fills the visual viewport and never claims to hide system or browser chrome.

## SSR and Nuxt

Imports are safe in Vite SSR, Nuxt 3, Node tests, and static generation. Outside a browser,
`isEnabled` is `false`, the status is `unsupported`, and actions return `NOT_IN_BROWSER`.

```vue
<script setup lang="ts">
import { useScreenfull } from "vue-screenfull";
const screenfull = useScreenfull(); // safe during Nuxt setup/SSR
</script>
<template>
  <ClientOnly>
    <button
      type="button"
      :disabled="!screenfull.isEnabled.value"
      @click="screenfull.toggle()"
    >
      Toggle page fullscreen
    </button>
  </ClientOnly>
</template>
```

Templates automatically unwrap refs destructured in `<script setup>`. When accessing refs through
an object as shown in the example, use `.value` in script expressions.

## Migrating from screenfull

`vue-screenfull` is an independent Vue 3 library inspired by screenfull's public API and
compatibility goals. It is not drop-in compatible and is not endorsed by screenfull's maintainers.

| screenfull concept                     | vue-screenfull equivalent                               |
| :------------------------------------- | :------------------------------------------------------ |
| `screenfull.request(element, options)` | `request(element, options)`                             |
| `screenfull.exit()`                    | `exit()`                                                |
| `screenfull.toggle(element, options)`  | `toggle(element, options)`                              |
| `screenfull.isEnabled`                 | reactive `isEnabled.value`                              |
| `screenfull.isFullscreen`              | reactive `isFullscreen.value`                           |
| `screenfull.element`                   | reactive `fullscreenElement.value`                      |
| `screenfull.on("change", fn)`          | refs, callbacks, component events, or controller events |
| `screenfull.on("error", fn)`           | reactive `error`, callbacks, or controller events       |

Before:

```ts
import screenfull from "screenfull";
if (screenfull.isEnabled) await screenfull.toggle(element);
```

After:

```ts
import { useScreenfull } from "vue-screenfull";
const { isEnabled, toggle } = useScreenfull();
if (isEnabled.value) {
  const result = await toggle(element);
  if (!result.ok) console.error(result.error.message);
}
```

Key differences include reactive refs, automatic lifecycle cleanup, SSR-safe imports, structured
results and errors, optional pseudo-fullscreen, and Vue component and directive APIs. Controller
listeners receive typed state and errors instead of raw DOM events. Legacy `onchange` and `onerror`
aliases are not provided. The plugin is optional.

## API Reference

Root exports:

- `useScreenfull(options?)`, `useScreenfullTarget(target, options?)`
- `Screenfull`, `vScreenfull`, and the default plugin
- `createScreenfullController(options?)`
- `detectFullscreenApi(document)` and `resolveScreenfullTarget(target, document)`
- all public target, option, state, result, error, event, component, directive, plugin, and raw-map types

The `vue-screenfull/browser` subpath exports `createScreenfullController`, `detectFullscreenApi`,
and only framework-neutral controller types.

Actions resolve to `{ ok, mode, element, error }`. The `mode` value is `native`, `fallback`, or
`none`. Generated TypeDoc is published at
[chengchuu.github.io/vue-screenfull/api/](https://chengchuu.github.io/vue-screenfull/api/).

## Live Playground

The deployed playground is available at
[chengchuu.github.io/vue-screenfull/playground/](https://chengchuu.github.io/vue-screenfull/playground/).
It includes page, element, image-style, and video targets; explicit exit controls; diagnostics;
invalid-target feedback; event history; and accessibility, iframe, mobile, and migration notes. Run
it locally with:

```bash
npm run dev
```

Native fullscreen automation is intentionally not treated as universally reliable because browsers
enforce user activation.

## Installable Documentation Website

The project website is a Progressive Web App scoped to `/vue-screenfull/`. Its homepage, playground,
and API documentation share a generated manifest and a Google Workbox v7 service worker. Documents,
scripts, and styles use bounded network-first caches. This strategy normally prioritizes current
documentation without pairing fresh HTML with stale bundles. Local images and fonts use bounded
cache-first storage. The site uses a precached offline page only when the requested document is
unavailable from both the network and the runtime cache.

Installation uses the browser's native `beforeinstallprompt` flow when available. The site does not
open that prompt automatically. In browsers without a custom prompt, use the browser menu or, on
iOS and iPadOS Safari, **Share → Add to Home Screen**. Installing the website is separate from the
Fullscreen API and does not grant fullscreen capability.

Worker updates remain user-controlled. When a new version is waiting, choose **Update now** to
activate it and reload the current page once. On the playground, only this explicit action reloads
an active session during an update. The generated worker includes a final-artifact version marker,
so deployable website changes can be detected without precaching unversioned bundles.

## Development

Node.js 22 is used in CI.

```bash
npm install
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run docs
npm run seo:validate
npm run pwa:validate
npm run preview
npm pack --dry-run
```

Normal `npm run dev` does not register the production worker. Build `npm run docs` and serve the
generated `docs` directory from localhost under `/vue-screenfull/` for production-like PWA testing.

See [`guides/MANUAL_TESTING.md`](./guides/MANUAL_TESTING.md) for the browser matrix and real-browser
strategy. The root entry produces `lib/index.cjs.js`, `lib/index.esm.js`, `lib/index.mjs`,
`lib/vue-screenfull.min.js`, `lib/index.d.ts`, `lib/typing.d.ts`, and `lib/global.d.ts`. The
framework-neutral entry produces `lib/browser.cjs.js`, `lib/browser.esm.js`, `lib/browser.mjs`,
`lib/browser.d.ts`, and `lib/vue-screenfull.browser.min.js`. JavaScript bundles include source maps.

## License and Attribution

Released under the MIT License. This independent project acknowledges
[screenfull](https://github.com/sindresorhus/screenfull) (MIT) for its public API and cross-browser
compatibility inspiration, and `vue-fullscreen` (MIT) as a Vue ecosystem reference. No endorsement
is implied.
