import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const kibibyte = 1024;
const budgets = {
  initialJavaScriptGzip: 450 * kibibyte,
  // v6 ships the worker and maplibre-gl-shared.mjs as a pair.
  mapLibreWorkerGzip: 144 * kibibyte,
  totalStartupJavaScriptGzip: 550 * kibibyte,
  initialCssGzip: 20 * kibibyte,
  basemap: 1 * 1024 * kibibyte,
};

const projectRoot = process.cwd();
const pageHtmlPath = path.join(
  projectRoot,
  ".next/server/app/index.html",
);
const basemapPath = path.join(
  projectRoot,
  "public/maps/geomuse-basemap.pmtiles",
);
const mapLibreWorkerPaths = [
  path.join(projectRoot, "public/vendor/maplibre-gl-worker.mjs"),
  path.join(projectRoot, "public/vendor/maplibre-gl-shared.mjs"),
];

const pageHtml = await readFile(pageHtmlPath, "utf8");
const initialJavaScriptUrls = [
  ...pageHtml.matchAll(
    /<script(?![^>]*\bnoModule\b)[^>]*\bsrc="([^"]+\.js)"[^>]*>/g,
  ),
].map((match) => match[1]);
const initialCssUrls = [
  ...pageHtml.matchAll(
    /<link[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"[^>]*>/g,
  ),
].map((match) => match[1]);
const chunkUrls = [
  ...new Set([...initialJavaScriptUrls, ...initialCssUrls]),
];

if (chunkUrls.length === 0) {
  throw new Error(
    "No initial JavaScript or CSS chunks found. Run `pnpm build` first.",
  );
}

const totals = {
  js: 0,
  css: 0,
};

for (const chunkUrl of chunkUrls) {
  const relativePath = chunkUrl.replace(/^\/_next\//, "");
  const filePath = path.join(projectRoot, ".next", relativePath);
  const contents = await readFile(filePath);
  const extension = path.extname(filePath).slice(1);

  totals[extension] += gzipSync(contents).byteLength;
}

const basemapSize = (await stat(basemapPath)).size;
const mapLibreWorkerGzipSize = (
  await Promise.all(
    mapLibreWorkerPaths.map(async (workerPath) =>
      gzipSync(await readFile(workerPath)).byteLength,
    ),
  )
).reduce((total, size) => total + size, 0);
const checks = [
  {
    name: "Initial JavaScript (gzip)",
    actual: totals.js,
    budget: budgets.initialJavaScriptGzip,
  },
  {
    name: "MapLibre worker (gzip)",
    actual: mapLibreWorkerGzipSize,
    budget: budgets.mapLibreWorkerGzip,
  },
  {
    name: "Total startup JavaScript (gzip)",
    actual: totals.js + mapLibreWorkerGzipSize,
    budget: budgets.totalStartupJavaScriptGzip,
  },
  {
    name: "Initial CSS (gzip)",
    actual: totals.css,
    budget: budgets.initialCssGzip,
  },
  {
    name: "Basemap PMTiles",
    actual: basemapSize,
    budget: budgets.basemap,
  },
];

let hasFailure = false;

for (const check of checks) {
  const passed = check.actual <= check.budget;
  hasFailure ||= !passed;
  console.log(
    `${passed ? "PASS" : "FAIL"} ${check.name}: ${formatKiB(
      check.actual,
    )} / ${formatKiB(check.budget)}`,
  );
}

if (hasFailure) {
  process.exitCode = 1;
}

function formatKiB(bytes) {
  return `${(bytes / kibibyte).toFixed(1)} KiB`;
}
