import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { genericOAuth, jwt } from "better-auth/plugins";

export const skillReadScope = "skills:read";
export const skillpackOAuthScopes = [
  "openid",
  "offline_access",
  skillReadScope,
];

const providerId = "oidc";
const defaultScopes = ["openid", "email", "profile"];

const getProfileValue = (profile: Record<string, unknown>, key: string) => {
  const value = profile[key];
  return typeof value === "string" && value ? value : undefined;
};

const getProfileName = (profile: Record<string, unknown>) =>
  getProfileValue(profile, "name") ??
  getProfileValue(profile, "preferred_username") ??
  getProfileValue(profile, "email") ??
  "User";

const mapProfileToUser = (profile: Record<string, unknown>) => ({
  email: getProfileValue(profile, "email") ?? "",
  emailVerified: Boolean(profile.email_verified),
  image: getProfileValue(profile, "picture") ?? null,
  name: getProfileName(profile),
});

const requiredEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`${name} is required for auth`);
  }

  return value;
};

export const createAuth = (env: Env, origin: string) => {
  const baseURL = env.AUTH_BASE_URL ?? origin;

  return betterAuth({
    baseURL,
    database: env.DB,
    plugins: [
      jwt({
        disableSettingJwtHeader: true,
        jwt: { issuer: baseURL },
      }),
      oauthProvider({
        allowDynamicClientRegistration: true,
        allowPublicClientPrelogin: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationAllowedScopes: skillpackOAuthScopes,
        clientRegistrationDefaultScopes: skillpackOAuthScopes,
        consentPage: "/oauth/consent",
        grantTypes: ["authorization_code", "refresh_token"],
        loginPage: "/login",
        scopes: skillpackOAuthScopes,
        silenceWarnings: {
          oauthAuthServerConfig: true,
          openidConfig: true,
        },
        validAudiences: [baseURL],
      }),
      genericOAuth({
        config: [
          {
            clientId: requiredEnv(env.OIDC_CLIENT_ID, "OIDC_CLIENT_ID"),
            discoveryUrl: requiredEnv(
              env.OIDC_DISCOVERY_URL,
              "OIDC_DISCOVERY_URL"
            ),
            mapProfileToUser,
            pkce: true,
            providerId,
            scopes: defaultScopes,
          },
        ],
      }),
    ],
    secret: requiredEnv(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    socialProviders: {},
    trustedOrigins: [baseURL, origin],
  });
};

export type AuthSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>
>;
