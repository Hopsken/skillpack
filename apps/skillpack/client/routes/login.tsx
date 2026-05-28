import {
  createFileRoute,
  useLoaderData,
  useSearch,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Github, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  loginProvidersQueryOptions,
  signInWithGitHub,
  signInWithOidc,
  useSession,
} from "@/shared/auth/client";
import type { LoginProviders } from "@/shared/auth/client";
import { getVisibleLoginProviders } from "@/shared/auth/login-providers";

const defaultCallbackURL = "/skills";
type LoginProvider = keyof LoginProviders;

const internalRedirectSchema = z
  .string()
  .refine((value) => value.startsWith("/") && !value.startsWith("//"));

const loginSearchSchema = z.object({
  redirect: internalRedirectSchema.optional(),
});

const getCallbackURL = (redirect: string | undefined) =>
  redirect ?? defaultCallbackURL;

const LoginRoute = () => {
  const session = useSession();
  const search = useSearch({ from: "/login" });
  const providers = useLoaderData({ from: "/login" });
  const [error, setError] = useState<string>();
  const [activeProvider, setActiveProvider] = useState<LoginProvider>();
  const callbackURL = getCallbackURL(search.redirect);
  const visibleProviders = getVisibleLoginProviders(providers);

  useEffect(() => {
    if (session.data) {
      window.location.assign(callbackURL);
    }
  }, [callbackURL, session.data]);

  if (session.data) {
    return null;
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

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(loginProvidersQueryOptions()),
  validateSearch: zodValidator(loginSearchSchema),
});
