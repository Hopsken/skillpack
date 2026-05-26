export const markdownMediaType = "text/markdown; charset=utf-8";
export const textMediaType = "text/plain; charset=utf-8";

const textEncoder = new TextEncoder();

export const getTextSize = (content: string) =>
  textEncoder.encode(content).length;

export const getDefaultMediaType = (path: string) => {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".md")) {
    return markdownMediaType;
  }

  if (lowerPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }

  if (lowerPath.endsWith(".ts")) {
    return "text/typescript; charset=utf-8";
  }

  if (lowerPath.endsWith(".py")) {
    return "text/x-python; charset=utf-8";
  }

  if (lowerPath.endsWith(".sh")) {
    return "text/x-shellscript; charset=utf-8";
  }

  return textMediaType;
};
