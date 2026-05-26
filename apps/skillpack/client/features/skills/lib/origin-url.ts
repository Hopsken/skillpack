import type { SkillOriginInput } from "@skillpack/contracts/origins/requests";
import { skillOriginSchema } from "@skillpack/contracts/origins/requests";

const optionalParam = (searchParams: URLSearchParams, name: string) => {
  const value = searchParams.get(name);
  return value || undefined;
};

const setOptionalParam = (
  searchParams: URLSearchParams,
  name: string,
  value: string | undefined
) => {
  if (value) {
    searchParams.set(name, value);
  }
};

export const parseOriginSearchParams = (
  searchParams: URLSearchParams
): SkillOriginInput | undefined => {
  const kind = searchParams.get("kind");

  if (kind === "github") {
    const parsed = skillOriginSchema.safeParse({
      branch: optionalParam(searchParams, "branch"),
      kind,
      repoUrl: searchParams.get("repoUrl"),
      rev: optionalParam(searchParams, "rev"),
    });

    return parsed.success ? parsed.data : undefined;
  }

  if (kind === "npm") {
    const parsed = skillOriginSchema.safeParse({
      kind,
      packageName: searchParams.get("packageName"),
      version: optionalParam(searchParams, "version"),
    });

    return parsed.success ? parsed.data : undefined;
  }

  return undefined;
};

export const toOriginSearchParams = (origin: SkillOriginInput) => {
  const searchParams = new URLSearchParams({ kind: origin.kind });

  if (origin.kind === "github") {
    searchParams.set("repoUrl", origin.repoUrl);
    setOptionalParam(searchParams, "branch", origin.branch);
    setOptionalParam(searchParams, "rev", origin.rev);
    return searchParams;
  }

  if (origin.kind === "npm") {
    searchParams.set("packageName", origin.packageName);
    setOptionalParam(searchParams, "version", origin.version);
  }

  return searchParams;
};

export const getOriginQueryKeyPart = (origin: SkillOriginInput) =>
  toOriginSearchParams(origin).toString();
