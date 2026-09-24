# Browser testing strategy and manual matrix

Automated unit tests cover property mapping, state, errors, cleanup, targets, Vue integration, and
fallback. Real-browser smoke tests should load `/playground/`, verify capability diagnostics, and
exercise a request from a genuine click. Native fullscreen is not made a hard headless-CI assertion:
Chromium, Firefox, and WebKit automation can reject it when user activation or the host display is
unavailable.

Record the date, browser/OS version, native availability, page/element/video targets, change event,
Escape/visible-button exit, browser UI, iframe result, fallback result, and limitation for each row.
An unchecked row is a documented target, not a tested claim.

| Environment       | Native | Element | Events/exit | Fallback | Last verified / notes                                         |
| ----------------- | ------ | ------- | ----------- | -------- | ------------------------------------------------------------- |
| Windows + Chrome  | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| Windows + Edge    | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| Windows + Firefox | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| macOS + Safari    | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| macOS + Chrome    | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| macOS + Firefox   | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| Android + Chrome  | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| Android + Firefox | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| Samsung Internet  | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| iPadOS + Safari   | ☐      | ☐       | ☐           | ☐        | Not manually verified                                         |
| iPhone + Safari   | ☐      | ☐       | ☐           | ☐        | Expect arbitrary-element restrictions; verify current release |
| iPhone + Chrome   | ☐      | ☐       | ☐           | ☐        | Video-wrapper exit not manually verified                      |
| Android WebView   | ☐      | ☐       | ☐           | ☐        | Host settings affect support                                  |
| iOS WKWebView     | ☐      | ☐       | ☐           | ☐        | Host settings and iOS release affect support                  |

For iframe checks, test both an allowed iframe (`allow="fullscreen" allowfullscreen`) and one without
permission. Confirm errors are visible, focus returns after library-driven exit, fallback restores
inline styles/body scroll, navigation and app switching do not leave stale state, and an accessible
exit remains keyboard/touch reachable.

## iPhone Chrome video-wrapper check

This check requires a physical iPhone; desktop emulation and jsdom do not reproduce WebKit's native
video and arbitrary-element fullscreen behavior reliably.

1. Open `/playground/` in Chrome on iPhone and scroll to **Video target**.
2. Record the iOS and Chrome versions, then tap **View video fullscreen**.
3. Record **Last result mode**, **Status**, **Is fallback**, **Is fullscreen**, **Controller fullscreen
   element**, and **Document fullscreen element** from Diagnostics.
4. Confirm **Exit video fullscreen** remains visible and touch-accessible in portrait and landscape,
   then use it to exit.
5. Confirm focus returns to **View video fullscreen**, the wrapper's fallback styles are removed, body
   scrolling is restored, and the page, element, and image examples still work.

If the request reports `fallback`, the controller element should be the video wrapper and the document
fullscreen element should be `none`. If it reports `native`, record both element fields and investigate
WebKit-specific behavior separately before changing the shared controller.

## Responsive playground controls

Test `/playground/` at 320, 375, 390, 430, 480, 481, and 768 CSS pixels in both light and dark
themes. At each width:

1. Open and close the mobile navigation where it is available; confirm **Menu** keeps its compact
   dimensions.
2. Confirm the page, element, image, and video action buttons remain full-width through 480 pixels and
   return to their wider-layout sizing at 481 pixels.
3. Remove `hidden` from `[data-pwa-update]` in developer tools. Confirm the message wraps normally,
   **Update now** remains compact, and the notice stays within the viewport.
4. Check portrait layout and confirm
   `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
