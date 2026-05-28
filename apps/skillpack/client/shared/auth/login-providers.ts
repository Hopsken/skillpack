import type { LoginProviders } from "@/shared/auth/client";

export const getVisibleLoginProviders = (providers: LoginProviders) =>
  (["github", "oidc"] as const).filter((provider) => providers[provider]);
