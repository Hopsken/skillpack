import { describe, expect, it } from "vitest";

import {
  accountLinkingOptions,
  getLoginProviders,
  getTrustedOrigins,
} from "./auth";

const baseEnv = {
  BETTER_AUTH_SECRET: "test-secret",
  BUCKET: {},
  DB: {},
} as Env;

describe("auth login provider config", () => {
  it("trusts configured browser sign-in providers without bypassing email verification", () => {
    expect(accountLinkingOptions).toStrictEqual({
      enabled: true,
      trustedProviders: ["github", "oidc"],
    });
    expect("requireLocalEmailVerified" in accountLinkingOptions).toBeFalsy();
  });

  it("rejects partial GitHub provider config", () => {
    expect(() =>
      getLoginProviders({
        ...baseEnv,
        GITHUB_CLIENT_ID: "github-client",
      } as Env)
    ).toThrow(
      "Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required for auth"
    );
  });

  it("rejects partial OIDC provider config", () => {
    expect(() =>
      getLoginProviders({
        ...baseEnv,
        OIDC_CLIENT_ID: "oidc-client",
      } as Env)
    ).toThrow(
      "Both OIDC_CLIENT_ID and OIDC_DISCOVERY_URL are required for auth"
    );
  });

  it("adds configured proxy origins to Better Auth trusted origins", () => {
    expect(
      getTrustedOrigins(
        {
          ...baseEnv,
          BETTER_AUTH_TRUSTED_ORIGINS:
            " https://orb.example,https://portal.example ",
        } as Env,
        "http://localhost:5173"
      )
    ).toStrictEqual([
      "http://localhost:5173",
      "https://orb.example",
      "https://portal.example",
    ]);
  });
});
