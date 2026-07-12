# vue-screenfull

[![npm version][npm-version-image]][npm-url]
[![license][license-image]][license-url]

[npm-version-image]: https://img.shields.io/npm/v/vue-screenfull.svg
[npm-url]: https://www.npmjs.com/package/vue-screenfull
[license-image]: https://img.shields.io/npm/l/vue-screenfull.svg
[license-url]: https://github.com/chengchuu/vue-screenfull/blob/main/LICENSE

Reactive, strongly typed, SSR-safe fullscreen utilities designed for Vue 3.
The library uses the browser Fullscreen API when available and can optionally provide an explicitly labelled CSS pseudo-fullscreen fallback.

- [Project website](https://chengchuu.github.io/vue-screenfull/)
- [Live playground](https://chengchuu.github.io/vue-screenfull/playground/)
- [API documentation](https://chengchuu.github.io/vue-screenfull/api/)

The website, playground, and API documentation support system, light, and dark themes. An explicit
choice is shared across these pages in local browser storage.

## Features

- Reactive Composition API state with automatic scope cleanup.
- Standard, WebKit, Mozilla, and Microsoft-prefixed API detection.
- Vue template refs, component refs, elements, and safe CSS selectors.
- Structured results and actionable errors instead of swallowed rejections.
- Renderless component, directive, optional plugin, and framework-light controller.
- No fullscreen wrapper or other runtime dependency; Vue remains a peer dependency.
- CJS, ESM, browser IIFE, source maps, and declarations.

## Installation

```bash
npm install vue-screenfull
```

The browser bundle is `lib/vue-screenfull.min.js`, exposes `VUE_SCREENFULL`, and expects Vue to be available as the global `Vue`.

## Browser Support

Support is feature-detected at runtime. Current Chrome, Edge, Firefox, and Safari desktop releases,
Chrome/Firefox/Samsung Internet on Android, and Safari on iPadOS commonly expose the API. iPhone
Safari, Android/iOS WebViews, managed devices, and embedded documents may restrict arbitrary-element
fullscreen. This policy describes targets, not a guarantee for every OS/browser release.

Native fullscreen can hide more browser UI, but the browser and operating system retain control.
The CSS fallback only fills the visual viewport and never claims to hide system or browser chrome.

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

Call `request` or `toggle` directly inside a click, keyboard, or touch handler.
Browsers normally require transient user activation and can reject even when `isEnabled.value` is true.

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
A selector such as `request("#player")` is resolved with `document.querySelector`; invalid or unmatched selectors return `INVALID_TARGET`.

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

Always include a visible exit button, particularly when fallback is enabled. Escape often exits,
but browser Escape behavior cannot be overridden reliably. Exits initiated by browser UI are reflected through native change events.

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

CSS fallback fixes an `HTMLElement` to the visual viewport, preserves every inline style it changes,
locks and restores body scrolling, preserves the scroll position, adds the configured class,
exits on Escape when possible, and restores focus. Cleanup also runs when its Vue scope is disposed.
It is pseudo-fullscreen: it cannot hide address bars, browser controls, notifications,
or operating-system UI. Keep an accessible exit button inside the target:

```vue
<button type="button" @click="exit">Close full-page view</button>
```

A custom fallback implements `enter(context)` and `exit(context)` and is responsible for complete cleanup.

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

The renderless component emits `change`, `enter`, `exit`, `error`, and `fallback`.
Its default slot receives all composable refs and actions; it imposes no visual system.

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

This registers `Screenfull` and `v-screenfull`. Names can be changed with `componentName` and `directiveName`.
Named composable imports never require plugin installation and remain tree-shakable.

## Advanced Usage

The framework-light controller is useful for migration and non-component integrations:

```ts
import { createScreenfullController } from "vue-screenfull";

const controller = createScreenfullController({ restoreFocus: true });
const onChange = (state) => console.log(state.isFullscreen, state.element);
controller.on("change", onChange);
await controller.request(document.querySelector("#map"));
controller.off("change", onChange);
await controller.destroy();
```

`raw` is a read-only diagnostic mapping of detected browser property/event names, or `null`.
It is not the recommended API. Each composable creates one controller and disposes it with its Vue scope;
multiple controllers synchronize through the same document's native events.
Importing the package does not register listeners or touch the DOM.

Reactive callbacks can observe changes without duplicate component wiring:

```ts
useScreenfull({ onEnter: announce, onExit: announce, onError: report });
```

`restoreFocus: true` (the default) focuses the initiating element after exit where practical.
`exitOnRouteChange` listens for browser `popstate`; router-specific navigation can instead call `exit()` in the application's own route hook.

## iframe Usage

The embedding page controls permission. A typical iframe is:

```html
<iframe
  src="https://example.com/player"
  allow="fullscreen"
  allowfullscreen
></iframe>
```

Permissions Policy or a missing iframe permission can still reject.
The library returns `IFRAME_PERMISSION_REQUIRED` when a denial can be associated with an embedded document;
it cannot override the parent page's policy.

## Mobile Considerations

- Use direct user gestures and keep a visible touch-sized exit control.
- Feature-detect rather than assuming support by device name.
- iPhone Safari and WKWebView behavior may be limited or video-specific.
- Dynamic browser chrome changes viewport height; CSS fallback uses `100dvh` where supported.
- Native navigation, tab switching, app switching, and OS gestures may exit fullscreen.
- Neither native capability nor this library guarantees browser/OS controls disappear.

## SSR and Nuxt

Imports are safe in Vite SSR, Nuxt 3, Node tests, and static generation. Outside a browser,
`isEnabled` is false, status is `unsupported`, and actions return `NOT_IN_BROWSER`.

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

When destructuring refs in `<script setup>`, templates unwrap them automatically;
when accessing through an object as above, use `.value` in script expressions.

## Migrating from screenfull

`vue-screenfull` is an independent Vue 3 library inspired by screenfull's public API and compatibility goals.
It is not drop-in compatible and is not endorsed by screenfull's maintainers.

| screenfull concept                     | vue-screenfull equivalent                               |
| -------------------------------------- | ------------------------------------------------------- |
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

Key differences are reactive refs, automatic lifecycle cleanup, SSR-safe imports, structured results/errors, optional pseudo-fullscreen, and Vue component/directive APIs.
Controller listeners receive typed state/errors rather than raw DOM events.
Legacy `onchange`/`onerror` aliases are not provided. The plugin is optional.

## API Reference

Root exports:

- `useScreenfull(options?)`, `useScreenfullTarget(target, options?)`
- `Screenfull`, `vScreenfull`, and the default plugin
- `createScreenfullController(options?)`
- `detectFullscreenApi(document)` and `resolveScreenfullTarget(target, document)`
- all public target, option, state, result, error, event, component, directive, plugin, and raw-map types

Actions resolve to `{ ok, mode, element, error }`; `mode` is `native`, `fallback`, or `none`.
Generated TypeDoc is published at [chengchuu.github.io/vue-screenfull/api/](https://chengchuu.github.io/vue-screenfull/api/).

## Live Playground

The deployed playground is at [chengchuu.github.io/vue-screenfull/playground/](https://chengchuu.github.io/vue-screenfull/playground/).
It includes page, element, image-style, and video targets; explicit exit; diagnostics;
invalid-target feedback; event history; accessibility, iframe, mobile, and migration notes. Run it locally with:

```bash
npm run dev
```

Native fullscreen automation is intentionally not treated as universally reliable because browsers enforce user activation.

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
npm run preview
npm pack --dry-run
```

See `MANUAL_TESTING.md` for the browser matrix and real-browser strategy.
Production output remains `lib/index.cjs.js`, `lib/index.esm.js`, `lib/vue-screenfull.min.js`, `lib/index.d.ts`, `lib/typing.d.ts`, and `lib/global.d.ts`. Native Node ESM resolves through the additional conditional entry `lib/index.mjs`.

## License and Attribution

Released under the MIT License. This independent project acknowledges [screenfull](https://github.com/sindresorhus/screenfull) (MIT) for its public API and cross-browser compatibility inspiration, and `vue-fullscreen` (MIT) as a Vue ecosystem reference. No endorsement is implied.
