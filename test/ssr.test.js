/** @jest-environment node */
import { createScreenfullController, packageInfo } from "../src/index";

test("imports without browser globals and returns stable unsupported state", async () => {
  const controller = createScreenfullController();
  expect(controller.isEnabled).toBe(false);
  expect(controller.isFullscreen).toBe(false);
  expect(controller.status).toBe("unsupported");
  await expect(controller.request()).resolves.toMatchObject({
    ok: false,
    mode: "none",
    error: { code: "NOT_IN_BROWSER" },
  });
  expect(packageInfo).toEqual({ name: "vue-screenfull", version: "1.0.2" });
});
