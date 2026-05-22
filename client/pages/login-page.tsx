import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { signInWithOidc, useSession } from "@/shared/auth/client";

const defaultCallbackURL = "/library";

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
  const callbackURL = getCallbackURL(searchParams.get("redirect"));

  if (session.data) {
    return <Navigate to={callbackURL} replace />;
  }

  const login = async () => {
    setError(undefined);

    const response = await signInWithOidc(callbackURL);

    if (response.error) {
      setError(response.error.message ?? "Login failed");
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">skillpack</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue with your identity provider.
          </p>
        </div>

        <Button
          className="mt-6 w-full"
          disabled={session.isPending}
          onClick={() => {
            void login();
          }}
        >
          Continue with OIDC
        </Button>

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
      </section>
    </main>
  );
};
