export const initialGlobeCamera = {
  center: [108, 25] as const,
  zoom: 1.15,
  pitch: 0,
  bearing: 0,
} as const;

export const globeCameraLimits = {
  minZoom: 0,
  maxZoom: 6,
  minPitch: 0,
  maxPitch: 85,
} as const;

export function resolveCameraDuration(
  duration: number,
  prefersReducedMotion: boolean,
): number {
  if (prefersReducedMotion) {
    return 0;
  }

  return Math.max(0, duration);
}
