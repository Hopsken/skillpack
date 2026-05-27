import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [genericOAuthClient(), oauthProviderClient()],
});

const oidcProviderId = "oidc";

export const useSession = () => authClient.useSession();

export const signInWithOidc = (callbackURL: string) =>
  authClient.signIn.oauth2({
    callbackURL,
    errorCallbackURL: "/login",
    providerId: oidcProviderId,
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
