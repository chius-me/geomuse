import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PMTiles } from "pmtiles";
import { basemapContract } from "../src/globe/basemap-contract.ts";

const archivePath = resolve(
  import.meta.dirname,
  "../public/maps/geomuse-basemap.pmtiles",
);
const archive = readFileSync(archivePath);

const source = {
  getKey() {
    return archivePath;
  },
  async getBytes(offset, length) {
    const data = archive.subarray(offset, offset + length);
    return {
      data: data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ),
    };
  },
};

const pmtiles = new PMTiles(source);
const header = await pmtiles.getHeader();
const metadata = await pmtiles.getMetadata();
const worldTile = await pmtiles.getZxy(0, 0, 0);
const expectedLayers = basemapContract.layers.map(
  ({ id, minZoom }) => ({ id, minzoom: minZoom }),
);

const problems = [];
if (header.specVersion !== 3) {
  problems.push(`expected PMTiles v3, received v${header.specVersion}`);
}
if (header.tileType !== 1) {
  problems.push(`expected MVT tile type 1, received ${header.tileType}`);
}
if (
  header.minZoom !== basemapContract.minZoom ||
  header.maxZoom !== basemapContract.maxZoom
) {
  problems.push(
    `expected zoom range ${basemapContract.minZoom}–${basemapContract.maxZoom}, received ${header.minZoom}–${header.maxZoom}`,
  );
}
if (
  header.numAddressedTiles !==
  basemapContract.expectedAddressedTiles
) {
  problems.push(
    `expected ${basemapContract.expectedAddressedTiles.toLocaleString()} addressed tiles, received ${header.numAddressedTiles}`,
  );
}
if (!Array.isArray(metadata.vector_layers)) {
  problems.push("metadata does not declare vector layers");
} else {
  const declaredLayers = metadata.vector_layers.map(
    ({ id, minzoom }) => ({ id, minzoom }),
  );

  if (
    JSON.stringify(declaredLayers) !==
    JSON.stringify(expectedLayers)
  ) {
    problems.push(
      `expected vector layers ${JSON.stringify(expectedLayers)}, received ${JSON.stringify(declaredLayers)}`,
    );
  }
}
if (!metadata.attribution?.includes("Natural Earth")) {
  problems.push("metadata does not contain Natural Earth attribution");
}
if (
  metadata.geomuse_basemap_contract !== basemapContract.version
) {
  problems.push(
    `expected basemap contract v${basemapContract.version}, received ${metadata.geomuse_basemap_contract ?? "none"}`,
  );
}
if (!worldTile?.data.byteLength) {
  problems.push("world tile 0/0/0 could not be read");
}

for (const layer of expectedLayers) {
  if (!(await zoomContainsLayer(layer.minzoom, layer.id))) {
    problems.push(
      `zoom ${layer.minzoom} tiles do not contain layer “${layer.id}”`,
    );
  }
}

if (problems.length) {
  throw new Error(`Basemap validation failed:\n- ${problems.join("\n- ")}`);
}

console.log(
  `Verified PMTiles v${header.specVersion}: ${header.numAddressedTiles.toLocaleString()} MVT tiles, zoom ${header.minZoom}–${header.maxZoom}, layers ${expectedLayers.map(({ id }) => `“${id}”`).join(", ")}.`,
);

async function zoomContainsLayer(zoom, layerId) {
  const dimension = 2 ** zoom;
  const encodedLayerId = Buffer.from(layerId);

  for (let x = 0; x < dimension; x += 1) {
    for (let y = 0; y < dimension; y += 1) {
      const tile = await pmtiles.getZxy(zoom, x, y);

      if (
        tile?.data &&
        Buffer.from(tile.data).includes(encodedLayerId)
      ) {
        return true;
      }
    }
  }

  return false;
}
