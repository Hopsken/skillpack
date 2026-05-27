import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const apiUrl = process.env.SKILLPACK_DEV_URL ?? "http://localhost:5173";
const scope =
  process.env.SKILLPACK_OAUTH_SCOPE ?? "openid offline_access skills:read";
const callbackHost = process.env.SKILLPACK_OAUTH_CALLBACK_HOST ?? "127.0.0.1";
const callbackPort = Number(
  process.env.SKILLPACK_OAUTH_CALLBACK_PORT ?? 38_987
);

const base64Url = (buffer) => buffer.toString("base64url");

const fetchJson = async (url, init) => {
  const response = await fetch(url, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${url} failed: ${response.status} ${text}`
    );
  }

  return data;
};

const openBrowser = async (url) => {
  if (process.env.SKILLPACK_OAUTH_NO_BROWSER) {
    return;
  }

  let command = "xdg-open";
  let args = [url];

  if (process.platform === "darwin") {
    command = "open";
  }

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  }

  try {
    await execFileAsync(command, args);
  } catch {
    console.log("Could not open browser automatically.");
  }
};

const createCallbackServer = () => {
  const server = createServer((request, response) => {
    try {
      const requestUrl = new URL(
        request.url ?? "/",
        `http://${request.headers.host}`
      );
      const code = requestUrl.searchParams.get("code");
      const state = requestUrl.searchParams.get("state");
      const error = requestUrl.searchParams.get("error");
      const errorDescription = requestUrl.searchParams.get("error_description");

      if (error) {
        response.writeHead(400, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end(`OAuth failed: ${errorDescription ?? error}`);
        server.emit(
          "oauthError",
          new Error(`OAuth failed: ${errorDescription ?? error}`)
        );
        return;
      }

      if (!code) {
        response.writeHead(400, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end("Missing OAuth code");
        server.emit("oauthError", new Error("Missing OAuth code"));
        return;
      }

      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("OAuth code received. You can return to the terminal.");
      server.emit("oauthCallback", { code, state });
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("OAuth callback failed");
      server.emit("oauthError", error);
    }
  });

  return server;
};

const waitForCallback = async (server) => {
  const result = await Promise.race([
    once(server, "oauthCallback"),
    once(server, "oauthError").then(([error]) => {
      throw error;
    }),
  ]);

  return result[0];
};

const listen = async (server) => {
  server.listen(callbackPort, callbackHost);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve callback server address");
  }

  return address.port;
};

const registerClient = (registrationEndpoint, redirectUri) =>
  fetchJson(registrationEndpoint, {
    body: JSON.stringify({
      client_name: "Skillpack local OAuth test",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [redirectUri],
      response_types: ["code"],
      scope,
      token_endpoint_auth_method: "none",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

const exchangeCode = async ({
  clientId,
  code,
  codeVerifier,
  redirectUri,
  resource,
  tokenEndpoint,
}) => {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    resource,
  });

  return await fetchJson(tokenEndpoint, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
};

const assertWriteRejected = async (accessToken) => {
  const response = await fetch(`${apiUrl}/api/v1/skills`, {
    body: JSON.stringify({
      content: "# OAuth Write Probe",
      name: "oauth-write-probe",
    }),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (response.status !== 401) {
    const body = await response.text();
    throw new Error(
      `Expected bearer write probe to return 401, got ${response.status}: ${body}`
    );
  }
};

const main = async () => {
  const issuerMetadataUrl = `${apiUrl}/.well-known/oauth-authorization-server`;
  const resourceMetadataUrl = `${apiUrl}/.well-known/oauth-protected-resource`;

  console.log(`Reading OAuth metadata from ${apiUrl}`);
  const [issuerMetadata, resourceMetadata] = await Promise.all([
    fetchJson(issuerMetadataUrl),
    fetchJson(resourceMetadataUrl),
  ]);

  if (!issuerMetadata.registration_endpoint) {
    throw new Error("OAuth metadata does not include registration_endpoint");
  }

  const server = createCallbackServer();
  const port = await listen(server);
  const redirectUri = `http://${callbackHost}:${port}/callback`;
  const resource = resourceMetadata.resource ?? apiUrl;

  try {
    console.log(`Registering public OAuth client with redirect ${redirectUri}`);
    const client = await registerClient(
      issuerMetadata.registration_endpoint,
      redirectUri
    );
    const clientId = client.client_id;

    if (!clientId) {
      throw new Error("Client registration did not return client_id");
    }

    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = base64Url(
      createHash("sha256").update(codeVerifier).digest()
    );
    const state = base64Url(randomBytes(16));
    const authorizationUrl = new URL(issuerMetadata.authorization_endpoint);
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("resource", resource);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", scope);
    authorizationUrl.searchParams.set("state", state);

    console.log("\nOpen this URL, log in, and approve access:");
    console.log(authorizationUrl.toString());
    console.log("\nWaiting for OAuth callback...");
    await openBrowser(authorizationUrl.toString());

    const callbackResult = await waitForCallback(server);

    if (callbackResult.state !== state) {
      throw new Error("OAuth callback state mismatch");
    }

    console.log("Exchanging authorization code for tokens");
    const tokenSet = await exchangeCode({
      clientId,
      code: callbackResult.code,
      codeVerifier,
      redirectUri,
      resource,
      tokenEndpoint: issuerMetadata.token_endpoint,
    });

    if (!tokenSet.access_token) {
      throw new Error("Token response did not include access_token");
    }

    console.log("Reading skills with OAuth access token");
    const skills = await fetchJson(`${apiUrl}/api/v1/skills`, {
      headers: { authorization: `Bearer ${tokenSet.access_token}` },
    });

    await assertWriteRejected(tokenSet.access_token);

    console.log("\nOAuth integration OK");
    console.log(`skills returned: ${skills.skills?.length ?? 0}`);
    console.log(`token type: ${tokenSet.token_type ?? "unknown"}`);
    console.log(`refresh token: ${tokenSet.refresh_token ? "yes" : "no"}`);
  } finally {
    server.close();
  }
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "Start local dev with `pnpm dev` and apply migrations with `pnpm db:migrate:local` before running this script."
  );
  process.exitCode = 1;
}
