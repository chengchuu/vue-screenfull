import { resolveElementTarget } from "mazey";
import { isRef } from "vue";
import type { ScreenfullTarget } from "../typing";

export function resolveScreenfullTarget(
  target: ScreenfullTarget,
  doc?: Document,
): Element | null {
  if (!doc) return null;
  return resolveElementTarget(target, {
    root: doc,
    defaultElement: doc.documentElement,
    unwrap: (value) => (isRef(value) ? value.value : value),
  });
}
