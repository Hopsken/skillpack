import { useQuery } from "@tanstack/react-query";
import { Github, KeyRound } from "lucide-react";
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  getLoginProviders,
  signInWithGitHub,
  signInWithOidc,
  useSession,
} from "@/shared/auth/client";
import type { LoginProviders } from "@/shared/auth/client";

const defaultCallbackURL = "/skills";
const defaultLoginProviders: LoginProviders = { github: true, oidc: false };
type LoginProvider = keyof LoginProviders;

export const getVisibleLoginProviders = (providers: LoginProviders) =>
  (["github", "oidc"] as const).filter((provider) => providers[provider]);

const getCallbackURL = (redirect: string | null) => {
  if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  return defaultCallbackURL;
};

export const LoginPage = () => {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>();
  const [activeProvider, setActiveProvider] = useState<LoginProvider>();
  const providersQuery = useQuery({
    queryFn: getLoginProviders,
    queryKey: ["auth", "login-providers"],
  });
  const callbackURL = getCallbackURL(searchParams.get("redirect"));
  const visibleProviders = getVisibleLoginProviders(
    providersQuery.data ?? defaultLoginProviders
  );

  if (session.data) {
    return <Navigate to={callbackURL} replace />;
  }

  const login = async (provider: LoginProvider) => {
    setError(undefined);
    setActiveProvider(provider);

    const response =
      provider === "github"
        ? await signInWithGitHub(callbackURL)
        : await signInWithOidc(callbackURL);

    if (response.error) {
      setError(response.error.message ?? "Login failed");
      setActiveProvider(undefined);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">skillpack</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue with GitHub or your configured identity provider.
          </p>
        </div>

        <div className="mt-6 space-y-2">
          {visibleProviders.map((provider) => (
            <Button
              className="w-full"
              disabled={session.isPending || Boolean(activeProvider)}
              key={provider}
              onClick={() => {
                void login(provider);
              }}
              variant={provider === "github" ? "default" : "outline"}
            >
              {provider === "github" ? <Github /> : <KeyRound />}
              {provider === "github"
                ? "Continue with GitHub"
                : "Continue with OIDC"}
            </Button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
      </section>
    </main>
  );
};
