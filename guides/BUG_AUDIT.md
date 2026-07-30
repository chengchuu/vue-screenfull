# vue-screenfull Bug and Reliability Audit

## Executive Summary

The repository was audited across runtime behavior, Vue integration, SSR, Fullscreen API compatibility,
CSS fallback, declarations, packaging, playground output, documentation, tests, and GitHub Actions.
No Critical issue was confirmed. Six High issues were confirmed and fixed:

1. Explicit `null` and null-valued refs fullscreened the page root.
2. Two CSS fallback controllers could leave body scrolling permanently locked.
3. Native Node ESM returned the CommonJS namespace as the default export, breaking plugin installation.
4. The renderless component ignored a target passed through its typed slot API.
5. A throwing consumer callback could strand a controller in `pending` forever.
6. Every push to `main` attempted a release, even when the version/tag already existed.

Focused Medium fixes were also applied for native target switching, old WebKit mapping, inline-style
priority/class restoration, production playground output, visible exit controls, diagnostics, stale
Pages assets, and CI validation. The remaining open findings are primarily lifecycle ergonomics,
error classification, fallback accessibility/mobile hardening, directive observability, type-surface
drift, and release reproducibility. Existing automated tests are not evidence of real native fullscreen
support across the documented OS/browser matrix; that matrix remains unverified.

## Validation Commands

| Command                                       | Result                       | Notes                                                                                                                                                                    |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm install`                                 | Pass                         | Completed locally; no runtime dependency was added.                                                                                                                      |
| `npm run typecheck`                           | Pass                         | Strict source and compile-time public API tests pass.                                                                                                                    |
| `npm run lint`                                | Pass                         | Source, scripts, tests, examples, and global types pass ESLint.                                                                                                          |
| `npm run format:check`                        | Pass                         | All tracked source files pass Prettier.                                                                                                                                  |
| `npm run test`                                | Pass                         | 25 tests in 2 suites pass after fixes.                                                                                                                                   |
| `npm run test:coverage`                       | Pass                         | Final audit run reported 85.64% statements, 73.76% branches, 78.75% functions, and 88.23% lines across 25 passing tests. Coverage is informational, not a support claim. |
| `npm run build`                               | Pass                         | CJS, bundler ESM, native Node ESM, IIFE, source maps, and declarations generated from a clean `lib` build.                                                               |
| `npm run docs`                                | Pass                         | TypeDoc plus a 67.5 KiB minified production playground built under `/api/` and `/playground/`.                                                                           |
| `npm run preview`                             | Pass                         | Typecheck, lint, build, and tests pass together.                                                                                                                         |
| `npm pack --dry-run`                          | Pass after environment retry | The first sandboxed attempt failed with `EPERM` in the user npm cache; the required escalated retry passed. Final artifact: 15 files, 85.5 KiB packed.                   |
| `node --check scripts/change-package-name.js` | Pass                         | Rename helper parses without mutation.                                                                                                                                   |
| `node --check scripts/build-pages.js`         | Pass                         | Pages assembly script parses.                                                                                                                                            |
| Strict temporary consumer                     | Pass after fix               | Root types with `skipLibCheck: false`, ESM, CJS, and SSR state passed against the exact tarball.                                                                         |
| Narrow Rollup consumer                        | Pass                         | A narrow named-import second pass removed unused controller, component, and fallback code.                                                                               |
| Browser IIFE smoke test                       | Pass                         | IIFE exposed `VUE_SCREENFULL` and a callable default plugin with Vue external.                                                                                           |
| Source-map inspection                         | Pass                         | CJS, ESM, and IIFE maps parsed and included matching `sources`/`sourcesContent`.                                                                                         |
| Generated Pages browser test                  | Pass                         | Root routes, relative playground asset, responsive 390×844 layout, visible exits, invalid-target alert, and no horizontal overflow verified in the in-app browser.       |

## Findings Summary

| ID      | Severity | Area                  | Title                                                                | Status |
| ------- | -------- | --------------------- | -------------------------------------------------------------------- | ------ |
| BUG-001 | High     | Runtime               | Explicit null target fullscreened the page                           | Fixed  |
| BUG-002 | High     | Fallback              | Concurrent CSS fallbacks leaked body scroll state                    | Fixed  |
| BUG-003 | High     | Packaging             | Native Node ESM default plugin export was broken                     | Fixed  |
| BUG-004 | High     | Vue                   | Renderless component ignored explicit slot targets                   | Fixed  |
| BUG-005 | High     | Runtime               | Throwing listeners stranded transition state                         | Fixed  |
| BUG-006 | High     | CI                    | Pushes to main attempted unsafe duplicate releases                   | Fixed  |
| BUG-007 | Medium   | Browser Compatibility | Native target switching exited before requesting                     | Fixed  |
| BUG-008 | Medium   | Fallback              | Important styles and existing fallback class were not preserved      | Fixed  |
| BUG-009 | Medium   | Browser Compatibility | Old WebKit API family was not detected                               | Fixed  |
| BUG-010 | Medium   | Playground            | Pages used a development bundle and lacked target-local exits        | Fixed  |
| BUG-011 | Medium   | Vue                   | Composable outside an active scope cannot release listeners          | Open   |
| BUG-012 | Medium   | Vue                   | Component behavior options are snapshots, not reactive props         | Open   |
| BUG-013 | Medium   | Browser Compatibility | Error categorization relies on message text and weak frame detection | Open   |
| BUG-014 | Medium   | Accessibility         | CSS fallback leaves background content keyboard-accessible           | Open   |
| BUG-015 | Medium   | Vue                   | Directive discards structured action failures                        | Open   |
| BUG-016 | Medium   | Types                 | Target-bound and component helper types drift from runtime props     | Open   |
| BUG-017 | Medium   | CI                    | Release remains non-atomic and dependency installation is unpinned   | Open   |
| BUG-018 | Low      | Runtime               | Unsupported browser controller initially reports `idle`              | Open   |

## Detailed Findings

### BUG-001: Explicit null target fullscreened the page

**Severity:** High  
**Area:** Runtime  
**Confidence:** High

#### Location

- `src/core/target.ts:8-11`
- `src/composables/useScreenfull.ts:66-76`
- Related directive and component target paths

#### Current Behavior

Fixed. Only omitted/explicit `undefined` defaults to `document.documentElement`. Explicit `null`, a
null Vue ref, an unmatched selector, and an invalid component ref resolve to `null` and produce
`INVALID_TARGET`.

#### Expected Behavior

The page root default must apply only when no target is supplied. An explicit unresolved target must
never trigger a broader fullscreen action.

#### Reproduction

Before the fix:

```js
resolveScreenfullTarget(null, document) === document.documentElement; // true
```

#### Evidence

The focused pre-fix Node/jsdom reproduction printed `explicitNullIsRoot true`. Regression coverage now
checks direct null, null refs, composable results, and directive behavior.

#### Root Cause

The resolver used one `value == null` branch for both omitted `undefined` and explicit/unwrapped
`null`.

#### Impact

An early template-ref click, invalid directive binding, or explicit null could fullscreen the entire
page. This is a surprising and potentially difficult-to-exit expansion of scope.

#### Proposed Fix

Implemented: distinguish the original `undefined` argument before unwrapping; treat all other nullish
resolved values as invalid.

#### Regression Test

Tests assert `resolveScreenfullTarget(null/ref(null)) === null`, `request(null)` returns
`INVALID_TARGET`, and no native request is invoked.

#### Compatibility Notes

Applies uniformly to Vue refs, SSR hydration timing, directives, and all browsers.

---

### BUG-002: Concurrent CSS fallbacks leaked body scroll state

**Severity:** High  
**Area:** Fallback  
**Confidence:** High

#### Location

- `src/core/fallback.ts:30-54`
- `src/core/fallback.ts:105-135`

#### Current Behavior

Fixed. A `WeakMap<Document, CssFallback>` permits one built-in CSS fallback per document. A second
controller returns `FALLBACK_FAILED` without modifying its target or body state. Ownership is removed
on exit and exceptional setup cleanup.

#### Expected Behavior

Fallback controllers must not overwrite each other's body overflow snapshots or leave global styles
behind.

#### Reproduction

Before the fix, two controllers could enter successfully. Exiting the first restored `""`; exiting the
second restored its captured value `"hidden"`, permanently locking body scroll.

#### Evidence

The pre-fix reproduction printed:

```text
bothFallback true true body hidden
afterFirstExit
afterSecondExit "hidden"
```

#### Root Cause

Fallback ownership and body-style snapshots were controller-local even though body overflow is
document-global state.

#### Impact

Multiple widgets, directive instances, or applications in one document could leave the page
unscrollable after all fallback sessions ended.

#### Proposed Fix

Implemented: serialize the built-in CSS fallback per document and guarantee registry cleanup.

#### Regression Test

The second fallback is rejected, its target remains untouched, and body overflow is empty after the
first exits.

#### Compatibility Notes

The registry is document-scoped and weakly held. Custom fallback handlers remain application-owned
and are not globally serialized.

---

### BUG-003: Native Node ESM default plugin export was broken

**Severity:** High  
**Area:** Packaging  
**Confidence:** High

#### Location

- `package.json:5-19`
- `scripts/rollup.config.mjs:107-130`

#### Current Behavior

Fixed. Conditional exports route native ESM to `lib/index.mjs`, CommonJS to `lib/index.cjs.js`, and
types to `lib/index.d.ts`. Existing documented bundle subpaths remain exported.

#### Expected Behavior

Both of these must expose a callable plugin:

```js
import VueScreenfull from "vue-screenfull";
const VueScreenfull = require("vue-screenfull").default;
```

#### Reproduction

The initial exact tarball returned `typeof VueScreenfull.install === "undefined"` from native Node
ESM while named exports happened to work through CommonJS static analysis.

#### Evidence

Pre-fix clean-consumer output began `undefined true true function`. Final output begins
`function true true function`; CommonJS prints `function function`.

#### Root Cause

Node ignores the non-standard `module` field and loaded `main` as CommonJS. Native ESM default import
therefore received the entire CommonJS namespace rather than its `default` property. The existing
`.esm.js` cannot be used as Node ESM while the package defaults to CommonJS.

#### Impact

Native Node ESM, SSR tools following Node conditions, and tests using the documented default plugin
could fail at `.use(VueScreenfull)`.

#### Proposed Fix

Implemented: emit a real `.mjs` entry and add explicit conditional exports without removing existing
outputs.

#### Regression Test

The strict clean consumer verifies root declarations, native ESM, CommonJS, SSR controller state,
and a narrow second bundle against the exact packed tarball.

#### Compatibility Notes

Legacy `main`, `module`, `types`, CDN fields, and required bundle filenames are preserved. The extra
ESM artifact increases the tarball size because it duplicates the bundler ESM payload.

---

### BUG-004: Renderless component ignored explicit slot targets

**Severity:** High  
**Area:** Vue  
**Confidence:** High

#### Location

- `src/components/Screenfull.ts:58-77`
- `src/typing.ts:146-166`

#### Current Behavior

Fixed. Slot `request(target, options)` and `toggle(target, options)` honor an explicit target. When
the slot omits the target, the component's `target` prop is used.

#### Expected Behavior

The typed `ScreenfullSlotProps` contract must match runtime behavior and support both a target prop
and a target supplied by slot UI.

#### Reproduction

Before the fix, the wrapper accepted `_target` but always passed `props.target`. Without a prop,
`screenfull.request(target)` fullscreened the document root.

#### Evidence

The implementation contradicted its exported `UseScreenfullReturn` slot type. The regression mounts
the renderless component, calls the slot action with a section, and verifies that section—not the
document root—receives fallback styles.

#### Root Cause

Target binding was implemented as unconditional argument replacement rather than a default.

#### Impact

Typed consumer code could fullscreen the wrong element, including the whole page.

#### Proposed Fix

Implemented: select `props.target` only when the slot argument is `undefined`; preserve explicit null
as invalid.

#### Regression Test

`renderless component honors an explicit slot action target`.

#### Compatibility Notes

Existing no-argument component usage is unchanged.

---

### BUG-005: Throwing listeners stranded transition state

**Severity:** High  
**Area:** Runtime  
**Confidence:** High

#### Location

- `src/core/controller.ts:64-108`
- `src/composables/useScreenfull.ts:54-69`

#### Current Behavior

Fixed. Options callbacks and controller listeners are invoked independently under exception guards.
Failures are logged, later listeners still run, and actions retain structured results. The composable's
local invalid-target callback path uses the same isolation policy.

#### Expected Behavior

Consumer callbacks must not corrupt controller internals, block other listeners, or turn a structured
result into a rejected promise.

#### Reproduction

Before the fix, `onChange` ran after `pending = true` but before the request `try/finally`. A thrown
callback escaped `request()` and prevented `pending` from ever being reset.

#### Evidence

The regression supplies throwing option and event listeners, confirms a later listener runs, request
and exit both resolve successfully, and the controller reaches `fullscreen` rather than remaining
`requesting`.

#### Root Cause

Synchronous consumer code executed inside state-machine critical sections without isolation.

#### Impact

One application callback could permanently make all later request/exit/toggle calls return
`REQUEST_IN_PROGRESS`.

#### Proposed Fix

Implemented: use a typed `notify()` boundary for every controller callback/listener and guard the
composable-only error callback.

#### Regression Test

Tests cover throwing transition listeners and throwing `onError` during invalid target resolution.

#### Compatibility Notes

Listener failures are developer errors, not fullscreen failures, so they are logged rather than
stored as `ScreenfullError`.

---

### BUG-006: Pushes to main attempted unsafe duplicate releases

**Severity:** High  
**Area:** CI  
**Confidence:** High

#### Location

- `.github/workflows/publish-npm.yml:10-20`
- `.github/workflows/publish-npm.yml:48-77`

#### Current Behavior

Fixed. Pull requests to main/release branches run package validation. Publishing occurs only on
`release/v*` pushes. The publish job fetches tags and rejects an existing git tag or npm version
before building/publishing. Write permissions are scoped to the publish job.

#### Expected Behavior

Ordinary main-branch development must not attempt external publication, and duplicate versions must
fail before any registry mutation.

#### Reproduction

The previous workflow included `main` under `push` and gated publish only on
`github.event_name == 'push'`. The repository already has tag `v1.0.2`, matching `package.json`.

#### Evidence

`git tag --list v1.0.2` returned `v1.0.2`. A main push at the audited version would attempt
`npm publish` before failing on registry duplication or later tag creation.

#### Root Cause

Test and release triggers were coupled, with no preflight version guard.

#### Impact

Routine merges could perform unauthorized release attempts, consume credentials, produce noisy
failures, or partially publish when versions changed accidentally.

#### Proposed Fix

Implemented: release-branch-only publishing, full tag checkout, version preflight, least-privilege
permissions, and preview/format/package checks in CI.

#### Regression Test

Workflow is statically reviewed and parsed by Prettier; it was not triggered. A future CI fixture
could test release-condition expressions with `actionlint`.

#### Compatibility Notes

Manual `workflow_dispatch` remains validation-only because the publish job still requires a push.

---

### BUG-007: Native target switching exited before requesting

**Severity:** Medium  
**Area:** Browser Compatibility  
**Confidence:** Medium

#### Location

- `src/core/controller.ts:279-286`

#### Current Behavior

Fixed. A native fullscreen request for a different target calls the target's request method directly.
Only an active CSS fallback is exited first.

#### Expected Behavior

Switching native targets should follow the Fullscreen API request path without an unnecessary exit,
visual flicker, or activation gap.

#### Reproduction

Previously, every different-target request awaited `exit()` before calling `requestFullscreen()`.

#### Evidence

The regression requests two elements and asserts `document.exitFullscreen` is not called. MDN states
that fullscreen requests require transient user activation, so adding an asynchronous exit creates
avoidable platform risk: <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen>.

#### Root Cause

Native and fallback switching shared the same exit-first branch.

#### Impact

Browsers with strict activation timing could deny the second request; all browsers could show a
visible exit/re-entry transition.

#### Proposed Fix

Implemented: exit first only for fallback mode.

#### Regression Test

`switches native targets without exiting fullscreen first`.

#### Compatibility Notes

Native event state remains authoritative after the second request.

---

### BUG-008: Important styles and existing fallback class were not preserved

**Severity:** Medium  
**Area:** Fallback  
**Confidence:** High

#### Location

- `src/core/fallback.ts:55-103`
- `src/core/fallback.ts:105-135`

#### Current Behavior

Fixed. Every changed CSS property stores value and priority, fallback declarations use `!important`,
body overflow priority is restored, a pre-existing fallback class is retained, and scroll restoration
occurs only when this fallback locked scrolling.

#### Expected Behavior

Fallback must override conflicting inline declarations while restoring the exact original value,
priority, class ownership, and body state.

#### Reproduction

The old code read camel-case style values and restored with assignment. It lost `!important` priority
and always removed the fallback class even if the consumer supplied it before entry.

#### Evidence

Regression coverage starts with `position: relative !important`, `overflow: clip !important`, and an
existing class, then verifies exact restoration.

#### Root Cause

CSS property priority and class ownership were not included in the snapshot.

#### Impact

Fallback could fail to cover the viewport or permanently alter consumer styling.

#### Proposed Fix

Implemented with property-level snapshots and owned-class tracking.

#### Regression Test

`preserves important styles and a pre-existing fallback class`.

#### Compatibility Notes

`100dvh` remains complemented by fixed top/right/bottom/left declarations for older viewport engines.

---

### BUG-009: Old WebKit API family was not detected

**Severity:** Medium  
**Area:** Browser Compatibility  
**Confidence:** High

#### Location

- `src/core/api-map.ts:12-28`
- `types/global.d.ts`

#### Current Behavior

Fixed. The compatibility map includes `webkitRequestFullScreen`, `webkitCancelFullScreen`, and
`webkitCurrentFullScreenElement` in addition to modern WebKit names.

#### Expected Behavior

The declared legacy compatibility layer should recognize a complete internally consistent API
family rather than only modern WebKit plus Mozilla/MS families.

#### Reproduction

An old-WebKit document exposing only the older names returned `null` from `detectFullscreenApi()`.

#### Evidence

The local MIT `screenfull` compatibility reference includes this separate method family. Parameterized
tests now cover standard, modern WebKit, and old WebKit mappings.

#### Root Cause

The old and new WebKit name families were treated as one generation.

#### Impact

Older embedded WebKit/Android environments targeted by the broad Babel browser configuration could
be reported unsupported despite exposing fullscreen.

#### Proposed Fix

Implemented as a separate candidate so method families are never mixed.

#### Regression Test

`detects the old-webkit Fullscreen API`.

#### Compatibility Notes

This does not add iPhone arbitrary-element fullscreen. Current iPhone limitations remain a platform
risk tracked by WebKit: <https://www2.webkit.org/show_bug.cgi?id=206854>.

---

### BUG-010: Pages used a development bundle and lacked target-local exits

**Severity:** Medium  
**Area:** Playground  
**Confidence:** High

#### Location

- `package.json:34-39`
- `scripts/webpack.config.dev.js`
- `scripts/build-pages.js`
- `examples/index.ts:67-90`

#### Current Behavior

Fixed. Pages uses `webpack --mode production`, explicit Vue compile-time flags, a clean playground
destination, accurate API-available diagnostics, and visible exit buttons inside element, image, and
video targets.

#### Expected Behavior

The deployed playground should be a warning-free production consumer with an exit control that
remains visible when only a target element is fullscreen.

#### Reproduction

The old docs build produced a 545 KiB development bundle and logged Vue's missing feature-flag
warning. The image and video fullscreen targets contained only request buttons; the global exit was
outside those native fullscreen elements.

#### Evidence

The final build is 67.5 KiB minified. Browser inspection found four visible exit labels, no horizontal
overflow at 390×844, a relative `index.js` asset, and an announced `INVALID_TARGET` error. The old
feature-flag log timestamp did not recur after rebuild; generated code no longer contains unresolved
Vue flag identifiers.

#### Root Cause

The docs script reused a development-only build and target cards did not include local exits.

#### Impact

Pages shipped unnecessary code/warnings, and keyboard/touch users could be forced to depend on
browser-specific Escape/gesture UI.

#### Proposed Fix

Implemented: separate production playground script, DefinePlugin flags, clean copy, local exits, and
correct capability diagnostic.

#### Regression Test

Production Webpack build plus rendered desktop/mobile browser checks.

#### Compatibility Notes

Native fullscreen itself was not automated because browsers gate it on genuine user activation.

---

### BUG-011: Composable outside an active scope cannot release listeners

**Severity:** Medium  
**Area:** Vue  
**Confidence:** High

#### Location

- `src/composables/useScreenfull.ts:24-27`
- `src/composables/useScreenfull.ts:91-97`

#### Current Behavior

`useScreenfull()` always creates a controller and document listeners. Cleanup is registered only when
`getCurrentScope()` is truthy, but `UseScreenfullReturn` exposes no `destroy()` method.

#### Expected Behavior

Calling a composable outside component/effect scope should either be rejected/documented, share a
managed singleton, or return an explicit disposal mechanism.

#### Reproduction

Call `useScreenfull()` in a long-lived module or plain function in a browser, then drop the returned
object. Document listeners retain its controller closures.

#### Evidence

The cleanup branch is conditional and the public return type contains only actions plus `clearError`.

#### Root Cause

Lifecycle ownership is assumed but not enforced by the API.

#### Impact

Non-component integrations can leak document listeners and controller state. Repeated calls amplify
the leak.

#### Proposed Fix

Add an explicit `stop()`/`destroy()` return method, or warn/throw outside active scope and direct
framework-light use to `createScreenfullController()`. This is a public API decision and was not
changed during the focused High fixes.

#### Regression Test

Create the composable without an effect scope, dispose through the selected API, and assert all
document listeners are removed.

#### Compatibility Notes

SSR creates no document listeners, so the leak is browser-only.

---

### BUG-012: Component behavior options are snapshots, not reactive props

**Severity:** Medium  
**Area:** Vue  
**Confidence:** High

#### Location

- `src/components/Screenfull.ts:43-57`

#### Current Behavior

`fallback`, `fallbackClass`, `lockScroll`, `restoreFocus`, `exitOnRouteChange`, and `debug` are copied
once during setup. Later prop changes do not reconfigure the existing controller.

#### Expected Behavior

Either component props should be reactive, or documentation/types should state that behavior options
are initialization-only.

#### Reproduction

Mount `<Screenfull :fallback="mode">`, change `mode` from `"none"` to `"css"`, then request in an
unsupported environment. The controller still uses the original mode.

#### Evidence

The options object contains plain current prop values and no watcher or controller recreation path.

#### Root Cause

Controller configuration is immutable, while Vue prop conventions imply reactive updates.

#### Impact

Feature flags, route-controlled options, and responsive fallback changes can silently be ignored.

#### Proposed Fix

Document initialization-only behavior or add a controlled reconfiguration/recreation path that exits
and cleans an active fallback safely before swapping controllers.

#### Regression Test

Mount, update each behavior prop, trigger an action, and assert the new option is used without
duplicate listeners.

#### Compatibility Notes

The `target` prop is read at action time and is already reactive.

---

### BUG-013: Error categorization relies on message text and weak frame detection

**Severity:** Medium  
**Area:** Browser Compatibility  
**Confidence:** Medium

#### Location

- `src/core/errors.ts:28-57`

#### Current Behavior

Error codes are inferred from English substrings such as `activation`, `gesture`, `permission`,
`denied`, and `security`. Embedded context is inferred from `window.frameElement`, which can be null
for cross-origin cases.

#### Expected Behavior

Classification should first use stable exception names/context (`NotAllowedError`, `SecurityError`,
document policy, `navigator.userActivation` when available, and `window.self !== window.top`) and use
message text only as a final hint.

#### Reproduction

Different browsers can report user-activation and policy failures through the same exception name
with localized or changed messages. A cross-origin child may be embedded while `frameElement` is not
usable.

#### Evidence

The implementation does not inspect `DOMException.name` separately and all classification branches
are lowercased-message checks. MDN documents multiple `TypeError` causes for request failure, including
inactive document, detached target, and Permissions Policy:
<https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen>.

#### Root Cause

Browser failure modes were flattened into human-readable message heuristics.

#### Impact

Users can receive `PERMISSION_DENIED` instead of `USER_ACTIVATION_REQUIRED` or
`IFRAME_PERMISSION_REQUIRED`, reducing remediation value.

#### Proposed Fix

Introduce a deterministic decision table using exception name, target/document state, embedded
identity, Permissions API/Policy signals where available, and user activation. Preserve the original
cause and fall back to `REQUEST_FAILED` when ambiguous.

#### Regression Test

Table-driven tests for Chrome-, Firefox-, Safari-, iframe-, localized-message-, and WebView-shaped
DOMExceptions without assuming one English message.

#### Compatibility Notes

The library cannot override the parent policy. MDN notes that `allowfullscreen` is legacy shorthand
for `allow="fullscreen *"`: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe>.

---

### BUG-014: CSS fallback leaves background content keyboard-accessible

**Severity:** Medium  
**Area:** Accessibility  
**Confidence:** High

#### Location

- `src/core/fallback.ts:71-93`

#### Current Behavior

The target visually overlays the viewport, but siblings and other background controls remain in the
tab order and accessibility tree. On iOS-style engines, body `overflow: hidden` alone may also be
insufficient to prevent all background scrolling.

#### Expected Behavior

Pseudo-fullscreen should keep focus navigation within visible content without creating an inescapable
trap, and background scroll/focus behavior should be restored exactly.

#### Reproduction

Place focusable controls before and after a fallback target, enter fallback, and press Tab repeatedly.
Focus can move to visually covered controls.

#### Evidence

The fallback changes only target styles/class and body overflow; it does not coordinate `inert`,
`aria-hidden`, focus containment, `visualViewport`, or sibling state.

#### Root Cause

The fallback is visual/scroll-only rather than a document-level accessibility mode.

#### Impact

Keyboard and assistive-technology users can interact with invisible background content. Mobile
browser chrome, keyboard appearance, and viewport resizing may expose additional scroll gaps.

#### Proposed Fix

Offer an opt-in accessibility coordinator that snapshots/restores sibling `inert`/ARIA state and
keeps focus within the fallback while preserving a visible exit. Add `visualViewport` resize handling
only where it materially improves sizing, with complete cleanup.

#### Regression Test

Browser test with focusable siblings, forward/reverse Tab, visible exit, detached target, Escape,
unmount, and exact inert/ARIA restoration.

#### Compatibility Notes

Do not claim this fallback hides browser/OS UI. iPhone arbitrary-element native fullscreen remains an
open WebKit limitation as of the audited 2026 issue activity:
<https://www2.webkit.org/show_bug.cgi?id=206854>.

---

### BUG-015: Directive discards structured action failures

**Severity:** Medium  
**Area:** Vue  
**Confidence:** High

#### Location

- `src/directives/screenfull.ts:41-55`

#### Current Behavior

The click handler starts `request`, `exit`, or `toggle` with `void` and exposes no callback, DOM
event, or reactive error channel. Invalid selectors no longer fullscreen the page, but consumers
cannot observe the resulting `INVALID_TARGET` through the directive.

#### Expected Behavior

Directive users should have an understandable way to receive the same structured result/error model
as composable and component users.

#### Reproduction

Use `v-screenfull:request="'#missing'"`; the native request is correctly skipped, but application UI
receives no error notification.

#### Evidence

Every action promise is explicitly discarded and the controller is private in a module WeakMap.

#### Root Cause

The directive value schema includes only target/action/options.

#### Impact

Directive-only applications can fail silently and cannot provide accessible error feedback.

#### Proposed Fix

Extend the object value with an optional `onResult`/`onError` callback, or dispatch a documented
bubbling custom event from the directive element. Keep the current simple syntax intact.

#### Regression Test

Mount/update/unmount directive tests for success, invalid target, native rejection, callback/event
payload, and listener cleanup.

#### Compatibility Notes

Avoid throwing from the click handler; retain the structured promise result model.

---

### BUG-016: Target-bound and component helper types drift from runtime props

**Severity:** Medium  
**Area:** Types  
**Confidence:** High

#### Location

- `src/typing.ts:146-193`
- `src/composables/useScreenfull.ts:114-125`

#### Current Behavior

`useScreenfullTarget()` returns `UseScreenfullReturn`, so its bound `request`/`toggle` still appear to
accept a target argument even though runtime ignores that argument. `ScreenfullComponentProps`
extends all `ScreenfullOptions`, including `document` and callbacks not declared as runtime component
props.

#### Expected Behavior

Exported helper types should describe the actual bound method signatures and declared Vue props/events.

#### Reproduction

TypeScript accepts `useScreenfullTarget(target).request(otherTarget, options)`, but runtime always uses
the originally bound target. It also accepts a `document` member in `ScreenfullComponentProps`, while
the component will treat it as an undeclared fallthrough attribute.

#### Evidence

The wrapper parameters are named `_target` and discarded; the component runtime prop table does not
contain `document`.

#### Root Cause

General composable types were reused for convenience instead of modeling specialized APIs.

#### Impact

Consumers can write type-correct code whose target/options are ignored or whose documented helper
props do not configure the component.

#### Proposed Fix

Add `UseScreenfullTargetReturn` with `request(options?)` and `toggle(options?)`; define component props
from the actual runtime prop set and model event listeners separately. This is a public type/API
change and should be versioned and documented.

#### Regression Test

Negative type tests using `@ts-expect-error`, plus positive tests for bound options and component
emits/slot inference from the packed root declaration.

#### Compatibility Notes

Runtime compatibility wrappers may temporarily accept the old two-argument shape during a deprecation
window.

---

### BUG-017: Release remains non-atomic and dependency installation is unpinned

**Severity:** Medium  
**Area:** CI  
**Confidence:** High

#### Location

- `.github/workflows/publish-npm.yml:63-110`
- `.gitignore:41-44`

#### Current Behavior

The workflow now preflights versions and avoids main-branch publishing, but npm is published before
GitHub Packages and tagging. No lockfile is tracked; CI uses `npm install` against floating semver
ranges.

#### Expected Behavior

Release inputs should be reproducible, and maintainers should have a documented recovery path for
partial multi-registry publication.

#### Reproduction

If npm succeeds and GitHub Packages or tag push fails, npm cannot be rolled back as an atomic unit.
The next retry is blocked because the npm version now exists. Separately, two runs can resolve
different transitive dependencies.

#### Evidence

The workflow order is npm → GitHub Packages → tag. `git ls-files` reports no npm/pnpm lockfile and
the ignore rules exclude them.

#### Root Cause

Multi-registry release is modeled as sequential mutable steps without immutable dependency input or
a resume strategy.

#### Impact

Maintainers can end with inconsistent registries/tags or CI-only breakage after dependency updates.

#### Proposed Fix

Commit a supported lockfile and use `npm ci`; document/resume partial releases; consider creating a
signed release tag before registry jobs and publishing registries as independently retryable jobs
with explicit version checks.

#### Regression Test

Workflow lint plus a dry-run/reusable workflow fixture covering existing tag, existing npm version,
one-registry failure, and retry behavior.

#### Compatibility Notes

Registry publication cannot be made truly transactional; recovery semantics must be explicit.

---

### BUG-018: Unsupported browser controller initially reports idle

**Severity:** Low  
**Area:** Runtime  
**Confidence:** High

#### Location

- `src/core/controller.ts:31-44`

#### Current Behavior

With a browser `Document` but no detected Fullscreen API, `isEnabled` is false while initial status is
`idle`. Status becomes `unsupported` only after a failed request without fallback.

#### Expected Behavior

Initial status could be `unsupported` whenever no API exists and no fallback is active, or the current
lazy semantics should be stated explicitly.

#### Reproduction

Create a controller in jsdom without Fullscreen API methods and read `status` before invoking an action.

#### Evidence

Initialization distinguishes only document/no-document, not detected API availability.

#### Root Cause

Status represents operation history while `isEnabled` represents capability; their relationship is
not documented.

#### Impact

Diagnostics may show `isEnabled: false` with `status: idle`, which can confuse support UI.

#### Proposed Fix

Initialize to `unsupported` when `raw` is null, or document that `idle` means no operation attempted.

#### Regression Test

Browser-document/no-API initial-state test with and without CSS fallback configured.

#### Compatibility Notes

SSR already initializes to `unsupported`.

---

## Fragile Patterns

- Promise-returning native methods are awaited directly while temporary native event outcomes are
  ignored. A non-conforming WebView that emits `fullscreenerror` but never settles its promise can
  leave the caller pending even though temporary listeners clean themselves up.
- The legacy-void transition timeout is fixed at three seconds. Slow embedded engines may produce a
  false timeout; no option currently tunes it.
- A controller with an active CSS fallback can observe another controller's later native fullscreen
  event. The built-in CSS fallback is serialized, but native/fallback cross-mode ownership is not
  coordinated across controllers.
- Custom fallback handlers are intentionally trusted. Their global-state coordination, accessibility,
  rollback, and idempotence cannot be guaranteed by this package.
- Focus restoration calls `focus()` after native/fallback exit. A consumer-overridden throwing focus
  method can turn an otherwise successful exit into `EXIT_FAILED` after state has already changed.
- `exitOnRouteChange` observes `popstate`, not every Vue Router navigation. The README correctly
  instructs router users to call `exit()` from application route hooks.
- The root Pages page has no local favicon, producing a harmless `/favicon.ico` 404 in the static
  server smoke test; the playground uses an external protocol-relative favicon.

## Missing Test Coverage

- Legacy `void` exit method and delayed/reordered exit events.
- Promise rejection followed by a later `fullscreenerror` event, proving one error emission.
- A promise that remains pending after `fullscreenerror` in a non-conforming WebView.
- `request()` immediately followed by `exit()`, rapid toggle storms, and exit/request ordering.
- Native fullscreen plus an already-active CSS fallback across separate controllers.
- Component prop updates, component emitted event counts, and component unmount during native pending.
- Directive `updated()` behavior and an observable directive error/result channel.
- Composable cleanup outside Vue scope (no disposal API currently exists).
- CSS fallback keyboard isolation, reverse tab order, detached active target, orientation, visual
  viewport resize, soft keyboard, and iOS background scrolling.
- Cross-origin iframe classification using a real embedded browser context.
- Firefox and MS prefixed families (mapping is present but tests currently cover standard/WebKit).
- A committed automated packed-consumer and tree-shaking CI fixture. These were run manually in a
  temporary strict consumer during this audit.
- GitHub Actions semantic linting and partial-release retry simulation.
- README code-block compilation as standalone Vue SFCs.

## Browser and OS Risk Matrix

| Environment       | Risk   | Evidence                                                                                                                           | Recommended Verification                                                                                                                                    |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows + Chrome  | Medium | Standard mapping/unit behavior only; no real native session.                                                                       | Genuine click request for page/element/video, Escape/UI exit, target switch, iframe denial, fallback cleanup.                                               |
| Windows + Edge    | Medium | Chromium family inference only; not manually tested.                                                                               | Repeat Chrome matrix plus managed-device Permissions Policy.                                                                                                |
| Windows + Firefox | Medium | Mozilla mapping is untested in current Jest suite.                                                                                 | Standard/prefixed detection as exposed, promise/event order, independent exit, iframe.                                                                      |
| macOS + Safari    | Medium | WebKit documents unprefixed fullscreen on macOS from Safari 16.4; no manual run here.                                              | Current stable Safari, user activation, target switch, Escape/gesture exit, fallback scroll/focus.                                                          |
| macOS + Chrome    | Medium | Standard mapping only.                                                                                                             | Native request/exit and multi-display/navigation UI behavior.                                                                                               |
| macOS + Firefox   | Medium | No real-browser evidence.                                                                                                          | Native event order, focus restoration, iframe policy.                                                                                                       |
| Android + Chrome  | Medium | Feature-detected design; no device evidence.                                                                                       | Address-bar resizing, orientation, soft keyboard, app switching, WebView differences.                                                                       |
| Android + Firefox | Medium | No device evidence.                                                                                                                | Native element/video behavior, Escape/back behavior, fallback viewport.                                                                                     |
| Samsung Internet  | High   | Chromium-derived assumptions only; no tested version.                                                                              | Device test for arbitrary elements, navigation UI, fallback and back/gesture exit.                                                                          |
| iPadOS + Safari   | Medium | WebKit states unprefixed Fullscreen API support from Safari 16.4: <https://webkit.org/blog/13966/webkit-features-in-safari-16-4/>. | Current iPadOS touch gesture exit, orientation, keyboard, iframe, fallback.                                                                                 |
| iPhone + Safari   | High   | WebKit's open issue still tracks missing arbitrary-element fullscreen in 2026: <https://www2.webkit.org/show_bug.cgi?id=206854>.   | Treat native arbitrary-element support as unavailable until feature detection proves otherwise; verify video-specific behavior and accessible CSS fallback. |
| Android WebView   | High   | Host settings and WebChromeClient behavior are outside library control.                                                            | Test representative host apps, permission callbacks, promise/event ordering, app pause/resume.                                                              |
| iOS WKWebView     | High   | Host configuration plus iPhone/iPad platform differences; no app-host test.                                                        | Test iPhone and iPad hosts separately, native video, arbitrary elements, keyboard detachment, fallback scroll.                                              |

The standard request API requires transient user activation and can reject for several policy/document
conditions even when capability detection succeeds. See
<https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen>.

## Packaging Assessment

- CJS, native ESM, bundler ESM, IIFE, declarations, and source maps build successfully.
- Vue remains a peer dependency and Rollup external; no undeclared Babel helper import was found.
- The exact packed artifact passes strict root declaration checking with `skipLibCheck: false`.
- `lib/index.d.ts` references `global.d.ts`, whose generated footer preserves external-module status.
- Pure annotations survive minification; the narrow second Rollup pass removes unused Vue layers.
- The IIFE requires global `Vue` and exposes `VUE_SCREENFULL`, matching README guidance.
- The package contains 15 intended files. The added `.mjs` entry and source map raise packed size from
  approximately 61.9 KiB to 85.5 KiB; this is the cost of preserving old filenames while providing
  correct native Node ESM.
- Remaining risks: no lockfile, no automated packed-consumer CI fixture, and exported legacy ESM
  subpath remains intended for bundlers rather than direct Node execution.

## Documentation Assessment

- Documented root exports match `src/index.ts`.
- Basic Composition API, target, component, directive, plugin, iframe, SSR/Nuxt, fallback, migration,
  and package-output guidance are present.
- Browser claims are cautious and feature-detection based. The manual matrix clearly marks every OS
  row unverified.
- CSS fallback is correctly described as pseudo-fullscreen and does not claim to hide browser/OS UI.
- The README now notes the additional native Node ESM entry while preserving required output names.
- Open documentation gaps: out-of-scope composable cleanup, initialization-only component options,
  target-bound method signature quirks, directive error observability, and background-focus limitations
  in CSS fallback.
- The live URL was not fetched from GitHub Pages during this audit; the generated artifact was tested
  locally at equivalent `/`, `/api/`, and `/playground/` routes.

## Recommended Fix Order

1. **Critical:** None confirmed.
2. **High:** Completed fixes for BUG-001 through BUG-006; keep their regressions mandatory in CI.
3. **Medium:** Address BUG-011 (lifecycle disposal), BUG-014 (fallback accessibility), BUG-013
   (error decision table), and BUG-015 (directive error channel) before broadening support claims.
4. **Low:** Resolve/document BUG-018 and the minor favicon/status inconsistencies.
5. **Test and documentation hardening:** Automate packed consumers/tree-shaking, add real iframe and
   transition-order browser tests, then execute and record the manual OS/device matrix.

## Checks Not Completed

- No native fullscreen session was executed in Chrome, Edge, Firefox, Safari, Samsung Internet, or
  physical mobile/WebView environments.
- No Windows, Android, iPadOS, iPhone, Android WebView, or WKWebView device was available.
- No cross-origin iframe host was created.
- No actual npm/GitHub Packages publish or tag push was attempted.
- GitHub Actions were inspected but not run; no `actionlint` dependency is installed.
- The public GitHub Pages deployment was not used as evidence; the generated artifact was served
  locally instead.
- Native fullscreen automation was intentionally not treated as reliable support evidence because
  the API requires transient user activation.

## Conclusion

The library now has a substantially safer baseline: explicit targets cannot broaden to the page,
fallback ownership cannot leak body locking, listener exceptions cannot corrupt transition state,
native Node ESM exports the plugin correctly, and routine main pushes no longer attempt releases.
Packaging, declarations, tree-shaking, SSR import, IIFE, and generated Pages behavior were verified
with concrete commands. The project should not yet claim verified cross-platform support: all real
OS/browser rows remain manual, and the open lifecycle, accessibility, error-normalization, directive,
and release-reproducibility findings should guide the next hardening cycle.
