import type {
  ComponentPublicInstance,
  Component,
  Directive,
  Plugin,
  Ref,
  ShallowRef,
} from "vue";
import type {
  ScreenfullError,
  ScreenfullOptions,
  ScreenfullRequestOptions,
  ScreenfullResult,
  ScreenfullStatus,
} from "./core/typing";

export type * from "./core/typing";

export type ScreenfullTarget =
  | Element
  | Ref<Element | ComponentPublicInstance | null | undefined>
  | string
  | null
  | undefined;

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
