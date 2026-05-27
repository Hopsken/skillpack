import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Spinner,
} from "@/components/ui";
import {
  getPublicOAuthClient,
  respondToOAuthConsent,
  useSession,
} from "@/shared/auth/client";

const skillReadScope = "skills:read";

interface OAuthClientPreview {
  client_id?: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
}

const parseScopes = (scope: string | null) =>
  scope
    ?.split(" ")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const getClientName = (client?: OAuthClientPreview) =>
  client?.client_name ?? client?.client_id ?? "OAuth client";

export const OAuthConsentPage = () => {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const scopes = useMemo(
    () => parseScopes(searchParams.get("scope")),
    [searchParams]
  );
  const [client, setClient] = useState<OAuthClientPreview>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadClient = async () => {
      if (!clientId) {
        setError("Invalid OAuth client");
        return;
      }

      const response = await getPublicOAuthClient(clientId);

      if (!active) {
        return;
      }

      if (response.error) {
        setError(response.error.message ?? "OAuth client not found");
        return;
      }

      setClient(response.data as OAuthClientPreview);
    };

    void loadClient();

    return () => {
      active = false;
    };
  }, [clientId]);

  if (session.isPending) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6">
        <Spinner />
      </main>
    );
  }

  if (!session.data) {
    const redirect = `/oauth/consent?${searchParams.toString()}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }

  const submitConsent = async (accept: boolean) => {
    setError(undefined);
    setIsSubmitting(true);

    const response = await respondToOAuthConsent(
      accept,
      accept ? scopes.join(" ") : undefined
    );

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? "OAuth consent failed");
      return;
    }

    window.location.assign(response.data.url);
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">skillpack</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Authorize access
          </h1>
          <p className="text-sm text-muted-foreground">
            {getClientName(client)} wants read access to your Skill Library.
          </p>
        </div>

        <div className="mt-6 space-y-3 rounded-md border border-border p-4">
          <div>
            <p className="text-sm font-medium">Requested access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Read your Managed Skills and their resources.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scopes.includes(skillReadScope) ? (
              <Badge variant="outline">{skillReadScope}</Badge>
            ) : null}
            {scopes
              .filter((scope) => scope !== skillReadScope)
              .map((scope) => (
                <Badge key={scope} variant="secondary">
                  {scope}
                </Badge>
              ))}
          </div>
        </div>

        {error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            disabled={isSubmitting || Boolean(error && !client)}
            onClick={() => {
              void submitConsent(true);
            }}
          >
            Allow
          </Button>
          <Button
            className="flex-1"
            disabled={isSubmitting || Boolean(error && !client)}
            onClick={() => {
              void submitConsent(false);
            }}
            variant="outline"
          >
            Deny
          </Button>
        </div>
      </section>
    </main>
  );
};
