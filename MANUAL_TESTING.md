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
| Android WebView   | ☐      | ☐       | ☐           | ☐        | Host settings affect support                                  |
| iOS WKWebView     | ☐      | ☐       | ☐           | ☐        | Host settings and iOS release affect support                  |

For iframe checks, test both an allowed iframe (`allow="fullscreen" allowfullscreen`) and one without
permission. Confirm errors are visible, focus returns after library-driven exit, fallback restores
inline styles/body scroll, navigation and app switching do not leave stale state, and an accessible
exit remains keyboard/touch reachable.
