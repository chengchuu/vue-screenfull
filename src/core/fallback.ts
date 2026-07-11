import type {
  ScreenfullFallbackContext,
  ScreenfullFallbackHandler,
  ScreenfullOptions,
} from "../typing";

type StyleSnapshot = Record<string, string>;
const properties = [
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "margin",
  "zIndex",
  "overflow",
  "background",
] as const;

export class CssFallback implements ScreenfullFallbackHandler {
  private element: HTMLElement | null = null;
  private styles: StyleSnapshot | null = null;
  private bodyOverflow = "";
  private scrollX = 0;
  private scrollY = 0;
  private className = "";

  enter({ element, document: doc, options }: ScreenfullFallbackContext): void {
    const HTMLElementConstructor = doc.defaultView?.HTMLElement;
    if (
      !HTMLElementConstructor ||
      !(element instanceof HTMLElementConstructor)
    ) {
      throw new TypeError("CSS fallback requires an HTMLElement.");
    }
    this.element = element as HTMLElement;
    this.className = options.fallbackClass ?? "vue-screenfull-fallback";
    this.styles = {};
    for (const property of properties)
      this.styles[property] = this.element.style[property];
    this.bodyOverflow = doc.body?.style.overflow ?? "";
    this.scrollX = doc.defaultView?.scrollX ?? 0;
    this.scrollY = doc.defaultView?.scrollY ?? 0;
    Object.assign(this.element.style, {
      position: "fixed",
      inset: "0",
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      width: "100vw",
      height: "100dvh",
      maxWidth: "none",
      maxHeight: "none",
      margin: "0",
      zIndex: "2147483647",
      overflow: "auto",
      background: this.element.style.background || "Canvas",
    });
    this.element.classList.add(this.className);
    if (options.lockScroll !== false && doc.body)
      doc.body.style.overflow = "hidden";
  }

  exit({ document: doc }: ScreenfullFallbackContext): void {
    if (!this.element || !this.styles) return;
    for (const property of properties)
      this.element.style[property] = this.styles[property] ?? "";
    this.element.classList.remove(this.className);
    if (doc.body) doc.body.style.overflow = this.bodyOverflow;
    doc.defaultView?.scrollTo?.(this.scrollX, this.scrollY);
    this.element = null;
    this.styles = null;
  }
}

export function createFallback(
  options: ScreenfullOptions,
): ScreenfullFallbackHandler | null {
  if (!options.fallback || options.fallback === "none") return null;
  return options.fallback === "css" ? new CssFallback() : options.fallback;
}
