"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import type { BasemapProvider } from "@/globe/basemap-provider";
import { GlobeEngine } from "@/globe/engine";
import {
  normalizeGlobeEventError,
  type GlobeEvent,
} from "@/globe/events";
import {
  createDefaultLayerGroupVisibility,
  globeLayerGroups,
  type GlobeLayerGroupId,
} from "@/globe/layer-registry";
import type { GlobePerformanceSnapshot } from "@/globe/performance";
import {
  createGlobeShareUrl,
  parseGlobeUrlState,
  type GlobeUrlState,
} from "@/globe/url-state";
import {
  initialGlobeRuntimeStatus,
  reduceGlobeRuntimeStatus,
} from "@/globe/runtime-status";

type GlobeViewportProps = {
  basemapProvider?: BasemapProvider;
  onGlobeEvent?: (event: GlobeEvent) => void;
};

const showPerformancePanel = process.env.NODE_ENV === "development";

function formatDuration(duration: number | null) {
  return duration === null ? "—" : `${duration.toFixed(1)} ms`;
}

function formatLongTasks(
  snapshot: GlobePerformanceSnapshot | null,
) {
  if (!snapshot || snapshot.longTaskCount === 0) {
    return "0";
  }

  return `${snapshot.longTaskCount} · ${Math.round(
    snapshot.maxLongTaskMs ?? 0,
  )} ms`;
}

function replaceGlobeUrlState(state: GlobeUrlState) {
  const nextUrl = createGlobeShareUrl(
    new URL(window.location.href),
    state,
  );

  if (nextUrl.toString() !== window.location.href) {
    window.history.replaceState(
      window.history.state,
      "",
      nextUrl,
    );
  }
}

export function GlobeViewport({
  basemapProvider,
  onGlobeEvent,
}: GlobeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const layerButtonRef = useRef<HTMLButtonElement>(null);
  const layerPanelId = useId();
  const [status, dispatch] = useReducer(
    reduceGlobeRuntimeStatus,
    initialGlobeRuntimeStatus,
  );
  const [isLayerPanelOpen, setIsLayerPanelOpen] =
    useState(false);
  const [layerVisibility, setLayerVisibility] = useState(
    createDefaultLayerGroupVisibility,
  );
  const layerVisibilityRef = useRef(layerVisibility);
  const onGlobeEventRef = useRef(onGlobeEvent);
  const [performanceSnapshot, setPerformanceSnapshot] =
    useState<GlobePerformanceSnapshot | null>(null);

  useEffect(() => {
    onGlobeEventRef.current = onGlobeEvent;
  }, [onGlobeEvent]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let isActive = true;
    const initialUrlState = parseGlobeUrlState(
      window.location.search,
    );
    layerVisibilityRef.current =
      initialUrlState.layerVisibility;
    setLayerVisibility(initialUrlState.layerVisibility);
    dispatch({ type: "initialize" });

    try {
      const engine = new GlobeEngine({
        container: containerRef.current,
        basemapProvider,
        initialCamera: initialUrlState.camera,
        onPerformanceUpdate: showPerformancePanel
          ? (snapshot) => {
              if (isActive) {
                setPerformanceSnapshot(snapshot);
              }
            }
          : undefined,
      });

      engineRef.current = engine;
      const unsubscribe = engine.events.subscribe((event) => {
        if (!isActive) {
          return;
        }

        switch (event.type) {
          case "ready":
            for (const [
              groupId,
              visible,
            ] of Object.entries(layerVisibilityRef.current)) {
              engine.setLayerGroupVisibility(
                groupId as GlobeLayerGroupId,
                visible,
                false,
              );
            }
            dispatch({ type: "ready" });
            break;
          case "error":
            dispatch({ type: "fail", error: event.error });
            break;
          case "camera-change":
            replaceGlobeUrlState({
              camera: event.camera,
              layerVisibility: layerVisibilityRef.current,
            });
            break;
          case "selection-change":
          case "layer-visibility-change":
            break;
        }

        onGlobeEventRef.current?.(event);
      });

      return () => {
        isActive = false;
        unsubscribe();
        engineRef.current = null;
        engine.destroy();
      };
    } catch (error) {
      dispatch({ type: "fail", error });
      onGlobeEventRef.current?.({
        type: "error",
        error: normalizeGlobeEventError(error),
      });
      return () => {
        isActive = false;
      };
    }
  }, [basemapProvider]);

  function resetView() {
    engineRef.current?.resetView();
  }

  function toggleLayerGroup(groupId: GlobeLayerGroupId) {
    setLayerVisibility((current) => {
      const visible = !current[groupId];
      const next = {
        ...current,
        [groupId]: visible,
      };

      layerVisibilityRef.current = next;
      engineRef.current?.setLayerGroupVisibility(
        groupId,
        visible,
      );
      const engine = engineRef.current;

      if (engine) {
        replaceGlobeUrlState({
          camera: engine.getCameraSnapshot(),
          layerVisibility: next,
        });
      }
      return next;
    });
  }

  return (
    <section className="globe-viewport-shell" aria-label="三维地球">
      <div
        ref={containerRef}
        className="globe-viewport"
        aria-label="可交互的三维地球"
      />

      <div
        className={`globe-runtime glass-surface globe-runtime--${status.phase}`}
        role={status.phase === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        <span className="globe-runtime__indicator" aria-hidden="true" />
        <span>{status.message}</span>
      </div>

      <div className="globe-controls" aria-label="地球控制">
        <button
          type="button"
          className="globe-control glass-surface"
          onClick={resetView}
          disabled={status.phase !== "ready"}
        >
          复位视角
        </button>
        <button
          ref={layerButtonRef}
          type="button"
          className="globe-control glass-surface"
          aria-expanded={isLayerPanelOpen}
          aria-controls={layerPanelId}
          onClick={() =>
            setIsLayerPanelOpen((isOpen) => !isOpen)
          }
        >
          图层
        </button>
      </div>

      {isLayerPanelOpen ? (
        <div
          id={layerPanelId}
          className="globe-layer-panel glass-surface"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsLayerPanelOpen(false);
              layerButtonRef.current?.focus();
            }
          }}
        >
          <fieldset>
            <legend>地图图层</legend>
            {globeLayerGroups.map((group) => (
              <label
                key={group.id}
                className="globe-layer-option"
              >
                <input
                  type="checkbox"
                  checked={layerVisibility[group.id]}
                  disabled={status.phase !== "ready"}
                  onChange={() => toggleLayerGroup(group.id)}
                />
                <span>
                  <strong>{group.label}</strong>
                  <small>{group.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      {showPerformancePanel ? (
        <aside
          className="globe-performance glass-surface"
          aria-label="开发环境地球性能"
        >
          <p className="globe-performance__title">Engine telemetry</p>
          <dl className="globe-performance__metrics">
            <div>
              <dt>加载</dt>
              <dd>
                {formatDuration(
                  performanceSnapshot?.mapLoadMs ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt>帧均值</dt>
              <dd>
                {formatDuration(
                  performanceSnapshot?.averageFrameMs ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt>帧 P95</dt>
              <dd>
                {formatDuration(
                  performanceSnapshot?.p95FrameMs ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt>长任务</dt>
              <dd>{formatLongTasks(performanceSnapshot)}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </section>
  );
}
