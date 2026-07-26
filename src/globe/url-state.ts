import { initialGlobeCamera } from "./camera.ts";
import {
  resolveGlobeCameraCommand,
  type GlobeCameraSnapshot,
} from "./camera-command.ts";
import {
  createDefaultLayerGroupVisibility,
  globeLayerGroups,
  isGlobeLayerGroupId,
  type GlobeLayerGroupId,
} from "./layer-registry.ts";

export type GlobeUrlState = {
  camera: GlobeCameraSnapshot;
  layerVisibility: Record<GlobeLayerGroupId, boolean>;
};

const viewParameter = "gm-view";
const hiddenLayersParameter = "gm-hidden";
const urlStateVersion = "1";

function createDefaultCamera(): GlobeCameraSnapshot {
  return {
    center: [...initialGlobeCamera.center],
    zoom: initialGlobeCamera.zoom,
    pitch: initialGlobeCamera.pitch,
    bearing: initialGlobeCamera.bearing,
  };
}

export function createDefaultGlobeUrlState(): GlobeUrlState {
  return {
    camera: createDefaultCamera(),
    layerVisibility: createDefaultLayerGroupVisibility(),
  };
}

function parseCamera(value: string | null): GlobeCameraSnapshot {
  if (!value) {
    return createDefaultCamera();
  }

  const [version, lng, lat, zoom, bearing, pitch, ...rest] =
    value.split(",");

  if (
    version !== urlStateVersion ||
    rest.length > 0 ||
    [lng, lat, zoom, bearing, pitch].some(
      (part) => part === undefined || part.trim() === "",
    )
  ) {
    return createDefaultCamera();
  }

  const values = [lng, lat, zoom, bearing, pitch].map(Number);

  try {
    const resolved = resolveGlobeCameraCommand(
      {
        type: "jump-to",
        target: {
          center: [values[0], values[1]],
          zoom: values[2],
          bearing: values[3],
          pitch: values[4],
        },
      },
      false,
    );

    if (resolved.type !== "jump-to") {
      return createDefaultCamera();
    }

    return {
      center: resolved.target.center,
      zoom: resolved.target.zoom ?? initialGlobeCamera.zoom,
      bearing:
        resolved.target.bearing ?? initialGlobeCamera.bearing,
      pitch: resolved.target.pitch ?? initialGlobeCamera.pitch,
    };
  } catch {
    return createDefaultCamera();
  }
}

export function parseGlobeUrlState(
  search: string,
): GlobeUrlState {
  const parameters = new URLSearchParams(search);
  const layerVisibility = createDefaultLayerGroupVisibility();
  const hiddenGroups = parameters
    .get(hiddenLayersParameter)
    ?.split(",")
    .filter(Boolean);

  for (const groupId of hiddenGroups ?? []) {
    if (isGlobeLayerGroupId(groupId)) {
      layerVisibility[groupId] = false;
    }
  }

  return {
    camera: parseCamera(parameters.get(viewParameter)),
    layerVisibility,
  };
}

function formatNumber(value: number, precision: number): string {
  const rounded = Number(value.toFixed(precision));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function encodeCamera(camera: GlobeCameraSnapshot): string {
  return [
    urlStateVersion,
    formatNumber(camera.center[0], 5),
    formatNumber(camera.center[1], 5),
    formatNumber(camera.zoom, 3),
    formatNumber(camera.bearing, 2),
    formatNumber(camera.pitch, 2),
  ].join(",");
}

const defaultEncodedCamera = encodeCamera(createDefaultCamera());

export function createGlobeShareUrl(
  currentUrl: URL,
  state: GlobeUrlState,
): URL {
  const nextUrl = new URL(currentUrl.toString());
  const encodedCamera = encodeCamera(state.camera);
  const hiddenGroups = globeLayerGroups.flatMap((group) =>
    state.layerVisibility[group.id] ? [] : [group.id],
  );

  if (encodedCamera === defaultEncodedCamera) {
    nextUrl.searchParams.delete(viewParameter);
  } else {
    nextUrl.searchParams.set(viewParameter, encodedCamera);
  }

  if (hiddenGroups.length === 0) {
    nextUrl.searchParams.delete(hiddenLayersParameter);
  } else {
    nextUrl.searchParams.set(
      hiddenLayersParameter,
      hiddenGroups.join(","),
    );
  }

  return nextUrl;
}
