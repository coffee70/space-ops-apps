"use client";

import { useMemo } from "react";

export function AttachmentPicker({
  onSelect,
}: {
  onSelect: (files: File[]) => void;
}) {
  const acceptHint = useMemo(() => "Attach mission/vehicle docs (md, txt, json, yaml, csv)", []);

  return (
    <label className="text-muted-foreground block text-xs">
      {acceptHint}
      <input
        type="file"
        multiple
        className="mt-1 block w-full text-xs"
        onChange={(event) => onSelect(Array.from(event.target.files || []))}
      />
    </label>
  );
}
