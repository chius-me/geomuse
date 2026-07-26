import {
  globeCameraLimits,
  initialGlobeCamera,
  resolveCameraDuration,
} from "./camera.ts";

export type GlobeCoordinate = readonly [
  longitude: number,
  latitude: number,
];

export type GlobeCameraTarget = {
  center: GlobeCoordinate;
  zoom?: number;
  pitch?: number;
  bearing?: number;
};

export type GlobeCameraSnapshot = Required<GlobeCameraTarget>;

export type GlobeCameraPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type GlobeJumpToCommand = {
  type: "jump-to";
  target: GlobeCameraTarget;
};

export type GlobeFlyToCommand = {
  type: "fly-to";
  target: GlobeCameraTarget;
  durationMs?: number;
};

export type GlobeFitBoundsCommand = {
  type: "fit-bounds";
  bounds: readonly [
    southwest: GlobeCoordinate,
    northeast: GlobeCoordinate,
  ];
  padding?: number | GlobeCameraPadding;
  maxZoom?: number;
  durationMs?: number;
};

export type GlobeResetCameraCommand = {
  type: "reset";
  durationMs?: number;
};

export type GlobeStopCameraCommand = {
  type: "stop";
};

export type GlobeCameraCommand =
  | GlobeJumpToCommand
  | GlobeFlyToCommand
  | GlobeFitBoundsCommand
  | GlobeResetCameraCommand
  | GlobeStopCameraCommand;

export type ResolvedGlobeCameraCommand =
  | GlobeJumpToCommand
  | (Omit<GlobeFlyToCommand, "durationMs"> & {
      durationMs: number;
    })
  | (Omit<GlobeFitBoundsCommand, "durationMs" | "padding"> & {
      durationMs: number;
      padding: number | GlobeCameraPadding;
    })
  | {
      type: "reset";
      target: GlobeCameraSnapshot;
      durationMs: number;
    }
  | GlobeStopCameraCommand;

const defaultFlyDurationMs = 1800;
const defaultFitBoundsDurationMs = 1200;
const defaultResetDurationMs = 1200;
const defaultFitBoundsPadding = 48;

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }
}

function validateCoordinate(
  [longitude, latitude]: GlobeCoordinate,
  label: string,
) {
  assertFiniteNumber(longitude, `${label} longitude`);
  assertFiniteNumber(latitude, `${label} latitude`);

  if (longitude < -180 || longitude > 180) {
    throw new RangeError(`${label} longitude must be within -180..180`);
  }

  if (latitude < -90 || latitude > 90) {
    throw new RangeError(`${label} latitude must be within -90..90`);
  }
}

function validateTarget(target: GlobeCameraTarget) {
  validateCoordinate(target.center, "camera center");

  if (target.zoom !== undefined) {
    assertFiniteNumber(target.zoom, "camera zoom");

    if (
      target.zoom < globeCameraLimits.minZoom ||
      target.zoom > globeCameraLimits.maxZoom
    ) {
      throw new RangeError(
        `camera zoom must be within ${globeCameraLimits.minZoom}..${globeCameraLimits.maxZoom}`,
      );
    }
  }

  if (target.pitch !== undefined) {
    assertFiniteNumber(target.pitch, "camera pitch");

    if (
      target.pitch < globeCameraLimits.minPitch ||
      target.pitch > globeCameraLimits.maxPitch
    ) {
      throw new RangeError(
        `camera pitch must be within ${globeCameraLimits.minPitch}..${globeCameraLimits.maxPitch}`,
      );
    }
  }

  if (target.bearing !== undefined) {
    assertFiniteNumber(target.bearing, "camera bearing");
  }
}

function validatePadding(padding: number | GlobeCameraPadding) {
  const values =
    typeof padding === "number"
      ? [padding]
      : [
          padding.top,
          padding.right,
          padding.bottom,
          padding.left,
        ];

  for (const value of values) {
    assertFiniteNumber(value, "camera padding");

    if (value < 0) {
      throw new RangeError("camera padding cannot be negative");
    }
  }
}

function resolveDuration(
  durationMs: number,
  prefersReducedMotion: boolean,
) {
  assertFiniteNumber(durationMs, "camera duration");
  return resolveCameraDuration(durationMs, prefersReducedMotion);
}

export function resolveGlobeCameraCommand(
  command: GlobeCameraCommand,
  prefersReducedMotion: boolean,
): ResolvedGlobeCameraCommand {
  switch (command.type) {
    case "jump-to":
      validateTarget(command.target);
      return command;
    case "fly-to":
      validateTarget(command.target);
      return {
        ...command,
        durationMs: resolveDuration(
          command.durationMs ?? defaultFlyDurationMs,
          prefersReducedMotion,
        ),
      };
    case "fit-bounds": {
      const padding = command.padding ?? defaultFitBoundsPadding;
      validateCoordinate(command.bounds[0], "southwest bound");
      validateCoordinate(command.bounds[1], "northeast bound");
      validatePadding(padding);

      if (command.maxZoom !== undefined) {
        assertFiniteNumber(command.maxZoom, "camera maxZoom");

        if (
          command.maxZoom < globeCameraLimits.minZoom ||
          command.maxZoom > globeCameraLimits.maxZoom
        ) {
          throw new RangeError(
            `camera maxZoom must be within ${globeCameraLimits.minZoom}..${globeCameraLimits.maxZoom}`,
          );
        }
      }

      return {
        ...command,
        padding,
        durationMs: resolveDuration(
          command.durationMs ?? defaultFitBoundsDurationMs,
          prefersReducedMotion,
        ),
      };
    }
    case "reset":
      return {
        type: "reset",
        target: initialGlobeCamera,
        durationMs: resolveDuration(
          command.durationMs ?? defaultResetDurationMs,
          prefersReducedMotion,
        ),
      };
    case "stop":
      return command;
  }
}
