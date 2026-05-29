import { webcrypto } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import type {
  OAuthCredentials,
  OAuthLoginCallbacks,
} from "@earendil-works/pi-ai/oauth";

const defaultClientName = "Skillpack Pi Coding Agent";
const defaultScope = "openid offline_access skills:read";
const defaultCallbackHost = "127.0.0.1";
const defaultCallbackPath = "/callback";
const oauthMetadataPaths = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
] as const;

interface OAuthMetadata {
  authorization_endpoint: string;
  registration_endpoint?: string;
  token_endpoint: string;
}

interface OAuthClientRegistrationResponse {
  client_id: string;
}

interface ProtectedResourceMetadata {
  resource?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}

interface PkcePair {
  challenge: string;
  verifier: string;
}

interface WaitForAuthorizationCodeOptions {
  authUrl: string;
  callbacks: OAuthLoginCallbacks;
  redirectUri: string;
}

export interface SkillpackOAuthProviderOptions {
  baseUrl?: string;
  clientId?: string;
  clientName?: string;
  createPkcePair?: () => Promise<PkcePair>;
  fetch?: (input: string | URL, init?: RequestInit) => Promise<Response>;
  now?: () => number;
  redirectUri?: string;
  scope?: string;
  waitForAuthorizationCode?: (
    options: WaitForAuthorizationCodeOptions
  ) => Promise<string>;
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

const promptForBaseUrl = async (
  callbacks: OAuthLoginCallbacks,
  configuredBaseUrl: string | undefined
) => {
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const value = await callbacks.onPrompt({
    message: "Skillpack base URL",
    placeholder: "https://skillpack.example",
  });
  const baseUrl = normalizeBaseUrl(value.trim());

  if (!baseUrl) {
    throw new Error("Skillpack base URL is required");
  }

  return baseUrl;
};

const toBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const createRandomBase64Url = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  webcrypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const createPkcePair = async (): Promise<PkcePair> => {
  const verifier = createRandomBase64Url(32);
  const digest = await webcrypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return {
    challenge: toBase64Url(new Uint8Array(digest)),
    verifier,
  };
};

const parseJson = async <T>(response: Response) => {
  if (!response.ok) {
    throw new Error(`Skillpack OAuth failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const discoverMetadata = async (
  baseUrl: string,
  request: (input: string | URL, init?: RequestInit) => Promise<Response>
) => {
  for (const path of oauthMetadataPaths) {
    const response = await request(`${baseUrl}${path}`);
    if (response.ok) {
      return parseJson<OAuthMetadata>(response);
    }
  }

  throw new Error(`Skillpack OAuth metadata not found at ${baseUrl}`);
};

const discoverResource = async (
  baseUrl: string,
  request: (input: string | URL, init?: RequestInit) => Promise<Response>
) => {
  const response = await request(
    `${baseUrl}/.well-known/oauth-protected-resource`
  );
  if (!response.ok) {
    return baseUrl;
  }

  const metadata = await parseJson<ProtectedResourceMetadata>(response);
  return metadata.resource ?? baseUrl;
};

const toCredentials = (
  body: TokenResponse,
  previousRefresh: string | undefined,
  now: () => number
): OAuthCredentials => ({
  access: body.access_token,
  expires: now() + (body.expires_in ?? 3600) * 1000,
  refresh: body.refresh_token ?? previousRefresh ?? "",
});

const postToken = async (
  tokenEndpoint: string,
  params: Record<string, string>,
  request: (input: string | URL, init?: RequestInit) => Promise<Response>
) => {
  const response = await request(tokenEndpoint, {
    body: new URLSearchParams(params),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return parseJson<TokenResponse>(response);
};

const registerClient = async (
  metadata: OAuthMetadata,
  redirectUri: string,
  scope: string,
  clientName: string,
  request: (input: string | URL, init?: RequestInit) => Promise<Response>
) => {
  if (!metadata.registration_endpoint) {
    throw new Error(
      "Skillpack OAuth metadata does not include registration_endpoint"
    );
  }

  const response = await request(metadata.registration_endpoint, {
    body: JSON.stringify({
      client_name: clientName,
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [redirectUri],
      response_types: ["code"],
      scope,
      token_endpoint_auth_method: "none",
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const body = await parseJson<OAuthClientRegistrationResponse>(response);

  if (!body.client_id) {
    throw new Error(
      "Skillpack OAuth client registration did not return client_id"
    );
  }

  return body.client_id;
};

interface AuthorizationCodeReceiver {
  close: () => void;
  redirectUri: string;
  waitForCode: (
    authUrl: string,
    callbacks: OAuthLoginCallbacks
  ) => Promise<string>;
}

const createLocalAuthorizationCodeReceiver =
  async (): Promise<AuthorizationCodeReceiver> => {
    const callbackUrl = new URL(
      `http://${defaultCallbackHost}:0${defaultCallbackPath}`
    );
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", callbackUrl);
      if (requestUrl.pathname !== callbackUrl.pathname) {
        response.writeHead(404).end();
        return;
      }

      const code = requestUrl.searchParams.get("code");
      response.writeHead(code ? 200 : 400, { "content-type": "text/plain" });
      response.end(code ? "Skillpack login complete." : "Missing OAuth code.");
      server.close();

      if (code) {
        server.emit("skillpack-code", code);
        return;
      }

      server.emit(
        "error",
        new Error("Skillpack OAuth callback did not include a code")
      );
    });

    server.listen(0, defaultCallbackHost);
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    callbackUrl.port = String(address.port);

    return {
      close: () => server.close(),
      redirectUri: callbackUrl.toString(),
      async waitForCode(authUrl, callbacks) {
        callbacks.onAuth({ url: authUrl });
        const [code] = (await once(server, "skillpack-code")) as [string];
        return code;
      },
    };
  };

const closeInjectedReceiver = () => null;

const createInjectedAuthorizationCodeReceiver = (
  redirectUri: string,
  waitForAuthorizationCode: (
    options: WaitForAuthorizationCodeOptions
  ) => Promise<string>
): AuthorizationCodeReceiver => ({
  close: closeInjectedReceiver,
  redirectUri,
  waitForCode: (authUrl, callbacks) =>
    waitForAuthorizationCode({ authUrl, callbacks, redirectUri }),
});

export const createSkillpackOAuthProvider = (
  options: SkillpackOAuthProviderOptions = {}
) => {
  const request = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const configuredClientId = options.clientId;
  const clientName = options.clientName ?? defaultClientName;
  const scope = options.scope ?? defaultScope;

  return {
    getApiKey(credentials: OAuthCredentials) {
      return credentials.access;
    },
    async login(callbacks: OAuthLoginCallbacks) {
      const baseUrl = await promptForBaseUrl(callbacks, options.baseUrl);
      callbacks.onProgress?.("Discovering Skillpack OAuth metadata");
      const [metadata, resource] = await Promise.all([
        discoverMetadata(baseUrl, request),
        discoverResource(baseUrl, request),
      ]);
      const pkce = await (options.createPkcePair ?? createPkcePair)();
      const receiver =
        options.redirectUri && options.waitForAuthorizationCode
          ? createInjectedAuthorizationCodeReceiver(
              options.redirectUri,
              options.waitForAuthorizationCode
            )
          : await createLocalAuthorizationCodeReceiver();
      const clientId =
        configuredClientId ??
        (await registerClient(
          metadata,
          receiver.redirectUri,
          scope,
          clientName,
          request
        ));
      const authUrl = new URL(metadata.authorization_endpoint);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("code_challenge", pkce.challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("redirect_uri", receiver.redirectUri);
      authUrl.searchParams.set("resource", resource);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scope);

      try {
        const code = await receiver.waitForCode(authUrl.toString(), callbacks);
        const token = await postToken(
          metadata.token_endpoint,
          {
            client_id: clientId,
            code,
            code_verifier: pkce.verifier,
            grant_type: "authorization_code",
            redirect_uri: receiver.redirectUri,
            resource,
          },
          request
        );

        return {
          ...toCredentials(token, undefined, now),
          baseUrl,
          clientId,
          resource,
        };
      } finally {
        receiver.close();
      }
    },
    name: "Skillpack",
    async refreshToken(credentials: OAuthCredentials) {
      const credentialBaseUrl =
        typeof credentials.baseUrl === "string"
          ? credentials.baseUrl
          : undefined;
      const baseUrl = normalizeBaseUrl(
        credentialBaseUrl ?? options.baseUrl ?? ""
      );
      if (!baseUrl) {
        throw new Error("Skillpack OAuth credentials are missing baseUrl");
      }
      const [metadata, resource] = await Promise.all([
        discoverMetadata(baseUrl, request),
        discoverResource(baseUrl, request),
      ]);
      const clientId =
        typeof credentials.clientId === "string"
          ? credentials.clientId
          : configuredClientId;
      if (!clientId) {
        throw new Error("Skillpack OAuth credentials are missing clientId");
      }
      const token = await postToken(
        metadata.token_endpoint,
        {
          client_id: clientId,
          grant_type: "refresh_token",
          refresh_token: credentials.refresh,
          resource:
            typeof credentials.resource === "string"
              ? credentials.resource
              : resource,
        },
        request
      );

      return {
        ...toCredentials(token, credentials.refresh, now),
        baseUrl,
        clientId,
        resource:
          typeof credentials.resource === "string"
            ? credentials.resource
            : resource,
      };
    },
  };
};
