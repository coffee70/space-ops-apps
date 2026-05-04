"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AiEngineerMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <div className="text-foreground min-w-0 text-[13px] leading-[1.65]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return <code className="bg-muted block overflow-x-auto rounded-lg px-3 py-2 font-mono text-[12px]">{children}</code>;
            }
            return <code className="bg-muted rounded px-1 py-0.5 font-mono text-[12px]">{children}</code>;
          },
          pre: ({ children }) => <pre className="bg-muted mb-2 overflow-x-auto rounded-lg p-0 last:mb-0">{children}</pre>,
          a: ({ children, href }) => (
            <a href={href} className="hover:text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full min-w-max border-collapse text-left text-[12px]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-border bg-muted border px-2 py-1 font-medium">{children}</th>,
          td: ({ children }) => <td className="border-border border px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
