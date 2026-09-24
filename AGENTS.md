# AGENTS.md

Guidance for automated coding agents working in `vue-screenfull`.

## Scope And Goal

This directory is the primary npm package. Improve maintainability, package quality, and developer
experience.

Keep the package generic, browser-friendly, and easy to rename. Preserve the package identity
`vue-screenfull` unless the user explicitly requests a rename.

## Project Shape

- `src/index.ts`: package entrypoint and supported root exports.
- `src/browser.ts`: framework-neutral browser subpath entrypoint.
- `src/core`: Fullscreen API detection, controller, target, types, error, and fallback logic.
- `src/core/typing.ts`: framework-neutral controller types shared by both public entries.
- `src/composables`: reactive Vue APIs and scope cleanup.
- `src/components`, `src/directives`, and `src/plugin`: optional Vue integration layers.
- `src/typing.ts`: public TypeScript interfaces and type aliases.
- `types/global.d.ts`: ambient browser type augmentations.
- `test`: Node and jsdom Jest tests for public behavior.
- `type-tests`: compile-time checks for public root imports and narrowing.
- `examples`: accessible Webpack playground and diagnostics UI.
- `README.md` and `README.zh-CN.md`: maintained English and Simplified Chinese user documentation.
- `guides/MANUAL_TESTING.md`: repeatable real-browser and operating-system matrix.
- `guides/BUG_AUDIT.md`: point-in-time reliability audit; verify its claims against current code
  before treating them as current behavior.
- `guides/MAZEY_CANDIDATES.md`: evaluated helper-extraction candidates and boundaries for Mazey reuse.
- `scripts/rollup.config.mjs`: production JavaScript and declaration builds.
- `scripts/webpack.config.dev.js`: development/demo build and dev server.
- `site/theme.ts` and `site/theme-entry.ts`: project-owned theme/navigation behavior and its browser
  entrypoint.
- `site/pwa.ts` and `site/pwa/`: browser-native install handling and Workbox-window lifecycle UX.
- `site/service-worker.ts`: Workbox v7 service worker source for scoped routing and caching.
- `scripts/build-pages.js`: combines the generated site and API docs, emits manifest assets, and
  runs Workbox `injectManifest` against the final Pages artifact.
- `scripts/validate-seo.js` and `scripts/validate-pwa.js`: validate the assembled Pages artifact.
- `scripts/change-package-name.js`: automation helper that changes only the package name.
- `pnpm-lock.yaml`: tracked dependency-resolution lockfile.
- `lib`: generated publish output; do not edit it by hand.
- `dist-dev`, `docs`, and `coverage`: generated development, documentation, and test output.

Keep `src/index.ts` as the clear root entrypoint. As the source grows, use internal modules and
re-export the supported surface from `src/index.ts` rather than making consumers import internal
paths.

## Package Contract

The published package currently provides:

- CommonJS: `lib/index.cjs.js`
- ES modules: `lib/index.esm.js`
- Native Node ES modules: `lib/index.mjs`
- Browser IIFE: `lib/vue-screenfull.min.js`
- Framework-neutral CommonJS: `lib/browser.cjs.js`
- Framework-neutral bundler ESM: `lib/browser.esm.js`
- Framework-neutral native ESM: `lib/browser.mjs`
- Framework-neutral browser IIFE: `lib/vue-screenfull.browser.min.js`
- Framework-neutral declarations: `lib/browser.d.ts`
- Root declarations: `lib/index.d.ts`
- Shared declarations: `lib/typing.d.ts`
- Global augmentations: `lib/global.d.ts`

Preserve these formats unless the user requests a packaging change. Keep `package.json` fields,
Rollup outputs, README examples, declarations, and generated files aligned.

Keep the conditional `exports` map aligned with the legacy `main`, `module`, and `types` fields.
Native Node ESM must resolve to `lib/index.mjs`; pointing it at `index.esm.js` is invalid while the
package remains CommonJS by default. Preserve the documented legacy bundle subpath exports.

`mazey` is the package's runtime utility dependency. `src/core/target.ts` delegates generic target
resolution to `resolveElementTarget`, while `site/theme.ts` uses Mazey's theme preference and media
query helpers. Verify installed Mazey exports, declarations, implementation, and tests before adding
another reuse. Vue is an optional peer dependency and a development dependency. Rollup keeps both Vue and
Mazey external for module outputs, but the browser IIFE bundles Mazey and expects only the global
`Vue`. The `vue-screenfull/browser` module and `VUE_SCREENFULL_BROWSER` IIFE contain no Vue or Mazey
runtime import. Optional peer metadata supports Vue-free subpath consumers; package-root APIs still
require Vue at runtime. Do not add a fullscreen wrapper such as `screenfull`; compatibility logic
belongs here.

When changing a public function, value, or type, check all of these together:

- exports and implementation in `src/index.ts`;
- declarations in `src/core/typing.ts`, `src/typing.ts`, and `types/global.d.ts`;
- tests under `test`;
- compile-time coverage under `type-tests`;
- usage in `examples`, `README.md`, and `README.zh-CN.md`;
- generated declarations and bundles from `npm run build`.

Do not add a runtime `packageInfo` export or hard-coded package version to `src/index.ts`. Package
metadata belongs in `package.json`; the existing npm scripts pass `$npm_package_version` to Rollup
for generated bundle banners. Consumers that need metadata can use the explicitly exported
`vue-screenfull/package.json` subpath.

## Dependencies And Package Managers

CI uses Node.js 22 and runs installation and scripts through npm. The repository also tracks
`pnpm-lock.yaml` (lockfile format 9) and intentionally ignores `package-lock.json`.

- Run repository scripts with their documented `npm run ...` commands.
- When dependency metadata changes, update `package.json` and `pnpm-lock.yaml` together with pnpm;
  do not commit a generated `package-lock.json`.
- Keep `mazey` in `dependencies`, Vue in both `peerDependencies` and `devDependencies`, and build,
  test, lint, documentation, and Workbox packages in `devDependencies`.
- Verify the npm-based CI installation path after dependency or lockfile changes when practical.
- Use `guides/MAZEY_CANDIDATES.md` as scope evidence, not as authorization to change the separate
  Mazey repository or to move project-specific fullscreen, theme DOM, or PWA policy upstream.

## Runtime Architecture And Invariants

`createScreenfullController()` is the single compatibility implementation. The composables,
component, directive, and plugin must reuse it rather than implementing their own browser-prefix or
fallback behavior.

- Do not touch `window`, `document`, `Element`, or other browser constructors at module load.
- A controller is created per composable; native document events synchronize multiple instances.
- Treat native fullscreen events as the source of truth for the active element and independent exits.
- Keep request/exit transitions serialized. Reject overlapping actions without overwriting the
  active `requesting` or `exiting` status.
- Compare elements by object identity, not stringification.
- `controller.request()` with no argument defaults to `document.documentElement`; an explicit
  `null` is an invalid resolved target and must not silently fullscreen the page.
- Legacy-prefixed methods may return `void`. In that case, settle from the corresponding change or
  error event and always remove temporary listeners and timers.
- Do not emit the same error twice when both a rejected promise and `fullscreenerror` describe one
  managed transition.
- Isolate consumer callbacks and event listeners. A throwing listener must not reject an action,
  strand `pending`, or prevent later listeners from observing the transition.
- `ScreenfullResult` is a discriminated union. Preserve narrowing between `ok: true`/`error: null`
  and `ok: false`/a structured error.
- CSS fallback is pseudo-fullscreen, never native fullscreen. It must restore every modified inline
  style, body overflow, scroll position, focus where practical, classes, and listeners on exit or
  disposal.
- CSS fallback locks background body scrolling only for element overlays. A whole-page
  `document.documentElement` or `document.body` fallback must remain scrollable.
- Native and CSS fallback modes must not remain active together. When a native request for a new
  target fails while another target is already natively fullscreen, exit the existing native session
  before entering fallback; if that exit fails, return the structured exit failure instead.
- Destroying a controller during a pending fallback must clean up if the fallback finishes later and
  must not notify disposed Vue scopes.

Target resolution accepts Elements, Vue refs, component refs, selectors, and nullish defaults. Keep
the Vue unwrap adapter and fullscreen-specific default in `resolveScreenfullTarget`, and delegate
generic DOM target resolution to Mazey's `resolveElementTarget`. Invalid or unmatched explicit
targets must produce `INVALID_TARGET`; detached targets must produce `TARGET_NOT_CONNECTED`.

## TypeScript

The library targets ES2015 with ESNext modules and bundler-style module resolution. Preserve strict
type checking and browser library support. Avoid weakening strictness globally to accommodate one
implementation detail.

`tsconfig.json` intentionally uses `"types": []`. Library source does not need Node ambient types;
Node-specific JavaScript configuration files are outside the TypeScript program. Add `@types/node`
and opt into Node types only if TypeScript source genuinely starts using Node APIs.

Use `import type` and `export type` for type-only boundaries. Keep declarations suitable for npm
consumers without requiring project-specific path aliases or undeclared type packages.

`lib/index.d.ts` must reference `lib/global.d.ts`. The Rollup declaration output currently adds:

```ts
/// <reference path="./global.d.ts" />
```

If declaration generation is changed, verify that consumers importing the package root still pick
up the global augmentations. Do not publish an unreferenced ambient declaration artifact.

`lib/global.d.ts` must remain an external module containing `export {};`; the declaration build adds
this footer because declaration bundling otherwise strips the source module marker. Verify changes
with strict checking in a clean consumer, not only the repository's `skipLibCheck` configuration.

## Module And Build Rules

`package.json` does not declare `"type": "module"`.

- Keep ordinary `.js` scripts in CommonJS syntax.
- Use `.mjs` for ESM configuration, as Rollup does.
- Prefer `node:` specifiers for Node built-ins when touching scripts.
- Do not introduce module-load browser side effects that fail in Node-based tests or bundlers.

Rollup owns production output. Preserve CJS, ESM, IIFE, source maps, declaration generation, the
license banner, and minification controlled by `SCRIPTS_NPM_PACKAGE_DEBUG`. Babel helpers are
bundled, and generated JavaScript must not acquire undeclared runtime helper imports.

Keep `vue` and `mazey` external in CJS, ESM, and declaration outputs. The IIFE-specific Mazey
resolver intentionally bundles Mazey from its declared module entry while leaving Vue external as
the `Vue` global. Recheck both module consumers and the browser bundle when dependency resolution or
Rollup configuration changes.

Preserve `/*#__PURE__*/` annotations on top-level Vue/component helpers and other safely pure
initializers. Terser is configured with `preserve_annotations` so consumers can tree-shake unused
Vue layers from the bundled ESM entry. When changing Rollup or minification, test a narrow named
import with a second bundling pass instead of relying only on `sideEffects: false`.

Webpack owns the local playground and development server. `npm run dev` serves it on port 8080.
Keep the playground dependent only on public root exports, responsive, keyboard accessible, and
usable with visible native and fallback exit controls. Do not couple the publish build to Webpack or
make development depend on prebuilt `lib` files.

Playground actions must use labels that explain their outcome or purpose. Error demonstrations must
not rely on users reading the diagnostics table: show the structured result in the nearby
`action-feedback` live region. Keep the missing-target explanation conditional on activating
`Test missing-target error`, render it after `action-feedback`, and hide it when another action runs.

`npm run build:dev` is the development playground build; `npm run build:playground` is the minified
production build used by `npm run docs` and Pages. Keep Vue's compile-time feature flags explicit so
the browser console stays warning-free and production tree-shaking remains effective.

Never edit generated files under `lib`, `dist-dev`, `docs`, or `coverage` as source changes. Rebuild
them through the owning command when verification needs them.

## Tests And Quality Checks

Run commands from this directory. Match verification effort to the change:

```bash
npm run typecheck
npm run lint
npm run build
npm run test
npm run format:check
```

For a full pre-release check, run:

```bash
npm run preview
npm pack --dry-run
```

For narrow script changes, use focused checks such as:

```bash
node --check scripts/change-package-name.js
```

Add or update Jest tests when public behavior changes. Keep tests deterministic and independent of
network services. For packaging changes, inspect the generated `lib` files and the `npm pack`
manifest, not only whether Rollup exits successfully.

Use `@jest-environment node` for import/SSR, SEO transformation, service-worker source, manifest,
and artifact-helper checks. Use `@jest-environment jsdom` for DOM, Vue, directive, component, PWA
lifecycle, theme, navigation, and compatibility behavior. Native user-gesture fullscreen is not
reliable in headless CI; test browser-name mapping and transition logic with deterministic fakes,
then document real-browser coverage in `guides/MANUAL_TESTING.md`. Keep `type-tests/public.ts`
checking result narrowing and root-only consumer imports.

Do not run `scripts/change-package-name.js` casually during verification because it mutates
`package.json`. When explicitly testing it, restore the normal package identity or intentionally
keep the requested result.

## Documentation

Keep `README.md` and `README.zh-CN.md` behaviorally synchronized when changing:

- public API names, types, or examples;
- installation or development commands;
- package output paths or supported module formats;
- Node.js or TypeScript requirements;
- release or documentation workflows visible to maintainers.

Do not treat validation counts, dependency statements, generated sizes, or open findings recorded in
`guides/BUG_AUDIT.md` as live project state. It is historical audit evidence unless a task explicitly
updates and revalidates it.

TypeDoc configuration lives in `tsconfig.json`. `npm run docs` generates API documentation at
`./docs/api`, builds the Webpack playground, and runs `scripts/build-pages.js` to create stable Pages
routes at `/`, `/api/`, and `/playground/`. It uses
`https://chengchuu.github.io/vue-screenfull/api/` as its TypeDoc hosted base URL and
`./images/logo-dark-circle-transparent-32x32.png` as the favicon. Keep the hosted URL aligned with
the API route below the matching `homepage` field in `package.json`, and keep the Pages workflow
artifact path at `docs`. Generated docs and playground assets are output, not hand-maintained source.

SEO source files live under `site`, shared public URLs and descriptions live in
`scripts/site-config.js`, and `scripts/build-pages.js` copies static files and adds deterministic
metadata to TypeDoc HTML. Keep root, API, and playground titles, descriptions, canonicals, Open
Graph data, JSON-LD, `robots.txt`, and `sitemap.xml` synchronized. `npm run docs` runs
`npm run seo:validate` and `npm run pwa:validate`; do not bypass those validations or edit generated
`docs` targets manually.

The website PWA is scoped to `/vue-screenfull/`. Keep all Workbox packages on the same v7 release
and in `devDependencies`. Webpack bundles the TypeScript worker and `injectManifest` runs only after
the homepage, playground, and TypeDoc tree are assembled. Documents, scripts, and styles are
bounded network-first; local images and fonts are bounded cache-first. Do not unconditionally call
`skipWaiting()`: page-side `workbox-window` controls send `SKIP_WAITING` only after user approval.
A generated `site-version.json` fingerprints deployable Pages content so meaningful site changes
produce a waiting worker without precaching unversioned bundles. Normal `npm run dev` must keep
production worker registration disabled.

The public pages share `site/theme.css` and the Webpack entry `site/theme-entry.ts`, which bundles
`site/theme.ts` to the generated `assets/theme.js`. Theme preference values are `system`, `light`,
and `dark`, stored under `vue-screenfull-theme`; Mazey resolves and persists the preference while
project code owns DOM attributes, controls, theme-color metadata, TypeDoc synchronization, and
navigation behavior. Project-owned controls are synchronized two-state light/dark buttons, while
TypeDoc retains its native three-state `OS`/`Light`/`Dark` Settings selector. Keep the synchronous
head-loaded theme bundle and its metadata synchronized across the root template, playground
template, and API transformation so it can apply the initial theme before CSS paints. Mobile
navigation must remain progressively enhanced, keyboard operable, and usable without hiding links
when JavaScript fails.

README changes to browser support must use runtime feature-detection language and distinguish tested
platforms from documented targets. Do not claim that CSS fallback hides browser/OS UI or that
fullscreen is guaranteed merely because `isEnabled` is true. Preserve iframe permission, user
activation, mobile/WebView, SSR/Nuxt, accessibility, and `screenfull` migration guidance.

## Git Hooks And Formatting

Husky hooks live in `.husky/pre-commit` and `.husky/commit-msg`. Keep them executable and start them
with `#!/usr/bin/env sh`. This project uses Husky 9, so do not add the deprecated `husky.sh`
bootstrap lines that will fail in Husky 10.

The pre-commit hook runs lint-staged. The commit-message hook runs commitlint with the conventional
configuration in `commitlint.config.js`. Preserve these checks when changing hook commands.

Follow the existing Prettier and ESLint configuration. Keep comments sparse and useful. Prefer
small, reversible changes over broad cleanup unrelated to the request.

## Publishing And CI

The npm publishing workflow is `.github/workflows/publish-npm.yml`. It tests pull requests to main
and release branches, but publishes only from pushes to `release/v*` branches. It validates the
version against existing tags and npm before publishing, temporarily scopes the package to
`@${{ github.repository_owner }}/vue-screenfull`, restores modified files, and creates a version
tag.

- Keep `contents: write` for pushing release tags.
- Keep `packages: write` for GitHub Packages publishing.
- Use `github.repository_owner` for the package scope; `github.actor` may be a bot or contributor.
- Keep `PROJECT_NAME` synchronized with the normal package name.
- Do not expose registry tokens in logs or committed configuration.
- Do not publish, push tags, or trigger releases unless the user explicitly requests it.

The Pages workflow is `.github/workflows/pages.yml`. It deploys on pushes to `main` and
`release/v*`, plus manual `workflow_dispatch` runs. It uses Node.js 22, installs dependencies with
`npm install`, builds the complete site with `npm run docs`, uploads `docs`, and deploys through the
`github-pages` environment.

- Preserve the checked-in action majors: `actions/checkout@v7`, `actions/setup-node@v6`,
  `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and
  `actions/deploy-pages@v5`. Verify official stable releases before changing them.
- Keep its explicit permissions: `contents: read`, `pages: write`, and `id-token: write`.
- Keep the deployment step id as `deployment`; the environment URL reads
  `steps.deployment.outputs.page_url`.
- Keep Pages runs in the `pages` concurrency group with `cancel-in-progress: false` so an active
  deployment is not cancelled by a newer run.
- Keep the uploaded artifact path synchronized with the TypeDoc output directory.

## Package Rename Helper

`scripts/change-package-name.js` must:

- require a new-name argument;
- update only the `name` field in `package.json`;
- preserve two-space JSON formatting and the trailing newline;
- remain CommonJS-compatible.

Do not copy package-specific source code, repository URLs, or API names into this project during a
rename. A broader rename requires checking `package.json`, Rollup output naming, source metadata,
README links, workflows, and tests together.

## Change Discipline

Work with existing user changes and do not revert unrelated modifications. Avoid destructive Git
commands. Do not add dependencies, alter package formats, change the public API, or modify release
behavior as incidental cleanup.

Before finishing, review `git diff`, report the checks that ran, and clearly state any verification
that could not be completed.
