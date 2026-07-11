/** Legacy Fullscreen API names used only after runtime feature detection. */
export {};

declare global {
  interface Document {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
    webkitFullscreenEnabled?: boolean;
    mozCancelFullScreen?: () => Promise<void> | void;
    mozFullScreenElement?: Element | null;
    mozFullScreenEnabled?: boolean;
    msExitFullscreen?: () => Promise<void> | void;
    msFullscreenElement?: Element | null;
    msFullscreenEnabled?: boolean;
  }
  interface Element {
    webkitRequestFullscreen?: (
      options?: FullscreenOptions,
    ) => Promise<void> | void;
    mozRequestFullScreen?: (
      options?: FullscreenOptions,
    ) => Promise<void> | void;
    msRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
  }
}
