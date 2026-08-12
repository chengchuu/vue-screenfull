import type { RawFullscreenApi } from "./typing";

const candidates: readonly RawFullscreenApi[] = [
  {
    requestFullscreen: "requestFullscreen",
    exitFullscreen: "exitFullscreen",
    fullscreenElement: "fullscreenElement",
    fullscreenEnabled: "fullscreenEnabled",
    fullscreenchange: "fullscreenchange",
    fullscreenerror: "fullscreenerror",
  },
  {
    requestFullscreen: "webkitRequestFullscreen",
    exitFullscreen: "webkitExitFullscreen",
    fullscreenElement: "webkitFullscreenElement",
    fullscreenEnabled: "webkitFullscreenEnabled",
    fullscreenchange: "webkitfullscreenchange",
    fullscreenerror: "webkitfullscreenerror",
  },
  {
    requestFullscreen: "webkitRequestFullScreen",
    exitFullscreen: "webkitCancelFullScreen",
    fullscreenElement: "webkitCurrentFullScreenElement",
    fullscreenEnabled: "webkitCancelFullScreen",
    fullscreenchange: "webkitfullscreenchange",
    fullscreenerror: "webkitfullscreenerror",
  },
  {
    requestFullscreen: "mozRequestFullScreen",
    exitFullscreen: "mozCancelFullScreen",
    fullscreenElement: "mozFullScreenElement",
    fullscreenEnabled: "mozFullScreenEnabled",
    fullscreenchange: "mozfullscreenchange",
    fullscreenerror: "mozfullscreenerror",
  },
  {
    requestFullscreen: "msRequestFullscreen",
    exitFullscreen: "msExitFullscreen",
    fullscreenElement: "msFullscreenElement",
    fullscreenEnabled: "msFullscreenEnabled",
    fullscreenchange: "MSFullscreenChange",
    fullscreenerror: "MSFullscreenError",
  },
];

export function detectFullscreenApi(
  doc: Document,
): Readonly<RawFullscreenApi> | null {
  const element = doc.documentElement as unknown as Record<string, unknown>;
  const documentRecord = doc as unknown as Record<string, unknown>;
  const match = candidates.find(
    (candidate) =>
      typeof element[candidate.requestFullscreen] === "function" &&
      typeof documentRecord[candidate.exitFullscreen] === "function",
  );
  return match ? Object.freeze({ ...match }) : null;
}
