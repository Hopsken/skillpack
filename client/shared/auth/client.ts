import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
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
