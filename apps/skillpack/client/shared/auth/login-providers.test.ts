import { describe, expect, it } from "vitest";

import { getVisibleLoginProviders } from "@/shared/auth/login-providers";

describe("login route provider order", () => {
  it("places GitHub above optional OIDC", () => {
    expect(
      getVisibleLoginProviders({
        github: true,
        oidc: true,
      })
    ).toStrictEqual(["github", "oidc"]);
  });

  it("hides OIDC when it is not configured", () => {
    expect(
      getVisibleLoginProviders({
        github: true,
        oidc: false,
      })
    ).toStrictEqual(["github"]);
  });
});
