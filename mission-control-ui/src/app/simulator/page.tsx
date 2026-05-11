import { redirect } from "next/navigation";
import { buildApplicationRoute } from "@/platform/registry/application-routes";

export default function SimulatorPage() {
  redirect(buildApplicationRoute("control-panel"));
}
