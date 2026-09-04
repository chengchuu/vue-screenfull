# Add a Vue-free browser entry

## Summary

Provide a framework-neutral distribution for callers that do not own a Vue root. Support npm
imports, native browser ES modules, and classic script tags without requiring Vue at runtime.

## Implementation changes

- Add `vue-screenfull/browser` with named exports for `createScreenfullController` and
  `detectFullscreenApi`.
- Export only controller-related, framework-neutral types from this subpath. Separate neutral types
  from Vue-specific component, directive, ref, and plugin types so `browser.d.ts` never imports Vue.
- Generate CJS, bundler ESM, native ESM, declarations, source maps, and
  `lib/vue-screenfull.browser.min.js`. Expose the IIFE as `VUE_SCREENFULL_BROWSER` with no external
  globals.
- Mark the Vue peer dependency optional. Keep the existing package-root API and `VUE_SCREENFULL`
  Vue bundle unchanged; root Vue APIs still require Vue.
- Document npm, native browser ESM, and script-tag usage in both READMEs, including user-gesture
  requirements and explicit controller cleanup.

## Public interfaces

- New package subpath: `vue-screenfull/browser`.
- New browser artifact: `lib/vue-screenfull.browser.min.js`.
- New browser global: `VUE_SCREENFULL_BROWSER`.
- The factory retains its current `ScreenfullController` contract, including `request`, `exit`,
  `toggle`, state getters, listeners, structured results, CSS fallback, and `destroy`.
- The framework-neutral entry accepts `Element | null | undefined`, as the existing controller
  does. Selector and Vue-ref resolution remain outside this entry.

## Test plan

- Add Node and SSR coverage proving the browser entry imports and creates a stable unsupported
  controller without browser globals or Vue runtime loading.
- Add compile-time coverage for browser-subpath exports and framework-neutral result narrowing.
- Build and inspect every browser artifact, confirming that the outputs contain no Vue or Mazey
  runtime imports and that the IIFE requires no external globals.
- Test the packed package from an isolated temporary consumer without Vue by using CommonJS, ESM,
  TypeScript, native browser ESM, and the standalone IIFE.
- Run `npm run format:check`, `npm run preview`, `npm run docs`, `npm pack --dry-run`, and
  `git diff --check`.

## Assumptions

- The existing `unpkg` and `jsdelivr` defaults continue to point to the Vue-aware bundle.
  Plain-JavaScript users select the documented standalone file explicitly.
- No singleton `request`, `exit`, or `toggle` exports are added.
- No package-version bump, release, generated-file commit, or playground redesign is included.
