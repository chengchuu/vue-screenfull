import type {
  ComponentPublicInstance,
  Component,
  Directive,
  Plugin,
  Ref,
  ShallowRef,
} from "vue";

export type ScreenfullStatus =
  | "idle"
  | "requesting"
  | "fullscreen"
  | "exiting"
  | "fallback"
  | "unsupported"
  | "error";

export type ScreenfullErrorCode =
  | "NOT_SUPPORTED"
  | "NOT_IN_BROWSER"
  | "USER_ACTIVATION_REQUIRED"
  | "PERMISSION_DENIED"
  | "IFRAME_PERMISSION_REQUIRED"
  | "INVALID_TARGET"
  | "TARGET_NOT_CONNECTED"
  | "REQUEST_IN_PROGRESS"
  | "REQUEST_FAILED"
  | "EXIT_FAILED"
  | "FALLBACK_FAILED"
  | "UNKNOWN";

export interface ScreenfullError {
  code: ScreenfullErrorCode;
  message: string;
  cause?: unknown;
  recoverable: boolean;
  suggestion?: string;
}

export interface ScreenfullSuccessResult {
  ok: true;
  mode: "native" | "fallback";
  element: Element | null;
  error: null;
}

export interface ScreenfullFailureResult {
  ok: false;
  mode: "none";
  element: Element | null;
  error: ScreenfullError;
}

export type ScreenfullResult =
  ScreenfullSuccessResult | ScreenfullFailureResult;

export interface ScreenfullState {
  isEnabled: boolean;
  isFullscreen: boolean;
  isFallback: boolean;
  element: Element | null;
  status: ScreenfullStatus;
}

export interface ScreenfullFallbackContext {
  element: Element;
  document: Document;
  options: Readonly<ScreenfullOptions>;
}

export interface ScreenfullFallbackHandler {
  enter: (context: ScreenfullFallbackContext) => void | Promise<void>;
  exit: (context: ScreenfullFallbackContext) => void | Promise<void>;
}

export type ScreenfullFallbackMode = "none" | "css" | ScreenfullFallbackHandler;

export interface ScreenfullCallbacks {
  onChange?: (state: ScreenfullState) => void;
  onEnter?: (state: ScreenfullState) => void;
  onExit?: (state: ScreenfullState) => void;
  onError?: (error: ScreenfullError) => void;
  onFallback?: (state: ScreenfullState) => void;
}

export interface ScreenfullOptions extends ScreenfullCallbacks {
  fallback?: ScreenfullFallbackMode;
  fallbackClass?: string;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  exitOnRouteChange?: boolean;
  debug?: boolean;
  document?: Document;
}

export interface ScreenfullRequestOptions extends FullscreenOptions {
  fallback?: ScreenfullFallbackMode;
}

export type ScreenfullTarget =
  | Element
  | Ref<Element | ComponentPublicInstance | null | undefined>
  | string
  | null
  | undefined;

export type ScreenfullEventName = "change" | "error";
export type ScreenfullChangeListener = (state: ScreenfullState) => void;
export type ScreenfullErrorListener = (error: ScreenfullError) => void;

export interface RawFullscreenApi {
  requestFullscreen: string;
  exitFullscreen: string;
  fullscreenElement: string;
  fullscreenEnabled: string;
  fullscreenchange: string;
  fullscreenerror: string;
}

export interface ScreenfullController {
  readonly isEnabled: boolean;
  readonly isFullscreen: boolean;
  readonly isFallback: boolean;
  readonly element: Element | null;
  readonly status: ScreenfullStatus;
  readonly error: ScreenfullError | null;
  readonly raw: Readonly<RawFullscreenApi> | null;
  request(
    element?: Element | null,
    options?: ScreenfullRequestOptions,
  ): Promise<ScreenfullResult>;
  exit(): Promise<ScreenfullResult>;
  toggle(
    element?: Element | null,
    options?: ScreenfullRequestOptions,
  ): Promise<ScreenfullResult>;
  on(event: "change", listener: ScreenfullChangeListener): void;
  on(event: "error", listener: ScreenfullErrorListener): void;
  off(event: "change", listener: ScreenfullChangeListener): void;
  off(event: "error", listener: ScreenfullErrorListener): void;
  clearError(): void;
  destroy(): Promise<void>;
}

export interface UseScreenfullReturn {
  isEnabled: Readonly<Ref<boolean>>;
  isFullscreen: Readonly<Ref<boolean>>;
  isFallback: Readonly<Ref<boolean>>;
  fullscreenElement: Readonly<ShallowRef<Element | null>>;
  targetElement: Readonly<ShallowRef<Element | null>>;
  status: Readonly<Ref<ScreenfullStatus>>;
  error: Readonly<ShallowRef<ScreenfullError | null>>;
  request(
    target?: ScreenfullTarget,
    options?: ScreenfullRequestOptions,
  ): Promise<ScreenfullResult>;
  exit(): Promise<ScreenfullResult>;
  toggle(
    target?: ScreenfullTarget,
    options?: ScreenfullRequestOptions,
  ): Promise<ScreenfullResult>;
  clearError(): void;
}

export type ScreenfullSlotProps = UseScreenfullReturn;

export interface ScreenfullComponentProps extends ScreenfullOptions {
  target?: ScreenfullTarget;
}

export type ScreenfullDirectiveAction = "request" | "exit" | "toggle";
export interface ScreenfullDirectiveValueObject {
  target?: ScreenfullTarget;
  action?: ScreenfullDirectiveAction;
  options?: ScreenfullRequestOptions;
}
export type ScreenfullDirectiveValue =
  ScreenfullTarget | ScreenfullDirectiveValueObject;

export interface VueScreenfullPluginOptions {
  componentName?: string;
  directiveName?: string;
}

export type ScreenfullComponent = Component<ScreenfullComponentProps>;
export type ScreenfullDirective = Directive<
  HTMLElement,
  ScreenfullDirectiveValue
>;
export type VueScreenfullPlugin = Plugin<
  VueScreenfullPluginOptions | undefined
>;
