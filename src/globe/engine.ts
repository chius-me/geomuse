import maplibregl from "maplibre-gl/dist/maplibre-gl-csp.js";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  globeCameraLimits,
  initialGlobeCamera,
} from "@/globe/camera";
import {
  resolveGlobeCameraCommand,
  type GlobeCameraCommand,
  type GlobeCameraSnapshot,
  type GlobeCameraTarget,
  type GlobeFitBoundsCommand,
  type GlobeFlyToCommand,
} from "@/globe/camera-command";
import {
  resolveBasemapProvider,
  type BasemapProvider,
} from "@/globe/basemap-provider";
import {
  GlobeEventHub,
  normalizeGlobeEventError,
} from "@/globe/events";
import { ensurePMTilesProtocol } from "@/globe/pmtiles-protocol";
import { ensureMapLibreWorker } from "@/globe/maplibre-worker";
import {
  GlobePerformanceAccumulator,
  type GlobePerformanceSnapshot,
} from "@/globe/performance";
import {
  getSelectableGlobeLayerIds,
  getGlobeLayerIdsForGroup,
  type GlobeLayerGroupId,
  type GlobeLayerId,
} from "@/globe/layer-registry";
import {
  createGlobeSelectionChange,
  type GlobeScreenPoint,
  type GlobeSelectionChange,
} from "@/globe/selection";
import { createGlobeStyle } from "@/globe/style";
import "@/components/globe/globe-viewport.css";

const performancePublishIntervalMs = 500;

type GlobeEngineOptions = {
  container: HTMLElement;
  basemapProvider?: BasemapProvider;
  onPerformanceUpdate?: (
    snapshot: GlobePerformanceSnapshot,
  ) => void;
  initialCamera?: GlobeCameraTarget;
};

export class GlobeEngine {
  readonly map: MapLibreMap;
  readonly events = new GlobeEventHub();
  private readonly resizeObserver: ResizeObserver;
  private readonly reducedMotionQuery: MediaQueryList;
  private readonly performanceAccumulator:
    | GlobePerformanceAccumulator
    | null;
  private readonly performanceObserver: PerformanceObserver | null;
  private lastPerformancePublishAt = 0;

  constructor({
    container,
    basemapProvider,
    onPerformanceUpdate,
    initialCamera,
  }: GlobeEngineOptions) {
    const startedAt = performance.now();
    this.performanceAccumulator = onPerformanceUpdate
      ? new GlobePerformanceAccumulator({ startedAt })
      : null;
    this.performanceObserver = this.createPerformanceObserver(
      onPerformanceUpdate,
    );
    ensureMapLibreWorker();
    ensurePMTilesProtocol();
    this.reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const resolvedBasemapProvider = resolveBasemapProvider(
      basemapProvider,
      window.location.origin,
    );
    const resolvedInitialCamera = resolveGlobeCameraCommand(
      {
        type: "jump-to",
        target: initialCamera ?? initialGlobeCamera,
      },
      false,
    );

    if (resolvedInitialCamera.type !== "jump-to") {
      throw new Error("Invalid initial globe camera command");
    }

    const startingCamera = {
      ...initialGlobeCamera,
      ...resolvedInitialCamera.target,
    };

    this.map = new maplibregl.Map({
      container,
      style: createGlobeStyle(resolvedBasemapProvider),
      ...startingCamera,
      center: [...startingCamera.center],
      minZoom: globeCameraLimits.minZoom,
      maxZoom: globeCameraLimits.maxZoom,
      attributionControl: {
        compact: true,
      },
      dragRotate: true,
      touchPitch: false,
      keyboard: true,
      renderWorldCopies: false,
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.map.resize();
    });
    this.resizeObserver.observe(container);

    let hasLoaded = false;

    this.map.once("load", () => {
      hasLoaded = true;
      this.performanceAccumulator?.recordMapLoad(performance.now());
      this.publishPerformance(onPerformanceUpdate, true);
      this.events.emit({ type: "ready" });
    });

    this.map.on("render", () => {
      this.performanceAccumulator?.recordFrame(performance.now());
      this.publishPerformance(onPerformanceUpdate);
    });

    this.map.on("moveend", () => {
      this.events.emit({
        type: "camera-change",
        camera: this.getCameraSnapshot(),
      });
    });

    this.map.on("error", (event) => {
      if (!hasLoaded) {
        this.events.emit({
          type: "error",
          error: normalizeGlobeEventError(event.error),
        });
      }
    });

    this.map.on("webglcontextlost", () => {
      this.events.emit({
        type: "error",
        error: new Error(
          "图形渲染上下文已丢失，请刷新页面后重试",
        ),
      });
    });

    this.map.on("click", (event) => {
      this.selectAt(
        [event.point.x, event.point.y],
        [event.lngLat.lng, event.lngLat.lat],
      );
    });
  }

  executeCameraCommand(command: GlobeCameraCommand) {
    const resolved = resolveGlobeCameraCommand(
      command,
      this.reducedMotionQuery.matches,
    );

    this.map.stop();

    switch (resolved.type) {
      case "jump-to":
        this.map.jumpTo({
          ...resolved.target,
          center: [...resolved.target.center],
        });
        return;
      case "fly-to":
        this.map.flyTo({
          ...resolved.target,
          center: [...resolved.target.center],
          duration: resolved.durationMs,
          essential: false,
        });
        return;
      case "fit-bounds":
        this.map.fitBounds(
          [
            [...resolved.bounds[0]],
            [...resolved.bounds[1]],
          ],
          {
            padding: resolved.padding,
            maxZoom: resolved.maxZoom,
            duration: resolved.durationMs,
            essential: false,
          },
        );
        return;
      case "reset":
        this.map.easeTo({
          ...resolved.target,
          center: [...resolved.target.center],
          duration: resolved.durationMs,
          essential: false,
        });
        return;
      case "stop":
        return;
    }
  }

  jumpTo(target: GlobeCameraTarget) {
    this.executeCameraCommand({ type: "jump-to", target });
  }

  flyTo({
    durationMs,
    ...target
  }: GlobeCameraTarget & {
    durationMs?: number;
  }) {
    const command: GlobeFlyToCommand = {
      type: "fly-to",
      target,
      durationMs,
    };
    this.executeCameraCommand(command);
  }

  fitBounds(
    options: Omit<GlobeFitBoundsCommand, "type">,
  ) {
    this.executeCameraCommand({
      type: "fit-bounds",
      ...options,
    });
  }

  resetView() {
    this.executeCameraCommand({ type: "reset" });
  }

  stopCamera() {
    this.executeCameraCommand({ type: "stop" });
  }

  getCameraSnapshot(): GlobeCameraSnapshot {
    const center = this.map.getCenter();

    return {
      center: [center.lng, center.lat],
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing(),
    };
  }

  selectAt(
    screenPoint: GlobeScreenPoint,
    coordinate?: readonly [number, number],
  ): GlobeSelectionChange {
    const point: [number, number] = [
      screenPoint[0],
      screenPoint[1],
    ];
    const lngLat = coordinate
      ? { lng: coordinate[0], lat: coordinate[1] }
      : this.map.unproject(point);
    const layerIds = getSelectableGlobeLayerIds().filter(
      (layerId) => this.map.getLayer(layerId),
    );
    const renderedFeatures =
      layerIds.length === 0
        ? []
        : this.map.queryRenderedFeatures(point, {
            layers: [...layerIds],
          });
    const selection = createGlobeSelectionChange(
      [lngLat.lng, lngLat.lat],
      screenPoint,
      renderedFeatures.map((feature) => ({
        id: feature.id,
        layerId: feature.layer.id,
        sourceId: feature.source,
        sourceLayer: feature.sourceLayer,
        geometryType: feature.geometry.type,
        properties: feature.properties,
      })),
    );

    this.events.emit({
      type: "selection-change",
      selection,
    });
    return selection;
  }

  setLayerVisibility(layerId: GlobeLayerId, visible: boolean) {
    if (!this.map.getLayer(layerId)) {
      return;
    }

    this.map.setLayoutProperty(
      layerId,
      "visibility",
      visible ? "visible" : "none",
    );
  }

  setLayerGroupVisibility(
    groupId: GlobeLayerGroupId,
    visible: boolean,
    emitEvent = true,
  ) {
    for (const layerId of getGlobeLayerIdsForGroup(groupId)) {
      this.setLayerVisibility(layerId, visible);
    }

    if (emitEvent) {
      this.events.emit({
        type: "layer-visibility-change",
        groupId,
        visible,
      });
    }
  }

  destroy() {
    this.performanceObserver?.disconnect();
    this.resizeObserver.disconnect();
    this.events.clear();
    this.map.remove();
  }

  private createPerformanceObserver(
    onPerformanceUpdate?: (
      snapshot: GlobePerformanceSnapshot,
    ) => void,
  ): PerformanceObserver | null {
    if (
      !this.performanceAccumulator ||
      typeof PerformanceObserver === "undefined" ||
      !PerformanceObserver.supportedEntryTypes.includes("longtask")
    ) {
      return null;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.performanceAccumulator?.recordLongTask(entry.duration);
      }

      this.publishPerformance(onPerformanceUpdate);
    });

    observer.observe({ type: "longtask", buffered: true });
    return observer;
  }

  private publishPerformance(
    onPerformanceUpdate?: (
      snapshot: GlobePerformanceSnapshot,
    ) => void,
    force = false,
  ) {
    if (!this.performanceAccumulator || !onPerformanceUpdate) {
      return;
    }

    const now = performance.now();

    if (
      !force &&
      now - this.lastPerformancePublishAt <
        performancePublishIntervalMs
    ) {
      return;
    }

    this.lastPerformancePublishAt = now;
    onPerformanceUpdate(this.performanceAccumulator.snapshot());
  }
}
