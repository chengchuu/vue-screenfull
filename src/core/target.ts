import { isRef } from "vue";
import type { ScreenfullTarget } from "../typing";

export function resolveScreenfullTarget(
  target: ScreenfullTarget,
  doc?: Document,
): Element | null {
  if (!doc) return null;
  let value: unknown = isRef(target) ? target.value : target;
  if (value == null) return doc.documentElement;
  if (typeof value === "string") {
    try {
      return doc.querySelector(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && "$el" in value)
    value = (value as { $el?: unknown }).$el;
  return value && typeof value === "object" && (value as Node).nodeType === 1
    ? (value as Element)
    : null;
}
