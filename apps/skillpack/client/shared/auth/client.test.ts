import { afterEach, describe, expect, it, vi } from "vitest";

const { signInSocial } = vi.hoisted(() => ({
  signInSocial: vi.fn<(options: unknown) => unknown>(),
}));

vi.mock(import("better-auth/react"), async (importOriginal) => {
  const actual = await importOriginal();
  const createAuthClient = (() => ({
    $fetch: vi.fn<() => unknown>(),
    signIn: {
      social: signInSocial,
    },
    signOut: vi.fn<() => unknown>(),
    useSession: vi.fn<() => unknown>(),
  })) as unknown as typeof actual.createAuthClient;

  return { ...actual, createAuthClient };
});

describe("client auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts GitHub social sign-in with the requested callback URL", async () => {
    const { signInWithGitHub } = await import("./client");

    signInWithGitHub("/skills/fork");

    expect(signInSocial).toHaveBeenCalledWith({
      callbackURL: "/skills/fork",
      errorCallbackURL: "/login",
      provider: "github",
    });
  });

  it("loads the configured login providers", async () => {
    const fetch = vi.fn<() => Promise<Pick<Response, "json" | "ok">>>();
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ github: true, oidc: false }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetch);
    const { getLoginProviders } = await import("./client");

    await expect(getLoginProviders()).resolves.toStrictEqual({
      github: true,
      oidc: false,
    });
    expect(fetch).toHaveBeenCalledWith("/api/auth/login-providers");
  });
});
