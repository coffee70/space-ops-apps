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
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <EntryComponent {...props} />
    </div>
  );
}
