export type OriginErrorCode =
  | "origin-discovery-failed"
  | "origin-definition-failed"
  | "unsupported-origin-kind";

export class OriginModuleError extends Error {
  code: OriginErrorCode;

  constructor(code: OriginErrorCode, message: string) {
    super(message);
    this.name = "OriginModuleError";
    this.code = code;
  }
}

export const originErrors = {
  definitionFailed: (message: string) =>
    new OriginModuleError("origin-definition-failed", message),
  discoveryFailed: (message: string) =>
    new OriginModuleError("origin-discovery-failed", message),
  unsupportedOriginKind: () =>
    new OriginModuleError(
      "unsupported-origin-kind",
      "Skill origin is not supported"
    ),
};
