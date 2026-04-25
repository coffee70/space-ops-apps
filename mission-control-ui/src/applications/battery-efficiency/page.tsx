"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextBanner } from "@/components/context-banner";
import { EmptyState } from "@/components/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  type TelemetryInventoryEntry,
  type TelemetrySource,
  useTelemetryInventoryQuery,
  useTelemetrySourcesQuery,
} from "@/lib/query-hooks";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";

const BATTERY_SOURCE_STORAGE_KEY = "batteryEfficiencySourceId";
const EMPTY_SOURCES: TelemetrySource[] = [];
const REQUIRED_CHANNELS = [
  "EPS_BATTERY_SOC",
  "PWR_MAIN_BUS_VOLT",
  "PWR_MAIN_BUS_CURR",
] as const;

type RequiredChannelName = (typeof REQUIRED_CHANNELS)[number];

interface MetricCardDefinition {
  key: string;
  label: string;
  description: string;
  units?: string;
  value?: number | null;
  timestamp?: string | null;
  testId: string;
}

function resolvePreferredSource(
  sources: TelemetrySource[],
  sourceFromQuery: string | null,
  storedSource: string | null,
) {
  const isPresent = (value: string | null) => value && sources.some((source) => source.id === value);
  if (isPresent(sourceFromQuery)) return sourceFromQuery;
  if (isPresent(storedSource)) return storedSource;
  return sources.find((source) => source.source_type === "simulator")?.id ?? sources[0]?.id ?? null;
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatMetricValue(value?: number | null, units?: string) {
  if (value == null || Number.isNaN(value)) return "No data";
  const formatter = Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2);
  return units ? `${formatter} ${units}` : formatter;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "No recent sample";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString();
}

function buildChannelMap(inventory: TelemetryInventoryEntry[]) {
  return new Map(inventory.map((entry) => [entry.name, entry]));
}

export function BatteryEfficiencyApplication({ searchParams }: NativeApplicationProps) {
  const sourceFromQuery = readSearchParam(searchParams.source);
  const [storedSource, setStoredSource] = useState<string | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const sourcesQuery = useTelemetrySourcesQuery<TelemetrySource[]>();
  const sources = sourcesQuery.data ?? EMPTY_SOURCES;

  useEffect(() => {
    try {
      setStoredSource(sessionStorage.getItem(BATTERY_SOURCE_STORAGE_KEY));
    } catch {
      setStoredSource(null);
    }
    setStorageChecked(true);
  }, []);

  useEffect(() => {
    if (!storageChecked || sourcesQuery.isLoading) return;
    const resolvedSource = resolvePreferredSource(sources, sourceFromQuery, storedSource);
    setSelectedSource((current) => (current === resolvedSource ? current : resolvedSource));
  }, [sourceFromQuery, sources, sourcesQuery.isLoading, storageChecked, storedSource]);

  const inventoryQuery = useTelemetryInventoryQuery(selectedSource ?? "", Boolean(selectedSource));
  const inventory = inventoryQuery.data ?? [];

  useEffect(() => {
    if (!selectedSource) return;
    try {
      sessionStorage.setItem(BATTERY_SOURCE_STORAGE_KEY, selectedSource);
    } catch {}
  }, [selectedSource]);

  useEffect(() => {
    if (!selectedSource) return;
    const nextUrl = new URL(window.location.href);
    if (nextUrl.searchParams.get("source") === selectedSource) return;
    nextUrl.searchParams.set("source", selectedSource);
    window.history.replaceState({}, "", nextUrl);
  }, [selectedSource]);

  const channelMap = useMemo(() => buildChannelMap(inventory), [inventory]);
  const missingChannels = useMemo(
    () => REQUIRED_CHANNELS.filter((channelName) => !channelMap.has(channelName)),
    [channelMap],
  );
  const sourceLabel =
    sources.find((source) => source.id === selectedSource)?.name ?? selectedSource ?? "No source";

  const batterySoc = channelMap.get("EPS_BATTERY_SOC");
  const busVoltage = channelMap.get("PWR_MAIN_BUS_VOLT");
  const busCurrent = channelMap.get("PWR_MAIN_BUS_CURR");
  const estimatedBusPower =
    busVoltage?.current_value != null && busCurrent?.current_value != null
      ? busVoltage.current_value * busCurrent.current_value
      : null;

  const metricCards: MetricCardDefinition[] = [
    {
      key: "battery-soc",
      label: "Battery State of Charge",
      description: "Primary battery reserve from Layer 2 telemetry.",
      units: batterySoc?.units ?? "%",
      value: batterySoc?.current_value,
      timestamp: batterySoc?.last_timestamp,
      testId: "battery-efficiency-card-soc",
    },
    {
      key: "bus-voltage",
      label: "Main Bus Voltage",
      description: "Current power bus voltage.",
      units: busVoltage?.units ?? "V",
      value: busVoltage?.current_value,
      timestamp: busVoltage?.last_timestamp,
      testId: "battery-efficiency-card-voltage",
    },
    {
      key: "bus-current",
      label: "Main Bus Current",
      description: "Current draw on the main power bus.",
      units: busCurrent?.units ?? "A",
      value: busCurrent?.current_value,
      timestamp: busCurrent?.last_timestamp,
      testId: "battery-efficiency-card-current",
    },
    {
      key: "estimated-bus-power",
      label: "Estimated Bus Power",
      description: "Simple derived metric from voltage x current.",
      units: "W",
      value: estimatedBusPower,
      timestamp: busVoltage?.last_timestamp ?? busCurrent?.last_timestamp,
      testId: "battery-efficiency-card-power",
    },
  ];

  function handleSourceChange(nextSourceId: string) {
    setSelectedSource(nextSourceId);
  }

  if (!storageChecked || sourcesQuery.isLoading || (selectedSource == null && sources.length > 0)) {
    return (
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <Spinner size="lg" className="h-10 w-10" />
      </div>
    );
  }

  if (sourcesQuery.isError) {
    return (
      <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertDescription>
            Battery Efficiency could not load telemetry sources from the platform API.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="No telemetry sources available"
          description="Battery Efficiency needs a Layer 2 telemetry source before it can render native analysis."
          icon="chart"
        />
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8" data-testid="battery-efficiency-native-app">
      <div className="mx-auto max-w-7xl space-y-6">
        {selectedSource && (
          <ContextBanner
            sourceId={selectedSource}
            sources={sources}
            onSourceChange={handleSourceChange}
          />
        )}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Battery Efficiency</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            Example native application built inside Mission Control. It reads Layer 2 telemetry
            directly and turns a few battery and power channels into a simple operator-facing view.
          </p>
        </div>

        <Alert>
          <AlertDescription>
            This demo stays native to the platform shell. It uses telemetry from <strong>{sourceLabel}</strong>
            {" "}instead of loading an external runtime.
          </AlertDescription>
        </Alert>

        {inventoryQuery.isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Spinner size="lg" className="h-10 w-10" />
          </div>
        ) : inventoryQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Battery Efficiency could not load telemetry inventory for the selected source.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {missingChannels.length > 0 && (
              <Alert>
                <AlertDescription data-testid="battery-efficiency-missing-channels">
                  Missing expected demo channels for this source: {missingChannels.join(", ")}.
                  Available values still render when possible.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <Card key={metric.key} data-testid={metric.testId}>
                  <CardHeader className="gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{metric.label}</CardTitle>
                      <CardDescription>{metric.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-semibold tracking-tight">
                      {formatMetricValue(metric.value, metric.units)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Last sample: {formatTimestamp(metric.timestamp)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {missingChannels.length === REQUIRED_CHANNELS.length && (
              <EmptyState
                title="Battery channels unavailable for this source"
                description="Pick another telemetry source to show this example native application against live Layer 2 data."
                icon="chart"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
