import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { parse as parseYaml } from "yaml";

interface MarkdownContentProps {
  content: string | undefined;
  fallback: string;
}

interface ParsedMarkdown {
  body: string;
  frontmatter: [string, string][];
}

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u;

const formatFrontmatterValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(formatFrontmatterValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const parseMarkdown = (content: string): ParsedMarkdown => {
  const match = content.match(frontmatterPattern);

  if (!match) {
    return { body: content, frontmatter: [] };
  }

  let data: unknown;

  try {
    data = parseYaml(match[1] ?? "");
  } catch {
    return { body: content, frontmatter: [] };
  }

  const frontmatter =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.entries(data)
          .map(([key, value]): [string, string] => [
            key,
            formatFrontmatterValue(value),
          ])
          .filter(([, value]) => value.length > 0)
      : [];

  return { body: match[2] ?? "", frontmatter };
};

const FrontmatterTable = ({
  entries,
}: {
  entries: ParsedMarkdown["frontmatter"];
}) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <table className="mb-8 w-full table-fixed border-collapse text-sm">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border border-border">
            <th className="w-40 border border-border bg-muted/40 px-4 py-3 text-left align-top font-semibold text-foreground">
              {key}
            </th>
            <td className="border border-border px-4 py-3 align-top text-foreground">
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const MarkdownContent = ({
  content,
  fallback,
}: MarkdownContentProps) => {
  const parsed = content ? parseMarkdown(content) : undefined;

  return (
    <section className="prose prose-neutral max-w-4xl px-6 py-8 dark:prose-invert">
      {parsed ? (
        <>
          <FrontmatterTable entries={parsed.frontmatter} />
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
          >
            {parsed.body}
          </ReactMarkdown>
        </>
      ) : (
        <p className="text-muted-foreground">{fallback}</p>
      )}
    </section>
  );
};
