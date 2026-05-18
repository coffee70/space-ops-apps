import { z } from "zod";

export const SimulatorRuntimeStatusSchema = z
  .object({
    connected: z.boolean(),
    supported_scenarios: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
    state: z.enum(["idle", "running", "paused"]).optional(),
    config: z
      .object({
        scenario: z.string(),
        duration: z.number(),
        speed: z.number(),
        drop_prob: z.number(),
        jitter: z.number(),
        vehicle_id: z.string(),
        stream_id: z.string(),
        packet_source: z.string().nullable().optional(),
        receiver_id: z.string().nullable().optional(),
        base_url: z.string(),
      })
      .nullable()
      .optional(),
    sim_elapsed: z.number().optional(),
  })
  .passthrough();
