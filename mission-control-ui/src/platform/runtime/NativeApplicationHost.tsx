import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

export async function NativeApplicationHost({
  loader,
  props,
}: {
  loader: () => Promise<{ applicationEntry: NativeApplicationEntry }>;
  props: NativeApplicationProps;
}) {
  const loadedApplication = await loader();
  const EntryComponent = loadedApplication.applicationEntry.Component;
  return <EntryComponent {...props} />;
}
