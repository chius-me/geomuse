import { basemapContract } from "./basemap-contract.ts";

export type BasemapProvider = {
  id: string;
  kind: "pmtiles";
  url: string;
  attribution: string;
};

export type ResolvedBasemapProvider = BasemapProvider & {
  archiveUrl: string;
  crossOrigin: boolean;
};

const localBasemapUrl = "/maps/geomuse-basemap.pmtiles";

export function createBasemapProvider(
  configuredUrl?: string,
): BasemapProvider {
  const url = configuredUrl?.trim() || localBasemapUrl;

  return {
    id:
      url === localBasemapUrl
        ? "natural-earth-local"
        : "natural-earth-remote",
    kind: "pmtiles",
    url,
    attribution: basemapContract.attribution,
  };
}

export function resolveBasemapProvider(
  provider: BasemapProvider | undefined,
  pageOrigin: string,
): ResolvedBasemapProvider | undefined {
  if (!provider) {
    return undefined;
  }

  const origin = new URL(pageOrigin);
  const archive = new URL(provider.url, origin);

  if (!["http:", "https:"].includes(archive.protocol)) {
    throw new Error("底图 URL 必须使用 HTTP 或 HTTPS");
  }

  if (archive.username || archive.password) {
    throw new Error("底图 URL 不能包含用户名或密码");
  }

  if (archive.hash) {
    throw new Error("底图 URL 不能包含片段标识");
  }

  if (archive.search) {
    throw new Error("底图 URL 不能包含查询参数，请使用版本化文件名");
  }

  if (!archive.pathname.toLowerCase().endsWith(".pmtiles")) {
    throw new Error("底图 URL 必须指向 .pmtiles 文件");
  }

  if (
    origin.protocol === "https:" &&
    archive.protocol !== "https:"
  ) {
    throw new Error("HTTPS 页面不能加载非 HTTPS 底图");
  }

  return {
    ...provider,
    archiveUrl: archive.href,
    crossOrigin: archive.origin !== origin.origin,
  };
}

export function createPmtilesTileTemplate(
  provider: ResolvedBasemapProvider,
): string {
  return `pmtiles://${provider.archiveUrl}/{z}/{x}/{y}`;
}
