import type {
  ScreenfullFallbackContext,
  ScreenfullFallbackHandler,
  ScreenfullOptions,
} from "./typing";

interface PropertySnapshot {
  value: string;
  priority: string;
}

type StyleSnapshot = Record<string, PropertySnapshot>;
const properties = [
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "max-width",
  "max-height",
  "margin",
  "z-index",
  "overflow",
  "background",
] as const;

const activeCssFallbacks = new WeakMap<Document, CssFallback>();

export class CssFallback implements ScreenfullFallbackHandler {
  private element: HTMLElement | null = null;
  private styles: StyleSnapshot | null = null;
  private bodyOverflow: PropertySnapshot = { value: "", priority: "" };
  private scrollX = 0;
  private scrollY = 0;
  private className = "";
  private addedClass = false;
  private lockedScroll = false;
  private bodyScrollLocked = false;

  enter({ element, document: doc, options }: ScreenfullFallbackContext): void {
    const HTMLElementConstructor = doc.defaultView?.HTMLElement;
    if (
      !HTMLElementConstructor ||
      !(element instanceof HTMLElementConstructor)
    ) {
      throw new TypeError("CSS fallback requires an HTMLElement.");
    }
    const active = activeCssFallbacks.get(doc);
    if (active && active !== this) {
      throw new Error("Another CSS fullscreen fallback is already active.");
    }
    activeCssFallbacks.set(doc, this);
    try {
      this.element = element as HTMLElement;
      this.className = options.fallbackClass ?? "vue-screenfull-fallback";
      this.styles = {};
      for (const property of properties) {
        this.styles[property] = {
          value: this.element.style.getPropertyValue(property),
          priority: this.element.style.getPropertyPriority(property),
        };
      }
      this.bodyOverflow = {
        value: doc.body?.style.getPropertyValue("overflow") ?? "",
        priority: doc.body?.style.getPropertyPriority("overflow") ?? "",
      };
      this.scrollX = doc.defaultView?.scrollX ?? 0;
      this.scrollY = doc.defaultView?.scrollY ?? 0;
      const fallbackStyles: ReadonlyArray<readonly [string, string]> = [
        ["position", "fixed"],
        ["inset", "0"],
        ["top", "0"],
        ["right", "0"],
        ["bottom", "0"],
        ["left", "0"],
        ["width", "100vw"],
        ["height", "100dvh"],
        ["max-width", "none"],
        ["max-height", "none"],
        ["margin", "0"],
        ["z-index", "2147483647"],
        ["overflow", "auto"],
        ["background", this.element.style.background || "Canvas"],
      ];
      for (const [property, value] of fallbackStyles)
        this.element.style.setProperty(property, value, "important");
      this.addedClass = !this.element.classList.contains(this.className);
      if (this.addedClass) this.element.classList.add(this.className);
      this.lockedScroll = options.lockScroll !== false;
      this.bodyScrollLocked = Boolean(
        this.lockedScroll &&
        doc.body &&
        this.element !== doc.documentElement &&
        this.element !== doc.body,
      );
      if (this.bodyScrollLocked && doc.body)
        doc.body.style.setProperty("overflow", "hidden", "important");
    } catch (cause) {
      try {
        this.exit({ element, document: doc, options });
      } finally {
        if (activeCssFallbacks.get(doc) === this)
          activeCssFallbacks.delete(doc);
      }
      throw cause;
    }
  }

  exit({ document: doc }: ScreenfullFallbackContext): void {
    if (!this.element || !this.styles) return;
    try {
      for (const property of properties) {
        const snapshot = this.styles[property];
        if (snapshot.value)
          this.element.style.setProperty(
            property,
            snapshot.value,
            snapshot.priority,
          );
        else this.element.style.removeProperty(property);
      }
      if (this.addedClass) this.element.classList.remove(this.className);
      if (this.bodyScrollLocked && doc.body) {
        if (this.bodyOverflow.value)
          doc.body.style.setProperty(
            "overflow",
            this.bodyOverflow.value,
            this.bodyOverflow.priority,
          );
        else doc.body.style.removeProperty("overflow");
      }
      if (this.lockedScroll)
        doc.defaultView?.scrollTo?.(this.scrollX, this.scrollY);
    } finally {
      if (activeCssFallbacks.get(doc) === this) activeCssFallbacks.delete(doc);
      this.element = null;
      this.styles = null;
      this.addedClass = false;
      this.lockedScroll = false;
      this.bodyScrollLocked = false;
    }
  }
}

export function createFallback(
  options: ScreenfullOptions,
): ScreenfullFallbackHandler | null {
  if (!options.fallback || options.fallback === "none") return null;
  return options.fallback === "css" ? new CssFallback() : options.fallback;
}
