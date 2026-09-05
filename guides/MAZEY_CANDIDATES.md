# Reusable Helper Candidates

The candidates below are ranked by demonstrated duplication, breadth of use, and the value of
centralizing edge-case handling. Node-only candidates should live behind a Node-specific entrypoint
so Mazey's browser bundle remains import-safe.

## 1. `listFilesRecursive`

- **Purpose:** Recursively enumerate files below a directory with optional filtering and stable
  ordering.
- **Why it is reusable:** The same traversal is implemented as `htmlFiles` and `artifactFiles` in
  `scripts/build-pages.js`, `findHtml` in `scripts/validate-seo.js`, and `filesIn` in
  `scripts/validate-pwa.js`. Static-site builders, validators, packagers, and code generators all
  need this operation.
- **Proposed generalized API:**

  ```ts
  interface ListFilesOptions {
    filter?: (file: string, relativePath: string) => boolean;
    followSymlinks?: boolean;
    sort?: boolean;
  }

  function listFilesRecursive(
    root: string,
    options?: ListFilesOptions,
  ): string[];
  ```

## 2. `fingerprintDirectory`

- **Purpose:** Produce a deterministic content fingerprint from relative file paths and file bytes.
- **Why it is reusable:** `fingerprintPages` already provides stable PWA versioning and correctly
  excludes self-generated artifacts and source maps. The same pattern applies to deployment
  manifests, cache busting, release artifacts, and incremental build checks.
- **Proposed generalized API:**

  ```ts
  interface FingerprintDirectoryOptions {
    algorithm?: "sha256" | "sha384" | "sha512";
    length?: number;
    include?: (file: string, relativePath: string) => boolean;
    exclude?: (file: string, relativePath: string) => boolean;
  }

  function fingerprintDirectory(
    root: string,
    options?: FingerprintDirectoryOptions,
  ): string;
  ```

## 3. `runEventTransition`

- **Purpose:** Invoke a Web API operation that may return either a Promise or `void`, then settle
  from success/error events with timeout and listener cleanup.
- **Why it is reusable:** The controller's `waitForNativeTransition` and `runNativeTransition`
  handle a difficult compatibility pattern: listeners must be registered before invocation, legacy
  methods may return `void`, and every outcome must remove listeners and timers. The same primitive
  is useful for fullscreen, pointer lock, media, animation, and other event-backed browser APIs.
- **Proposed generalized API:**

  ```ts
  interface EventTransitionOptions {
    target: EventTarget;
    invoke: () => void | PromiseLike<void>;
    successEvent: string;
    errorEvent?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  }

  function runEventTransition(
    options: EventTransitionOptions,
  ): Promise<Event | void>;
  ```

## 4. `applyTemporaryInlineStyles`

- **Purpose:** Apply temporary inline styles and an optional class, then restore the exact previous
  values and priorities through an idempotent cleanup function.
- **Why it is reusable:** `CssFallback` preserves values, `!important` priorities, pre-existing
  classes, scroll state, and rollback after partial failure. The style snapshot/restore core is
  useful for dialogs, drawers, previews, presentation modes, scroll locks, and temporary overlays.
- **Proposed generalized API:**

  ```ts
  interface TemporaryStyleOptions {
    priority?: string;
    className?: string;
  }

  function applyTemporaryInlineStyles(
    element: HTMLElement,
    styles: Readonly<Record<string, string>>,
    options?: TemporaryStyleOptions,
  ): () => void;
  ```

  Document-level exclusivity, focus restoration, and body scroll policy should remain with the
  caller rather than being built into this low-level helper.

## 5. `getPngDimensions`

- **Purpose:** Validate a PNG signature and read width and height from its IHDR header.
- **Why it is reusable:** `pngDimensions` is already independently tested and used to validate PWA
  icons. A byte-oriented helper would also support upload validation, image pipelines, CLIs, and
  browser file checks without coupling the parser to Node file I/O.
- **Proposed generalized API:**

  ```ts
  interface ImageDimensions {
    width: number;
    height: number;
  }

  function getPngDimensions(data: Uint8Array): ImageDimensions;
  ```

## Existing overlaps and adoption boundaries

| Local functionality                  | Existing Mazey API                                                        | Adoption status  | Project boundary                                                             |
| ------------------------------------ | ------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Generic target resolution            | `resolveElementTarget`                                                    | Already adopted  | Keep the Vue unwrap adapter and fullscreen-specific default locally.         |
| Theme preference and media listeners | `resolveThemePreference`, `setThemePreference`, `listenMediaQueryChanges` | Already adopted  | Keep DOM attributes, controls, metadata, and TypeDoc synchronization local.  |
| Standalone presentation detection    | `isStandalonePWA`                                                         | Newly adopted    | Inject the current browser objects and keep install-control behavior local.  |
| Safe PWA environment checks          | `isSafePWAEnv`                                                            | Newly adopted    | Keep project enablement, Workbox construction, worker URL, and scope local.  |
| PWA status announcements             | None                                                                      | Local helper     | Share the small status-region update without adding a public Mazey API.      |
| Fullscreen behavior                  | None                                                                      | Project-specific | Keep API detection, error taxonomy, transitions, and fallback orchestration. |

Workbox-specific waiting, activation, cross-tab update, and reload behavior remains project-owned;
it does not match Mazey's native service-worker update watcher closely enough for direct reuse.
