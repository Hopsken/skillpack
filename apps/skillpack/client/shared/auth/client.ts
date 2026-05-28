import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [genericOAuthClient(), oauthProviderClient()],
});

const oidcProviderId = "oidc";

export interface LoginProviders {
  github: boolean;
  oidc: boolean;
}

export const useSession = () => authClient.useSession();

export const getLoginProviders = async (): Promise<LoginProviders> => {
  const response = await fetch("/api/auth/login-providers");

  if (!response.ok) {
    throw new Error("Failed to load login providers");
  }

  const body: unknown = await response.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("github" in body) ||
    typeof body.github !== "boolean" ||
    !("oidc" in body) ||
    typeof body.oidc !== "boolean"
  ) {
    throw new Error("Invalid login provider response");
  }

  return { github: body.github, oidc: body.oidc };
};

export const signInWithOidc = (callbackURL: string) =>
  authClient.signIn.oauth2({
    callbackURL,
    errorCallbackURL: "/login",
    providerId: oidcProviderId,
  });

export const signInWithGitHub = (callbackURL: string) =>
  authClient.signIn.social({
    callbackURL,
    errorCallbackURL: "/login",
    provider: "github",
  });

export const signOut = (onSuccess: () => void) =>
  authClient.signOut({
    fetchOptions: { onSuccess },
  });

export const getPublicOAuthClient = (clientId: string) =>
  authClient.$fetch("/oauth2/public-client-prelogin", {
    body: { client_id: clientId },
    method: "POST",
  });

export const respondToOAuthConsent = (accept: boolean, scope?: string) =>
  authClient.$fetch<{ redirect: boolean; url: string }>("/oauth2/consent", {
    body: {
      accept,
      scope,
    },
    method: "POST",
  });
