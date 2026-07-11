import type { DirectiveBinding } from "vue";
import { createScreenfullController } from "../core/controller";
import { resolveScreenfullTarget } from "../core/target";
import type {
  ScreenfullController,
  ScreenfullDirectiveAction,
  ScreenfullDirectiveValue,
  ScreenfullDirectiveValueObject,
} from "../typing";

interface DirectiveState {
  controller: ScreenfullController;
  binding: DirectiveBinding<ScreenfullDirectiveValue>;
  click: () => void;
}
const states = /*#__PURE__*/ new WeakMap<HTMLElement, DirectiveState>();

function isConfig(
  value: ScreenfullDirectiveValue,
): value is ScreenfullDirectiveValueObject {
  return Boolean(
    value &&
    typeof value === "object" &&
    !("nodeType" in value) &&
    !("value" in value) &&
    ("target" in value || "action" in value || "options" in value),
  );
}

export const vScreenfull = {
  mounted(
    element: HTMLElement,
    binding: DirectiveBinding<ScreenfullDirectiveValue>,
  ) {
    const controller = createScreenfullController();
    const state: DirectiveState = {
      controller,
      binding,
      click: () => undefined,
    };
    state.click = () => {
      const value = state.binding.value;
      const config = isConfig(value) ? value : { target: value };
      const action = (state.binding.arg ||
        config.action ||
        "toggle") as ScreenfullDirectiveAction;
      const target = resolveScreenfullTarget(
        config.target,
        element.ownerDocument,
      );
      if (action === "exit") void controller.exit();
      else if (action === "request")
        void controller.request(target, config.options);
      else void controller.toggle(target, config.options);
    };
    states.set(element, state);
    element.addEventListener("click", state.click);
  },
  updated(
    element: HTMLElement,
    binding: DirectiveBinding<ScreenfullDirectiveValue>,
  ) {
    const state = states.get(element);
    if (state) state.binding = binding;
  },
  unmounted(element: HTMLElement) {
    const state = states.get(element);
    if (!state) return;
    element.removeEventListener("click", state.click);
    void state.controller.destroy();
    states.delete(element);
  },
};
