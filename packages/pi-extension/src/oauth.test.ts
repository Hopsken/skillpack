import { describe, expect, it, vi } from "vitest";

import { createSkillpackOAuthProvider } from "./oauth";

describe(createSkillpackOAuthProvider, () => {
  it("registers a public OAuth client and exchanges an authorization code with PKCE", async () => {
    let registrationRequest: RequestInit | undefined;
    const fetch = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >((input, init) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-authorization-server")) {
        return Promise.resolve(
          Response.json({
            authorization_endpoint: "https://skillpack.example/oauth/authorize",
            registration_endpoint: "https://skillpack.example/oauth/register",
            token_endpoint: "https://skillpack.example/oauth/token",
          })
        );
      }

      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return Promise.resolve(
          Response.json({
            resource: "https://skillpack.example",
          })
        );
      }

      if (url === "https://skillpack.example/oauth/register") {
        registrationRequest = init;
        return Promise.resolve(
          Response.json({
            client_id: "registered-client-id",
          })
        );
      }

      expect(url).toBe("https://skillpack.example/oauth/token");
      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toContain("client_id=registered-client-id");
      expect(String(init?.body)).toContain(
        "resource=https%3A%2F%2Fskillpack.example"
      );
      return Promise.resolve(
        Response.json({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
        })
      );
    });
    const onAuth = vi.fn<(info: { url: string }) => void>();
    const onPrompt = vi.fn<() => Promise<string>>(() =>
      Promise.resolve("https://skillpack.example/")
    );
    const provider = createSkillpackOAuthProvider({
      createPkcePair: () =>
        Promise.resolve({
          challenge: "challenge",
          verifier: "verifier",
        }),
      fetch,
      now: () => 1000,
      redirectUri: "http://127.0.0.1:1455/callback",
      waitForAuthorizationCode: ({ authUrl }) => {
        expect(authUrl).toContain("code_challenge=challenge");
        expect(authUrl).toContain("client_id=registered-client-id");
        expect(authUrl).toContain("resource=https%3A%2F%2Fskillpack.example");
        expect(authUrl).toContain("scope=openid+offline_access+skills%3Aread");
        onAuth({ url: authUrl });
        return Promise.resolve("auth-code");
      },
    });

    await expect(
      provider.login({
        onAuth,
        onDeviceCode: vi.fn<() => void>(),
        onPrompt,
        onSelect: vi.fn<() => Promise<undefined>>(() =>
          Promise.resolve(undefined as undefined)
        ),
      })
    ).resolves.toStrictEqual({
      access: "access-token",
      baseUrl: "https://skillpack.example",
      clientId: "registered-client-id",
      expires: 3_601_000,
      refresh: "refresh-token",
      resource: "https://skillpack.example",
    });
    expect(registrationRequest?.method).toBe("POST");
    expect(JSON.parse(String(registrationRequest?.body))).toMatchObject({
      redirect_uris: ["http://127.0.0.1:1455/callback"],
      scope: "openid offline_access skills:read",
      token_endpoint_auth_method: "none",
    });
    expect(onPrompt).toHaveBeenCalledWith({
      message: "Skillpack base URL",
      placeholder: "https://skillpack.example",
    });
  });

  it("refreshes Skillpack access tokens through the discovered token endpoint", async () => {
    const fetch = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >((input, init) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-authorization-server")) {
        return Promise.resolve(
          Response.json({
            authorization_endpoint: "https://skillpack.example/oauth/authorize",
            registration_endpoint: "https://skillpack.example/oauth/register",
            token_endpoint: "https://skillpack.example/oauth/token",
          })
        );
      }

      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return Promise.resolve(
          Response.json({
            resource: "https://skillpack.example",
          })
        );
      }

      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toContain("client_id=registered-client-id");
      expect(String(init?.body)).toContain(
        "resource=https%3A%2F%2Fskillpack.example"
      );
      return Promise.resolve(
        Response.json({
          access_token: "new-access-token",
          expires_in: 60,
        })
      );
    });
    const provider = createSkillpackOAuthProvider({
      clientId: "registered-client-id",
      fetch,
      now: () => 5000,
    });

    await expect(
      provider.refreshToken({
        access: "old-access-token",
        baseUrl: "https://skillpack.example",
        expires: 0,
        refresh: "refresh-token",
      })
    ).resolves.toStrictEqual({
      access: "new-access-token",
      baseUrl: "https://skillpack.example",
      clientId: "registered-client-id",
      expires: 65_000,
      refresh: "refresh-token",
      resource: "https://skillpack.example",
    });
  });
});
