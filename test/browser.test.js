/** @jest-environment node */
import {
  createScreenfullController,
  detectFullscreenApi,
} from "../src/browser";

test("browser entry is SSR-safe without Vue or browser globals", async () => {
  expect(typeof detectFullscreenApi).toBe("function");
  const controller = createScreenfullController();

  expect(controller.isEnabled).toBe(false);
  expect(controller.isFullscreen).toBe(false);
  expect(controller.status).toBe("unsupported");
  await expect(controller.request(undefined)).resolves.toMatchObject({
    ok: false,
    mode: "none",
    error: { code: "NOT_IN_BROWSER" },
  });
  await expect(controller.destroy()).resolves.toBeUndefined();
});
