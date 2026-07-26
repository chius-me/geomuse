import type { GlobeCameraSnapshot } from "./camera-command.ts";
import type { GlobeLayerGroupId } from "./layer-registry.ts";
import type { GlobeSelectionChange } from "./selection.ts";

export type GlobeEvent =
  | { type: "ready" }
  | { type: "error"; error: Error }
  | {
      type: "camera-change";
      camera: GlobeCameraSnapshot;
    }
  | {
      type: "selection-change";
      selection: GlobeSelectionChange;
    }
  | {
      type: "layer-visibility-change";
      groupId: GlobeLayerGroupId;
      visible: boolean;
    };

export type GlobeEventListener = (event: GlobeEvent) => void;

export class GlobeEventHub {
  private readonly listeners = new Set<GlobeEventListener>();

  subscribe(listener: GlobeEventListener): () => void {
    this.listeners.add(listener);
    let isSubscribed = true;

    return () => {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;
      this.listeners.delete(listener);
    };
  }

  emit(event: GlobeEvent) {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export function normalizeGlobeEventError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("浏览器无法启动地图渲染");
}
