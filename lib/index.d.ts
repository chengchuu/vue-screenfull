/// <reference path="./global.d.ts" />
import * as vue from 'vue';
import { Ref, ComponentPublicInstance, ShallowRef, Component, Directive, Plugin, PropType, VNode, SlotsType, DirectiveBinding, App } from 'vue';

type ScreenfullStatus = "idle" | "requesting" | "fullscreen" | "exiting" | "fallback" | "unsupported" | "error";
type ScreenfullErrorCode = "NOT_SUPPORTED" | "NOT_IN_BROWSER" | "USER_ACTIVATION_REQUIRED" | "PERMISSION_DENIED" | "IFRAME_PERMISSION_REQUIRED" | "INVALID_TARGET" | "TARGET_NOT_CONNECTED" | "REQUEST_IN_PROGRESS" | "REQUEST_FAILED" | "EXIT_FAILED" | "FALLBACK_FAILED" | "UNKNOWN";
interface ScreenfullError {
    code: ScreenfullErrorCode;
    message: string;
    cause?: unknown;
    recoverable: boolean;
    suggestion?: string;
}
interface ScreenfullSuccessResult {
    ok: true;
    mode: "native" | "fallback";
    element: Element | null;
    error: null;
}
interface ScreenfullFailureResult {
    ok: false;
    mode: "none";
    element: Element | null;
    error: ScreenfullError;
}
type ScreenfullResult = ScreenfullSuccessResult | ScreenfullFailureResult;
interface ScreenfullState {
    isEnabled: boolean;
    isFullscreen: boolean;
    isFallback: boolean;
    element: Element | null;
    status: ScreenfullStatus;
}
interface ScreenfullFallbackContext {
    element: Element;
    document: Document;
    options: Readonly<ScreenfullOptions>;
}
interface ScreenfullFallbackHandler {
    enter: (context: ScreenfullFallbackContext) => void | Promise<void>;
    exit: (context: ScreenfullFallbackContext) => void | Promise<void>;
}
type ScreenfullFallbackMode = "none" | "css" | ScreenfullFallbackHandler;
interface ScreenfullCallbacks {
    onChange?: (state: ScreenfullState) => void;
    onEnter?: (state: ScreenfullState) => void;
    onExit?: (state: ScreenfullState) => void;
    onError?: (error: ScreenfullError) => void;
    onFallback?: (state: ScreenfullState) => void;
}
interface ScreenfullOptions extends ScreenfullCallbacks {
    fallback?: ScreenfullFallbackMode;
    fallbackClass?: string;
    lockScroll?: boolean;
    restoreFocus?: boolean;
    exitOnRouteChange?: boolean;
    debug?: boolean;
    document?: Document;
}
interface ScreenfullRequestOptions extends FullscreenOptions {
    fallback?: ScreenfullFallbackMode;
}
type ScreenfullTarget = Element | Ref<Element | ComponentPublicInstance | null | undefined> | string | null | undefined;
type ScreenfullEventName = "change" | "error";
type ScreenfullChangeListener = (state: ScreenfullState) => void;
type ScreenfullErrorListener = (error: ScreenfullError) => void;
interface RawFullscreenApi {
    requestFullscreen: string;
    exitFullscreen: string;
    fullscreenElement: string;
    fullscreenEnabled: string;
    fullscreenchange: string;
    fullscreenerror: string;
}
interface ScreenfullController {
    readonly isEnabled: boolean;
    readonly isFullscreen: boolean;
    readonly isFallback: boolean;
    readonly element: Element | null;
    readonly status: ScreenfullStatus;
    readonly error: ScreenfullError | null;
    readonly raw: Readonly<RawFullscreenApi> | null;
    request(element?: Element | null, options?: ScreenfullRequestOptions): Promise<ScreenfullResult>;
    exit(): Promise<ScreenfullResult>;
    toggle(element?: Element | null, options?: ScreenfullRequestOptions): Promise<ScreenfullResult>;
    on(event: "change", listener: ScreenfullChangeListener): void;
    on(event: "error", listener: ScreenfullErrorListener): void;
    off(event: "change", listener: ScreenfullChangeListener): void;
    off(event: "error", listener: ScreenfullErrorListener): void;
    clearError(): void;
    destroy(): Promise<void>;
}
interface UseScreenfullReturn {
    isEnabled: Readonly<Ref<boolean>>;
    isFullscreen: Readonly<Ref<boolean>>;
    isFallback: Readonly<Ref<boolean>>;
    fullscreenElement: Readonly<ShallowRef<Element | null>>;
    targetElement: Readonly<ShallowRef<Element | null>>;
    status: Readonly<Ref<ScreenfullStatus>>;
    error: Readonly<ShallowRef<ScreenfullError | null>>;
    request(target?: ScreenfullTarget, options?: ScreenfullRequestOptions): Promise<ScreenfullResult>;
    exit(): Promise<ScreenfullResult>;
    toggle(target?: ScreenfullTarget, options?: ScreenfullRequestOptions): Promise<ScreenfullResult>;
    clearError(): void;
}
type ScreenfullSlotProps = UseScreenfullReturn;
interface ScreenfullComponentProps extends ScreenfullOptions {
    target?: ScreenfullTarget;
}
type ScreenfullDirectiveAction = "request" | "exit" | "toggle";
interface ScreenfullDirectiveValueObject {
    target?: ScreenfullTarget;
    action?: ScreenfullDirectiveAction;
    options?: ScreenfullRequestOptions;
}
type ScreenfullDirectiveValue = ScreenfullTarget | ScreenfullDirectiveValueObject;
interface VueScreenfullPluginOptions {
    componentName?: string;
    directiveName?: string;
}
type ScreenfullComponent = Component<ScreenfullComponentProps>;
type ScreenfullDirective = Directive<HTMLElement, ScreenfullDirectiveValue>;
type VueScreenfullPlugin = Plugin<VueScreenfullPluginOptions | undefined>;

declare function createScreenfullController(supplied?: ScreenfullOptions): ScreenfullController;

declare function detectFullscreenApi(doc: Document): Readonly<RawFullscreenApi> | null;

declare function resolveScreenfullTarget(target: ScreenfullTarget, doc?: Document): Element | null;

declare function useScreenfull(options?: ScreenfullOptions): UseScreenfullReturn;
declare function useScreenfullTarget(target: ScreenfullTarget, options?: ScreenfullOptions): UseScreenfullReturn;

declare const Screenfull: vue.DefineComponent<vue.ExtractPropTypes<{
    target: {
        type: PropType<ScreenfullTarget>;
        default: undefined;
    };
    fallback: {
        type: PropType<ScreenfullOptions["fallback"]>;
        default: string;
    };
    fallbackClass: {
        type: StringConstructor;
        default: string;
    };
    lockScroll: {
        type: BooleanConstructor;
        default: boolean;
    };
    restoreFocus: {
        type: BooleanConstructor;
        default: boolean;
    };
    exitOnRouteChange: {
        type: BooleanConstructor;
        default: boolean;
    };
    debug: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>[], {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {
    change: (state: ScreenfullState) => boolean;
    enter: (state: ScreenfullState) => boolean;
    exit: (state: ScreenfullState) => boolean;
    error: (error: ScreenfullError) => boolean;
    fallback: (state: ScreenfullState) => boolean;
}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    target: {
        type: PropType<ScreenfullTarget>;
        default: undefined;
    };
    fallback: {
        type: PropType<ScreenfullOptions["fallback"]>;
        default: string;
    };
    fallbackClass: {
        type: StringConstructor;
        default: string;
    };
    lockScroll: {
        type: BooleanConstructor;
        default: boolean;
    };
    restoreFocus: {
        type: BooleanConstructor;
        default: boolean;
    };
    exitOnRouteChange: {
        type: BooleanConstructor;
        default: boolean;
    };
    debug: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onFallback?: ((state: ScreenfullState) => any) | undefined;
    onChange?: ((state: ScreenfullState) => any) | undefined;
    onEnter?: ((state: ScreenfullState) => any) | undefined;
    onExit?: ((state: ScreenfullState) => any) | undefined;
    onError?: ((error: ScreenfullError) => any) | undefined;
}>, {
    fallback: ScreenfullFallbackMode | undefined;
    target: ScreenfullTarget;
    fallbackClass: string;
    lockScroll: boolean;
    restoreFocus: boolean;
    exitOnRouteChange: boolean;
    debug: boolean;
}, SlotsType<{
    default: (props: ScreenfullSlotProps) => VNode[];
}>, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const vScreenfull: {
    mounted(element: HTMLElement, binding: DirectiveBinding<ScreenfullDirectiveValue>): void;
    updated(element: HTMLElement, binding: DirectiveBinding<ScreenfullDirectiveValue>): void;
    unmounted(element: HTMLElement): void;
};

declare const VueScreenfull: {
    install(app: App, options?: VueScreenfullPluginOptions): void;
};

/**
 * Reactive, SSR-safe Vue 3 access to the browser Fullscreen API.
 * @packageDocumentation
 */

declare const packageInfo: {
    readonly name: "vue-screenfull";
    readonly version: "1.0.2";
};

export { Screenfull, createScreenfullController, VueScreenfull as default, detectFullscreenApi, packageInfo, resolveScreenfullTarget, useScreenfull, useScreenfullTarget, vScreenfull };
export type { RawFullscreenApi, ScreenfullCallbacks, ScreenfullChangeListener, ScreenfullComponent, ScreenfullComponentProps, ScreenfullController, ScreenfullDirective, ScreenfullDirectiveAction, ScreenfullDirectiveValue, ScreenfullDirectiveValueObject, ScreenfullError, ScreenfullErrorCode, ScreenfullErrorListener, ScreenfullEventName, ScreenfullFailureResult, ScreenfullFallbackContext, ScreenfullFallbackHandler, ScreenfullFallbackMode, ScreenfullOptions, ScreenfullRequestOptions, ScreenfullResult, ScreenfullSlotProps, ScreenfullState, ScreenfullStatus, ScreenfullSuccessResult, ScreenfullTarget, UseScreenfullReturn, VueScreenfullPlugin, VueScreenfullPluginOptions };
