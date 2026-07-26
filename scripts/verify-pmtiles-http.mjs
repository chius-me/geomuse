import { verifyPmtilesHttp } from "../src/globe/pmtiles-http-verifier.ts";

const defaultPageOrigin = "http://localhost:3000";
const defaultArchivePath = "/maps/geomuse-basemap.pmtiles";
const [configuredArchiveUrl, configuredPageOrigin] =
  process.argv.slice(2);
const result = await verifyPmtilesHttp({
  archiveUrl: configuredArchiveUrl || defaultArchivePath,
  pageOrigin: configuredPageOrigin || defaultPageOrigin,
});

console.log(
  `Verified ${result.crossOrigin ? "cross-origin" : "same-origin"} PMTiles HTTP contract: ${result.archiveUrl}`,
);
