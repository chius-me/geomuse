export type GlobeRuntimeStatus =
  | { phase: "loading"; message: string }
  | { phase: "ready"; message: string }
  | { phase: "error"; message: string };

export type GlobeRuntimeEvent =
  | { type: "initialize" }
  | { type: "ready" }
  | { type: "fail"; error: unknown };

export const initialGlobeRuntimeStatus: GlobeRuntimeStatus = {
  phase: "loading",
  message: "正在初始化地球",
};

export function describeGlobeError(error: unknown): string {
  const detail =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "浏览器无法启动地图渲染";

  return `地球加载失败：${detail}`;
}

export function reduceGlobeRuntimeStatus(
  current: GlobeRuntimeStatus,
  event: GlobeRuntimeEvent,
): GlobeRuntimeStatus {
  switch (event.type) {
    case "initialize":
      return initialGlobeRuntimeStatus;
    case "ready":
      if (current.phase === "error") {
        return current;
      }
      return {
        phase: "ready",
        message: "地球已就绪",
      };
    case "fail":
      return {
        phase: "error",
        message: describeGlobeError(event.error),
      };
  }
}
