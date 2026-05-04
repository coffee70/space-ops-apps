import { expect, test, type APIRequestContext } from "@playwright/test";
import { appUrl, escapeRegExp } from "./support/application-routes";
import {
  PLAYWRIGHT_API_URL,
  getPreferredTelemetrySource,
  ingestRealtimeSample,
  registerTelemetryChannel,
} from "./support/telemetry";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

async function getRegisteredSourceId(request: APIRequestContext): Promise<string> {
  const source = await getPreferredTelemetrySource(request);
  return source.id;
}

test("telemetry detail applies repeated stream_ids scope", async ({
  page,
  request,
}) => {
  const sourceId = await getRegisteredSourceId(request);
  const channelName = `STREAM_SCOPE_${Date.now()}`;
  const olderStreamId = `stream-scope-${Date.now()}-a`;
  const selectedStreamId = `stream-scope-${Date.now()}-b`;

  await registerTelemetryChannel(request, {
    sourceId,
    name: channelName,
    units: "V",
    description: "Repeated stream scope route test channel",
  });
  await ingestRealtimeSample(request, {
    sourceId,
    streamId: olderStreamId,
    channelName,
    value: 3.1,
    receptionTime: "2026-03-28T12:00:00Z",
    sequence: 1,
  });
  await ingestRealtimeSample(request, {
    sourceId,
    streamId: selectedStreamId,
    channelName,
    value: 3.2,
    receptionTime: "2026-03-28T12:05:00Z",
    sequence: 2,
  });

  await expect
    .poll(
      async () => {
        const streamsResponse = await request.get(
          `${PLAYWRIGHT_API_URL}/telemetry/sources/${encodeURIComponent(sourceId)}/channels/${encodeURIComponent(channelName)}/streams`,
        );
        expect(streamsResponse.ok()).toBeTruthy();
        const streamsPayload = (await streamsResponse.json()) as {
          sources?: Array<{ stream_id?: string }>;
        };
        return (streamsPayload.sources ?? [])
          .map((stream) => stream.stream_id)
          .filter((streamId): streamId is string => typeof streamId === "string" && streamId.length > 0);
      },
      { timeout: 45_000 },
    )
    .toContain(selectedStreamId);

  await page.goto(
    appUrl("telemetry", [sourceId, channelName], {
      scope: "streams",
      stream_ids: selectedStreamId,
    }),
  );

  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(
        appUrl("telemetry", [sourceId, channelName]),
      )}\\?scope=streams&stream_ids=${escapeRegExp(selectedStreamId)}&view=analysis$`,
    ),
  );

  await expect(page.getByText(/^1 stream$/)).toBeVisible();
  await page.getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("columnheader", { name: /Stream/ })).toHaveCount(0);
});

test("data scope stream picker preserves backend ordering for opaque ids", async ({
  page,
  request,
}) => {
  const sourceId = await getRegisteredSourceId(request);
  const channelName = `PWR_MAIN_BUS_VOLT_${Date.now()}`;
  const olderRunId = "fffffff0-0000-0000-0000-000000000000";
  const newerRunId = "00000000-0000-0000-0000-000000000001";

  await registerTelemetryChannel(request, {
    sourceId,
    name: channelName,
    units: "V",
    description: "Opaque stream ordering channel",
  });
  await ingestRealtimeSample(request, {
    sourceId,
    streamId: olderRunId,
    channelName,
    value: 3.1,
    receptionTime: "2026-03-28T12:00:00Z",
    sequence: 1,
  });
  await ingestRealtimeSample(request, {
    sourceId,
    streamId: newerRunId,
    channelName,
    value: 3.2,
    receptionTime: "2026-03-28T12:05:00Z",
    sequence: 2,
  });

  await expect
    .poll(
      async () => {
        const streamsResponse = await request.get(
          `${PLAYWRIGHT_API_URL}/telemetry/sources/${encodeURIComponent(sourceId)}/channels/${encodeURIComponent(channelName)}/streams`,
        );
        expect(streamsResponse.ok()).toBeTruthy();
        const streamsPayload = (await streamsResponse.json()) as {
          sources?: Array<{ stream_id?: string }>;
        };
        const streamIds = (streamsPayload.sources ?? [])
          .map((stream) => stream.stream_id)
          .filter((streamId): streamId is string => typeof streamId === "string" && streamId.length > 0);
        const newerIndex = streamIds.indexOf(newerRunId);
        const olderIndex = streamIds.indexOf(olderRunId);
        return newerIndex >= 0 && olderIndex >= 0 && newerIndex < olderIndex;
      },
      { timeout: 45_000 },
    )
    .toBeTruthy();

  await page.goto(
    appUrl("telemetry", [sourceId, channelName], {
      scope: "streams",
      stream_ids: newerRunId,
    }),
  );

  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(appUrl("telemetry", [sourceId, channelName]))}\\?scope=streams&stream_ids=${escapeRegExp(newerRunId)}&view=analysis$`,
    ),
  );

  await page.getByRole("button", { name: "Edit scope" }).click();
  await page.getByRole("button", { name: "Add stream" }).click();

  const streamChooser = page.getByRole("dialog").filter({
    has: page.getByPlaceholder("Search streams"),
  });
  const newerRow = streamChooser.getByTestId(`telemetry-stream-option-${newerRunId}`);
  const olderRow = streamChooser.getByTestId(`telemetry-stream-option-${olderRunId}`);
  await expect(newerRow).toBeVisible();
  await expect(olderRow).toBeVisible();

  const newerTop = await newerRow.evaluate((el) => el.getBoundingClientRect().top);
  const olderTop = await olderRow.evaluate((el) => el.getBoundingClientRect().top);
  expect(newerTop).toBeLessThan(olderTop);
});

test("telemetry detail defaults to the latest stream that contains the channel", async ({
  page,
  request,
}) => {
  const sourceId = await getRegisteredSourceId(request);
  const selected = {
    sourceId,
    channelName: `PWR_MAIN_BUS_VOLT_${Date.now()}`,
    fallbackChannelName: `GPS_LAT_${Date.now()}`,
    streamId: "selected-channel-9999-01-01T00-10-00Z",
  };
  const newerStreamId = "fallback-channel-9999-01-01T00-15-00Z";

  await registerTelemetryChannel(request, {
    sourceId: selected.sourceId,
    name: selected.channelName,
    units: "V",
    description: "Latest stream fallback test channel",
  });
  await ingestRealtimeSample(request, {
    sourceId: selected.sourceId,
    streamId: selected.streamId,
    channelName: selected.channelName,
    value: 3.3,
    receptionTime: "9999-01-01T00:10:00Z",
    sequence: 1,
  });
  await ingestRealtimeSample(request, {
    sourceId: selected.sourceId,
    streamId: newerStreamId,
    channelName: selected.fallbackChannelName,
    value: 4.56,
    receptionTime: "9999-01-01T00:05:00Z",
    sequence: 2,
  });

  await expect
    .poll(
      async () => {
        const streamsResponse = await request.get(
          `${PLAYWRIGHT_API_URL}/telemetry/sources/${encodeURIComponent(selected.sourceId)}/channels/${encodeURIComponent(selected.channelName)}/streams`,
        );
        expect(streamsResponse.ok()).toBeTruthy();
        const streamsPayload = (await streamsResponse.json()) as {
          sources?: Array<{ stream_id?: string }>;
        };
        const streamIds = (streamsPayload.sources ?? [])
          .map((stream) => stream.stream_id)
          .filter((streamId): streamId is string => typeof streamId === "string" && streamId.length > 0);
        return {
          hasSelected: streamIds.includes(selected.streamId),
          hasFallback: streamIds.includes(newerStreamId),
        };
      },
      { timeout: 45_000 },
    )
    .toEqual({ hasSelected: true, hasFallback: false });

  await page.goto(appUrl("telemetry", [selected.sourceId, selected.channelName]));

  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(appUrl("telemetry", [selected.sourceId, selected.channelName]))}\\?scope=latest&view=analysis$`,
    ),
  );

  await page.getByRole("button", { name: "Table" }).click();
  await expect(page.getByRole("columnheader", { name: /Stream/ })).toHaveCount(0);
  await expect(page.getByText(/^Latest$/).first()).toBeVisible();
});
