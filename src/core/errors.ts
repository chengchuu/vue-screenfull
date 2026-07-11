import type { ScreenfullError, ScreenfullErrorCode } from "../typing";

const suggestions: Partial<Record<ScreenfullErrorCode, string>> = {
  NOT_SUPPORTED:
    "Enable the CSS fallback or use a browser with the Fullscreen API.",
  NOT_IN_BROWSER:
    "Call fullscreen actions after the component mounts in a browser.",
  USER_ACTIVATION_REQUIRED:
    "Call request() directly from a click, key, or touch handler.",
  PERMISSION_DENIED:
    "Check browser settings and the document Permissions Policy.",
  IFRAME_PERMISSION_REQUIRED:
    'Add allow="fullscreen" and allowfullscreen to the embedding iframe.',
  TARGET_NOT_CONNECTED:
    "Attach the target element to the current document before requesting fullscreen.",
  REQUEST_IN_PROGRESS: "Wait for the current fullscreen transition to finish.",
};

export function makeError(
  code: ScreenfullErrorCode,
  message: string,
  cause?: unknown,
  recoverable = true,
): ScreenfullError {
  return { code, message, cause, recoverable, suggestion: suggestions[code] };
}

export function normalizeError(
  cause: unknown,
  operation: "request" | "exit" | "fallback",
  doc?: Document,
): ScreenfullError {
  const text =
    cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
  const lower = text.toLowerCase();
  let code: ScreenfullErrorCode =
    operation === "exit"
      ? "EXIT_FAILED"
      : operation === "fallback"
        ? "FALLBACK_FAILED"
        : "REQUEST_FAILED";
  if (lower.includes("activation") || lower.includes("gesture")) {
    code = "USER_ACTIVATION_REQUIRED";
  } else if (
    lower.includes("permission") ||
    lower.includes("denied") ||
    lower.includes("security")
  ) {
    let embedded: boolean;
    try {
      embedded = Boolean(doc?.defaultView?.frameElement);
    } catch {
      embedded = true;
    }
    code = embedded ? "IFRAME_PERMISSION_REQUIRED" : "PERMISSION_DENIED";
  }
  return makeError(code, `Fullscreen ${operation} failed: ${text}`, cause);
}
