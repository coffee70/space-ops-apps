"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Viewer, Entity } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import type {
  PositionSample,
  PositionHistoryEntry,
} from "@/lib/position-client";

export interface EarthOverviewGlobeProps {
  positions: PositionSample[];
  positionHistoryBySource?: Record<string, PositionHistoryEntry[]>;
}

let cesiumConfigured = false;

function configureCesium() {
  if (cesiumConfigured || typeof window === "undefined") {
    return;
  }

  const baseUrl = "/cesium/";
  try {
    (
      window as Window & {
        CESIUM_BASE_URL?: string;
      }
    ).CESIUM_BASE_URL = baseUrl;

    const buildModuleUrl = (
      Cesium as typeof Cesium & {
        buildModuleUrl?: { setBaseUrl?: (url: string) => void };
      }
    ).buildModuleUrl;

    if (buildModuleUrl?.setBaseUrl) {
      buildModuleUrl.setBaseUrl(baseUrl);
    } else {
      console.error(
        "[EarthOverviewGlobe] Cesium.buildModuleUrl.setBaseUrl is not available; static assets may fail to load and the globe may not render correctly."
      );
    }

    const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    if (ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }
  } catch (e) {
    console.error("[EarthOverviewGlobe] Failed to set Cesium base URL:", e);
  }

  cesiumConfigured = true;
}

const terrainProvider = new Cesium.EllipsoidTerrainProvider();

const POLYLINE_WIDTH = 2;
const subscribeToClient = () => () => {};

export function EarthOverviewGlobe({
  positions,
  positionHistoryBySource = {},
}: EarthOverviewGlobeProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false
  );

  // Must run before imagery/network code: Resium creates Cesium.Viewer in an effect, but the
  // base layer is chosen during construction. Ion token must be set before that (user token
  // overrides Cesium's built-in read-only default when present).
  configureCesium();

  const [globeBaseLayer, setGlobeBaseLayer] = useState<
    Cesium.ImageryLayer | undefined
  >(undefined);
  const [globeBaseLayerFailed, setGlobeBaseLayerFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    configureCesium();

    (async () => {
      try {
        const provider = await Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.AERIAL,
        });
        if (!cancelled) {
          setGlobeBaseLayer(new Cesium.ImageryLayer(provider));
        }
      } catch (primaryErr) {
        console.warn(
          "[EarthOverviewGlobe] Ion aerial imagery unavailable, using bundled fallback:",
          primaryErr
        );
        try {
          const fallback = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
          );
          if (!cancelled) {
            setGlobeBaseLayer(new Cesium.ImageryLayer(fallback));
          }
        } catch (fallbackErr) {
          console.error(
            "[EarthOverviewGlobe] Bundled globe imagery also failed:",
            fallbackErr
          );
          if (!cancelled) {
            setGlobeBaseLayerFailed(true);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent =
        ".cesium-viewer-bottom, .cesium-credit-textContainer { display: none !important; }";
      document.head.appendChild(style);
    }
  }, []);

  if (!isClient) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80">
        <div className="text-muted-foreground text-sm">Preparing globe…</div>
      </div>
    );
  }

  if (globeBaseLayerFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80 px-4">
        <p className="text-destructive text-center text-sm">
          Globe imagery failed to load. Check that{" "}
          <code className="text-xs">/cesium/</code> static files are deployed and that the
          browser can reach Cesium Ion. Optional: set{" "}
          <code className="text-xs">NEXT_PUBLIC_CESIUM_ION_TOKEN</code> for your own Ion token.
        </p>
      </div>
    );
  }

  if (!globeBaseLayer) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80">
        <div className="text-muted-foreground text-sm">Loading globe imagery…</div>
      </div>
    );
  }

  const renderedSources = positions
    .filter((p) => p.valid && p.lat_deg != null && p.lon_deg != null)
    .map((p) => p.vehicle_name);

  return (
    <div className="absolute inset-0 bg-black" style={{ width: "100%", height: "100%" }}>
      <div
        className="sr-only"
        data-testid="earth-overview-rendered-sources"
      >
        Rendered sources:{" "}
        {renderedSources.length > 0 ? renderedSources.join(", ") : "None"}
      </div>
      <Viewer
        full
        style={{ width: "100%", height: "100%" }}
        baseLayer={globeBaseLayer}
        terrainProvider={terrainProvider}
        selectionIndicator={false}
        infoBox={false}
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
      >
        {positions
          .filter((p) => p.valid && p.lat_deg != null && p.lon_deg != null)
          .map((p) => {
            const sourceKey = p.vehicle_id;
            const sourceName = p.vehicle_name;
            const sourceType = p.vehicle_type ?? "vehicle";
            const lat = p.lat_deg!;
            const lon = p.lon_deg!;
            const alt = p.alt_m ?? 0;
            const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
            const isSimulator = sourceType === "simulator";
            const color = isSimulator ? Cesium.Color.ORANGE : Cesium.Color.CYAN;
            const labelText = `${sourceName}`;
            const history = positionHistoryBySource[sourceKey];
            const polylinePositions =
              history && history.length >= 2
                ? [
                    ...history.map((h) =>
                      Cesium.Cartesian3.fromDegrees(
                        h.lon_deg,
                        h.lat_deg,
                        h.alt_m ?? 0
                      )
                    ),
                    position,
                  ]
                : undefined;

            return (
              <Entity
                key={sourceKey}
                name={sourceName}
                position={position}
                point={{
                  pixelSize: 10,
                  color,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 1,
                }}
                polyline={
                  polylinePositions
                    ? {
                        positions: polylinePositions,
                        width: POLYLINE_WIDTH,
                        material: color.withAlpha(0.5),
                      }
                    : undefined
                }
                label={{
                  text: labelText,
                  font: "14px sans-serif",
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.BLACK,
                  outlineWidth: 2,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  pixelOffset: new Cesium.Cartesian2(0, -16),
                }}
              />
            );
          })}
      </Viewer>
    </div>
  );
}
