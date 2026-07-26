export const globeLayerRegistry = {
  ocean: {
    id: "ocean",
    label: "海洋",
    toggleable: false,
    selectable: false,
  },
  land: {
    id: "land",
    label: "陆地",
    sourceLayer: "land",
    toggleable: false,
    selectable: true,
  },
  lakes: {
    id: "lakes",
    label: "湖泊",
    sourceLayer: "lakes",
    toggleable: true,
    selectable: true,
  },
  rivers: {
    id: "rivers",
    label: "主要河流",
    sourceLayer: "rivers",
    toggleable: true,
    selectable: true,
  },
  boundaries: {
    id: "boundaries",
    label: "参考边界",
    sourceLayer: "boundaries",
    toggleable: true,
    selectable: true,
  },
  graticule: {
    id: "graticule",
    label: "经纬网",
    toggleable: true,
    selectable: false,
  },
} as const;

export type GlobeLayerId = keyof typeof globeLayerRegistry;

const selectableGlobeLayerIds = Object.values(
  globeLayerRegistry,
)
  .filter((layer) => layer.selectable)
  .map((layer) => layer.id) as GlobeLayerId[];

export function getSelectableGlobeLayerIds(): readonly GlobeLayerId[] {
  return selectableGlobeLayerIds;
}

export function isSelectableGlobeLayerId(
  layerId: string,
): layerId is GlobeLayerId {
  return selectableGlobeLayerIds.includes(
    layerId as GlobeLayerId,
  );
}

export const globeLayerGroups = [
  {
    id: "water",
    label: "水系",
    description: "湖泊与主要河流",
    layerIds: ["lakes", "rivers"],
    defaultVisible: true,
  },
  {
    id: "boundaries",
    label: "参考边界",
    description: "小比例尺普通国际边界",
    layerIds: ["boundaries"],
    defaultVisible: true,
  },
  {
    id: "graticule",
    label: "经纬网",
    description: "15° 间隔辅助线",
    layerIds: ["graticule"],
    defaultVisible: true,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  layerIds: readonly GlobeLayerId[];
  defaultVisible: boolean;
}[];

export type GlobeLayerGroupId =
  (typeof globeLayerGroups)[number]["id"];

export function isGlobeLayerGroupId(
  groupId: string,
): groupId is GlobeLayerGroupId {
  return globeLayerGroups.some((group) => group.id === groupId);
}

export function getGlobeLayerIdsForGroup(
  groupId: GlobeLayerGroupId,
): readonly GlobeLayerId[] {
  const group = globeLayerGroups.find(
    (candidate) => candidate.id === groupId,
  );

  if (!group) {
    return [];
  }

  return group.layerIds;
}

export function createDefaultLayerGroupVisibility(): Record<
  GlobeLayerGroupId,
  boolean
> {
  return Object.fromEntries(
    globeLayerGroups.map((group) => [
      group.id,
      group.defaultVisible,
    ]),
  ) as Record<GlobeLayerGroupId, boolean>;
}
