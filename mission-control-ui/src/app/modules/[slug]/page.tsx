interface ModuleViewerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ModuleViewerPage({ params }: ModuleViewerPageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-full flex-col bg-slate-950">
      <div className="border-b border-white/10 px-6 py-4">
        <p className="text-xs font-semibold tracking-[0.22em] text-sky-300/80 uppercase">
          Runtime Module
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">{slug}</h1>
      </div>
      <iframe
        src={`/runtime-modules/${slug}`}
        title={`${slug} module`}
        className="h-[calc(100vh-6rem)] w-full border-0"
      />
    </div>
  );
}
