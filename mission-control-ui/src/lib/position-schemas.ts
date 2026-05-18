import { z } from "zod";

export const PositionChannelMappingSchema = z
  .object({
    id: z.string(),
    vehicle_id: z.string(),
    frame_type: z.string(),
    lat_channel_name: z.string().nullable().optional(),
    lon_channel_name: z.string().nullable().optional(),
    alt_channel_name: z.string().nullable().optional(),
    x_channel_name: z.string().nullable().optional(),
    y_channel_name: z.string().nullable().optional(),
    z_channel_name: z.string().nullable().optional(),
    active: z.boolean(),
  })
  .passthrough();

export const PositionSampleSchema = z
  .object({
    vehicle_id: z.string(),
    vehicle_name: z.string(),
    vehicle_type: z.string(),
    stream_id: z.string().nullable().optional(),
    lat_deg: z.number().nullable().optional(),
    lon_deg: z.number().nullable().optional(),
    alt_m: z.number().nullable().optional(),
    timestamp: z.string().nullable().optional(),
    valid: z.boolean(),
    frame_type: z.string(),
    raw_channels: z.record(z.number().nullable()).nullable().optional(),
  })
  .passthrough();

export const PositionErrorBodySchema = z
  .object({
    detail: z.string().optional(),
  })
  .passthrough();

export type PositionChannelMappingFromSchema = z.infer<typeof PositionChannelMappingSchema>;
export type PositionSampleFromSchema = z.infer<typeof PositionSampleSchema>;
