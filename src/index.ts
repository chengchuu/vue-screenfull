/**
 * Reactive, SSR-safe Vue 3 access to the browser Fullscreen API.
 * @packageDocumentation
 */
export { createScreenfullController } from "./core/controller";
export { detectFullscreenApi } from "./core/api-map";
export { resolveScreenfullTarget } from "./core/target";
export {
  useScreenfull,
  useScreenfullTarget,
} from "./composables/useScreenfull";
export { Screenfull } from "./components/Screenfull";
export { vScreenfull } from "./directives/screenfull";
export { default } from "./plugin";
export type * from "./typing";

export const packageInfo = {
  name: "vue-screenfull",
  version: "1.0.2",
} as const;
