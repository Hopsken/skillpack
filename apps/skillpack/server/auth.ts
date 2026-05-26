import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

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

interface AuthSessionContext {
  asResponse: false;
  headers: Headers;
}

interface AuthHandler {
  api: {
    getSession: (context: AuthSessionContext) => Promise<unknown | null>;
  };
  handler: (request: Request) => Promise<Response>;
}

export const createAuth = (env: Env, origin: string): AuthHandler => {
  const baseURL = env.AUTH_BASE_URL ?? origin;

  return betterAuth({
    baseURL,
    database: env.DB,
    plugins: [
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
