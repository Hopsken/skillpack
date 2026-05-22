import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string | undefined;
  fallback: string;
}

export const MarkdownContent = ({
  content,
  fallback,
}: MarkdownContentProps) => (
  <section className="prose prose-neutral max-w-4xl px-6 py-8 dark:prose-invert">
    {content ? (
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    ) : (
      <p className="text-muted-foreground">{fallback}</p>
    )}
  </section>
);
