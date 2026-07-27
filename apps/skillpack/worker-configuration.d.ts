interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AUTH_BASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_DISCOVERY_URL?: string;
}
