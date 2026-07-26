import { GlobeViewport } from "@/components/globe/globe-viewport";
import { createBasemapProvider } from "@/globe/basemap-provider";

export default function Home() {
  const basemapProvider = createBasemapProvider(
    process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL,
  );

  return (
    <main className="app-shell">
      <GlobeViewport basemapProvider={basemapProvider} />

      <header className="brand-bar glass-surface">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <p className="brand-name">GeoMuse</p>
          <p className="brand-tagline">转动地球，理解世界。</p>
        </div>
      </header>
    </main>
  );
}
