import {
  isSelectableGlobeLayerId,
  type GlobeLayerId,
} from "./layer-registry.ts";
import type { GlobeCoordinate } from "./camera-command.ts";

export type GlobeScreenPoint = readonly [x: number, y: number];

export type GlobeGeometryType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "GeometryCollection";

export type GlobeFeatureProperty =
  | string
  | number
  | boolean
  | null;

export type GlobeRenderedFeatureInput = {
  id?: unknown;
  layerId: string;
  sourceId?: string;
  sourceLayer?: string;
  geometryType: GlobeGeometryType;
  properties?: Readonly<Record<string, unknown>> | null;
};

export type GlobeSelectedFeature = {
  layerId: GlobeLayerId;
  sourceId?: string;
  sourceLayer?: string;
  id?: string | number;
  geometryType: GlobeGeometryType;
  properties: Readonly<Record<string, GlobeFeatureProperty>>;
};

export type GlobeSelectionChange = {
  coordinate: GlobeCoordinate;
  screenPoint: GlobeScreenPoint;
  feature: GlobeSelectedFeature | null;
};

function normalizeProperties(
  properties: GlobeRenderedFeatureInput["properties"],
): Record<string, GlobeFeatureProperty> {
  if (!properties) {
    return {};
  }

  const normalized: Record<string, GlobeFeatureProperty> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      normalized[key] = value;
    }
  }

  return normalized;
}

export function createGlobeSelectionChange(
  coordinate: GlobeCoordinate,
  screenPoint: GlobeScreenPoint,
  renderedFeatures: readonly GlobeRenderedFeatureInput[],
): GlobeSelectionChange {
  const renderedFeature = renderedFeatures.find((feature) =>
    isSelectableGlobeLayerId(feature.layerId),
  );

  if (!renderedFeature) {
    return {
      coordinate,
      screenPoint,
      feature: null,
    };
  }

  const layerId = renderedFeature.layerId;

  if (!isSelectableGlobeLayerId(layerId)) {
    return {
      coordinate,
      screenPoint,
      feature: null,
    };
  }

  const id =
    typeof renderedFeature.id === "string" ||
    typeof renderedFeature.id === "number"
      ? renderedFeature.id
      : undefined;

  return {
    coordinate,
    screenPoint,
    feature: {
      layerId,
      sourceId: renderedFeature.sourceId,
      sourceLayer: renderedFeature.sourceLayer,
      id,
      geometryType: renderedFeature.geometryType,
      properties: normalizeProperties(renderedFeature.properties),
    },
  };
}
