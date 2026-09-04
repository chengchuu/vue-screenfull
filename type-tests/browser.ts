import {
  createScreenfullController,
  detectFullscreenApi,
  type ScreenfullError,
  type ScreenfullResult,
} from "../src/browser";

const controller = createScreenfullController();
const targets: Array<Element | null | undefined> = [
  document.documentElement,
  null,
  undefined,
];

const result: Promise<ScreenfullResult> = controller.request(targets[0]);
result.then((value) => {
  if (value.ok) {
    const error: null = value.error;
    void error;
  } else {
    const error: ScreenfullError = value.error;
    void error;
  }
});

void detectFullscreenApi(document);
