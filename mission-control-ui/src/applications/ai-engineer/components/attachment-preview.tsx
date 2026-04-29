"use client";

export function AttachmentPreview({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-1 text-xs">
      {files.map((file, index) => (
        <div key={`${file.name}-${file.lastModified}`} className="border-border flex items-center justify-between rounded border px-2 py-1">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground ml-2"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${file.name}`}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
