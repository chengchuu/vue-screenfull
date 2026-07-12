/** @jest-environment node */
import { createScreenfullController } from "../src/index";

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
});
