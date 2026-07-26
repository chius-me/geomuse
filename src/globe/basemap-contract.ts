export const basemapContract = {
  version: 1,
  naturalEarthVersion: "5.1.2",
  minZoom: 0,
  maxZoom: 6,
  expectedAddressedTiles: 2_951,
  attribution:
    "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.",
  layers: [
    {
      id: "land",
      fileName: "ne_110m_land.geojson",
      sha256:
        "9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9",
      minZoom: 0,
      description: "Natural Earth 1:110m land polygons.",
    },
    {
      id: "lakes",
      fileName: "ne_110m_lakes.geojson",
      sha256:
        "eb02ecc86c82004fccbf979058bfabbbd6c2d07968c7844d38eb1c9152d2ffc9",
      minZoom: 1,
      description: "Natural Earth 1:110m lake polygons.",
    },
    {
      id: "rivers",
      fileName: "ne_110m_rivers_lake_centerlines.geojson",
      sha256:
        "55aa4497405afc07cdc931b7fbe062c4d6693ba2a550c0d24899953f5d507c8d",
      minZoom: 2,
      description:
        "Natural Earth 1:110m river and lake centerlines.",
    },
    {
      id: "boundaries",
      fileName: "ne_110m_admin_0_boundary_lines_land.geojson",
      sha256:
        "d42479fd79552cca4eec7f85fcdca717a790d29ff06be7676f1af0568c6d3f7c",
      minZoom: 2,
      description:
        "Natural Earth 1:110m land boundaries filtered to ordinary international boundaries.",
      featureFilter: {
        property: "FEATURECLA",
        allowedValues: ["International boundary (verify)"],
      },
    },
  ],
} as const;

export type BasemapLayerId =
  (typeof basemapContract.layers)[number]["id"];

type SourceFeature = {
  properties?: Record<string, unknown> | null;
};

export function filterFeaturesForLayer<T extends SourceFeature>(
  features: readonly T[],
  layer: (typeof basemapContract.layers)[number],
): T[] {
  if (!("featureFilter" in layer)) {
    return [...features];
  }

  return features.filter((feature) => {
    const propertyValue = String(
      feature.properties?.[layer.featureFilter.property] ?? "",
    );

    return layer.featureFilter.allowedValues.some(
      (allowedValue) => allowedValue === propertyValue,
    );
  });
}
