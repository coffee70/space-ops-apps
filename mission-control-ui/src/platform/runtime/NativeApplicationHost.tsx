import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

export async function NativeApplicationHost({
  loader,
  props,
}: {
  loader: () => Promise<{ applicationEntry: NativeApplicationEntry }>;
  props: NativeApplicationProps;
}) {
  const module = await loader();
  const EntryComponent = module.applicationEntry.Component;
  return <EntryComponent {...props} />;
}
