export function announcePwaStatus(
  documentRef: Document,
  message: string,
): void {
  documentRef
    .querySelectorAll<HTMLElement>("[data-pwa-status]")
    .forEach((region) => (region.textContent = message));
}
