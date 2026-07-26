import type { FeatureCollection, LineString } from "geojson";

const coordinateStep = 2;

export function createGraticule(): FeatureCollection<LineString> {
  const features: FeatureCollection<LineString>["features"] = [];

  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const coordinates: [number, number][] = [];

    for (let longitude = -180; longitude <= 180; longitude += coordinateStep) {
      coordinates.push([longitude, latitude]);
    }

    features.push({
      type: "Feature",
      properties: { kind: "latitude", value: latitude },
      geometry: { type: "LineString", coordinates },
    });
  }

  for (let longitude = -180; longitude < 180; longitude += 15) {
    const coordinates: [number, number][] = [];

    for (let latitude = -85; latitude <= 85; latitude += coordinateStep) {
      coordinates.push([longitude, latitude]);
    }

    features.push({
      type: "Feature",
      properties: { kind: "longitude", value: longitude },
      geometry: { type: "LineString", coordinates },
    });
  }

  return {
    type: "FeatureCollection",
    features,
};
}
