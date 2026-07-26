import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import geojsonvt from "geojson-vt";
import { zxyToTileId } from "pmtiles";
import vtpbf from "vt-pbf";
import {
  basemapContract,
  filterFeaturesForLayer,
} from "../src/globe/basemap-contract.ts";

const NATURAL_EARTH_VERSION = basemapContract.naturalEarthVersion;
const NATURAL_EARTH_BASE_URL =
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v${NATURAL_EARTH_VERSION}/geojson`;
const NATURAL_EARTH_DATASETS = basemapContract.layers;
const MIN_ZOOM = basemapContract.minZoom;
const MAX_ZOOM = basemapContract.maxZoom;
const PMTILES_HEADER_SIZE = 127;
const MAX_ROOT_DIRECTORY_SIZE = 16_384 - PMTILES_HEADER_SIZE;

const projectRoot = resolve(import.meta.dirname, "..");
const cacheDirectory = resolve(projectRoot, ".cache/natural-earth");
const outputPath = resolve(
  projectRoot,
  "public/maps/geomuse-basemap.pmtiles",
);
const temporaryOutputPath = `${outputPath}.tmp`;

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function loadNaturalEarth(dataset) {
  const cachePath = resolve(cacheDirectory, dataset.fileName);

  if (existsSync(cachePath)) {
    const cached = readFileSync(cachePath);
    if (sha256(cached) === dataset.sha256) {
      return {
        ...dataset,
        geojson: prepareFeatureCollection(
          JSON.parse(cached.toString("utf8")),
          dataset,
        ),
      };
    }

    rmSync(cachePath);
  }

  console.log(
    `Downloading Natural Earth ${NATURAL_EARTH_VERSION} ${dataset.id} data…`,
  );
  const response = await fetch(
    `${NATURAL_EARTH_BASE_URL}/${dataset.fileName}`,
  );
  if (!response.ok) {
    throw new Error(
      `Natural Earth ${dataset.id} download failed: ${response.status} ${response.statusText}`,
    );
  }

  const source = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(source);
  if (actualHash !== dataset.sha256) {
    throw new Error(
      `Natural Earth ${dataset.id} checksum mismatch: expected ${dataset.sha256}, received ${actualHash}`,
    );
  }

  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, source);
  return {
    ...dataset,
    geojson: prepareFeatureCollection(
      JSON.parse(source.toString("utf8")),
      dataset,
    ),
  };
}

function prepareFeatureCollection(geojson, dataset) {
  if (
    geojson?.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    throw new Error("Expected a GeoJSON FeatureCollection");
  }

  const features = filterFeaturesForLayer(
    geojson.features,
    dataset,
  );

  return {
    ...geojson,
    features: features.map((feature) => ({
      ...feature,
      properties: {},
    })),
  };
}

function createVectorTiles(datasets) {
  const tileIndexes = datasets.map((dataset) => ({
    ...dataset,
    tileIndex: geojsonvt(dataset.geojson, {
      maxZoom: MAX_ZOOM,
      indexMaxZoom: MAX_ZOOM,
      indexMaxPoints: 0,
      tolerance: 1,
      extent: 4096,
      buffer: 64,
    }),
  }));
  const tiles = [];

  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom += 1) {
    const dimension = 2 ** zoom;
    for (let x = 0; x < dimension; x += 1) {
      for (let y = 0; y < dimension; y += 1) {
        const tileLayers = {};

        for (const dataset of tileIndexes) {
          if (zoom < dataset.minZoom) {
            continue;
          }

          const tile = dataset.tileIndex.getTile(zoom, x, y);
          if (tile?.features.length) {
            tileLayers[dataset.id] = tile;
          }
        }

        if (Object.keys(tileLayers).length === 0) {
          continue;
        }

        const vectorTile = vtpbf.fromGeojsonVt(tileLayers);
        tiles.push({
          tileId: zxyToTileId(zoom, x, y),
          data: gzipSync(vectorTile, { level: 9 }),
        });
      }
    }
  }

  tiles.sort((left, right) => left.tileId - right.tileId);
  console.log(`Created ${tiles.length.toLocaleString()} vector tiles.`);
  return tiles;
}

function encodeVarint(value) {
  const bytes = [];
  let remaining = value;
  while (remaining >= 0x80) {
    bytes.push((remaining % 0x80) | 0x80);
    remaining = Math.floor(remaining / 0x80);
  }
  bytes.push(remaining);
  return Buffer.from(bytes);
}

function serializeDirectory(entries) {
  const parts = [encodeVarint(entries.length)];
  let lastTileId = 0;

  for (const entry of entries) {
    parts.push(encodeVarint(entry.tileId - lastTileId));
    lastTileId = entry.tileId;
  }
  for (const entry of entries) {
    parts.push(encodeVarint(entry.runLength));
  }
  for (const entry of entries) {
    parts.push(encodeVarint(entry.length));
  }
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const previous = entries[index - 1];
    const isContiguous =
      previous && entry.offset === previous.offset + previous.length;
    parts.push(encodeVarint(isContiguous ? 0 : entry.offset + 1));
  }

  return gzipSync(Buffer.concat(parts), { level: 9 });
}

function writeUint64(buffer, offset, value) {
  buffer.writeBigUInt64LE(BigInt(value), offset);
}

function serializeHeader(header) {
  const buffer = Buffer.alloc(PMTILES_HEADER_SIZE);
  buffer.write("PMTiles", 0, "ascii");
  buffer.writeUInt8(3, 7);
  writeUint64(buffer, 8, header.rootOffset);
  writeUint64(buffer, 16, header.rootLength);
  writeUint64(buffer, 24, header.metadataOffset);
  writeUint64(buffer, 32, header.metadataLength);
  writeUint64(buffer, 40, header.leafDirectoryOffset);
  writeUint64(buffer, 48, header.leafDirectoryLength);
  writeUint64(buffer, 56, header.tileDataOffset);
  writeUint64(buffer, 64, header.tileDataLength);
  writeUint64(buffer, 72, header.addressedTilesCount);
  writeUint64(buffer, 80, header.tileEntriesCount);
  writeUint64(buffer, 88, header.tileContentsCount);
  buffer.writeUInt8(1, 96);
  buffer.writeUInt8(2, 97);
  buffer.writeUInt8(2, 98);
  buffer.writeUInt8(1, 99);
  buffer.writeUInt8(MIN_ZOOM, 100);
  buffer.writeUInt8(MAX_ZOOM, 101);
  buffer.writeInt32LE(-1_800_000_000, 102);
  buffer.writeInt32LE(-850_511_287, 106);
  buffer.writeInt32LE(1_800_000_000, 110);
  buffer.writeInt32LE(850_511_287, 114);
  buffer.writeUInt8(0, 118);
  buffer.writeInt32LE(0, 119);
  buffer.writeInt32LE(150_000_000, 123);
  return buffer;
}

function createPmtiles(tiles) {
  let tileDataOffset = 0;
  const entries = tiles.map((tile) => {
    const entry = {
      tileId: tile.tileId,
      offset: tileDataOffset,
      length: tile.data.length,
      runLength: 1,
    };
    tileDataOffset += tile.data.length;
    return entry;
  });

  const rootDirectory = serializeDirectory(entries);
  if (rootDirectory.length > MAX_ROOT_DIRECTORY_SIZE) {
    throw new Error(
      `PMTiles root directory is ${rootDirectory.length} bytes; leaf directory generation is required above ${MAX_ROOT_DIRECTORY_SIZE} bytes`,
    );
  }

  const metadata = gzipSync(
    Buffer.from(
      JSON.stringify({
        name: "GeoMuse Natural Earth Basemap",
        description:
          "Low-resolution global land, lake, and river geometry generated from Natural Earth 1:110m data.",
        version: NATURAL_EARTH_VERSION,
        geomuse_basemap_contract: basemapContract.version,
        attribution: basemapContract.attribution,
        vector_layers: NATURAL_EARTH_DATASETS.map((dataset) => ({
          id: dataset.id,
          description: dataset.description,
          minzoom: dataset.minZoom,
          maxzoom: MAX_ZOOM,
          fields: {},
        })),
      }),
    ),
    { level: 9 },
  );

  const rootOffset = PMTILES_HEADER_SIZE;
  const metadataOffset = rootOffset + rootDirectory.length;
  const leafDirectoryOffset = metadataOffset + metadata.length;
  const header = serializeHeader({
    rootOffset,
    rootLength: rootDirectory.length,
    metadataOffset,
    metadataLength: metadata.length,
    leafDirectoryOffset,
    leafDirectoryLength: 0,
    tileDataOffset: leafDirectoryOffset,
    tileDataLength: tileDataOffset,
    addressedTilesCount: tiles.length,
    tileEntriesCount: entries.length,
    tileContentsCount: tiles.length,
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  rmSync(temporaryOutputPath, { force: true });
  writeFileSync(
    temporaryOutputPath,
    Buffer.concat([
      header,
      rootDirectory,
      metadata,
      ...tiles.map((tile) => tile.data),
    ]),
  );
  renameSync(temporaryOutputPath, outputPath);
  console.log(`Wrote ${outputPath}`);
}

const naturalEarth = await Promise.all(
  NATURAL_EARTH_DATASETS.map(loadNaturalEarth),
);
const vectorTiles = createVectorTiles(naturalEarth);
createPmtiles(vectorTiles);
