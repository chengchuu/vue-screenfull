import {
  defineComponent,
  type PropType,
  type SlotsType,
  type VNode,
} from "vue";
import { useScreenfull } from "../composables/useScreenfull";
import type {
  ScreenfullError,
  ScreenfullOptions,
  ScreenfullSlotProps,
  ScreenfullState,
  ScreenfullTarget,
} from "../typing";

export const Screenfull = /*#__PURE__*/ defineComponent({
  name: "Screenfull",
  props: {
    target: {
      type: [String, Object] as PropType<ScreenfullTarget>,
      default: undefined,
    },
    fallback: {
      type: [String, Object] as PropType<ScreenfullOptions["fallback"]>,
      default: "none",
    },
    fallbackClass: { type: String, default: "vue-screenfull-fallback" },
    lockScroll: { type: Boolean, default: true },
    restoreFocus: { type: Boolean, default: true },
    exitOnRouteChange: { type: Boolean, default: false },
    debug: { type: Boolean, default: false },
  },
  emits: {
    change: (state: ScreenfullState) => typeof state === "object",
    enter: (state: ScreenfullState) => typeof state === "object",
    exit: (state: ScreenfullState) => typeof state === "object",
    error: (error: ScreenfullError) => typeof error === "object",
    fallback: (state: ScreenfullState) => typeof state === "object",
  },
  slots: Object as SlotsType<{
    default: (props: ScreenfullSlotProps) => VNode[];
  }>,
  setup(props, { slots, emit }) {
    const options: ScreenfullOptions = {
      fallback: props.fallback,
      fallbackClass: props.fallbackClass,
      lockScroll: props.lockScroll,
      restoreFocus: props.restoreFocus,
      exitOnRouteChange: props.exitOnRouteChange,
      debug: props.debug,
      onChange: (state) => emit("change", state),
      onEnter: (state) => emit("enter", state),
      onExit: (state) => emit("exit", state),
      onError: (error) => emit("error", error),
      onFallback: (state) => emit("fallback", state),
    };
    const screenfull = useScreenfull(options);
    const bound = {
      ...screenfull,
      request: (
        _target?: ScreenfullTarget,
        requestOptions?: Parameters<typeof screenfull.request>[1],
      ) => screenfull.request(props.target, requestOptions),
      toggle: (
        _target?: ScreenfullTarget,
        requestOptions?: Parameters<typeof screenfull.toggle>[1],
      ) => screenfull.toggle(props.target, requestOptions),
    };
    return () => slots.default?.(bound);
  },
});
