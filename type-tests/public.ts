import { ref, type ComponentPublicInstance } from "vue";
import {
  Screenfull,
  createScreenfullController,
  useScreenfull,
  useScreenfullTarget,
  vScreenfull,
  type ScreenfullErrorCode,
  type ScreenfullError,
  type ScreenfullResult,
  type ScreenfullTarget,
  type UseScreenfullReturn,
} from "../src";

const element = document.createElement("div");
const component = ref<ComponentPublicInstance | null>(null);
const targets: ScreenfullTarget[] = [
  element,
  ref(element),
  component,
  "#target",
  null,
];
const composable: UseScreenfullReturn = useScreenfull({ fallback: "css" });
useScreenfullTarget(targets[0]).toggle(undefined, { navigationUI: "hide" });
const result: Promise<ScreenfullResult> = composable.request(targets[1]);
result.then((value) => {
  if (value.ok) {
    const error: null = value.error;
    void error;
  } else {
    const error: ScreenfullError = value.error;
    void error;
  }
});
const code: ScreenfullErrorCode = "USER_ACTIVATION_REQUIRED";
createScreenfullController().on("change", (state) => Boolean(state.element));
void [Screenfull, vScreenfull, result, code];
