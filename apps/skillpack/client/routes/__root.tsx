import type { QueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { HTTPError } from "ky";

import { Button } from "@/components/ui/button";

export interface RouterContext {
  queryClient: QueryClient;
}

const getErrorStatus = (error: unknown) =>
  error instanceof HTTPError ? error.response.status : undefined;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

const RouteError = ({
  error,
  status: explicitStatus,
}: {
  error: unknown;
  status?: number;
}) => {
  const router = useRouter();
  const status = explicitStatus ?? getErrorStatus(error);
  const isNotFound = status === 404;
  const isServerError = status ? status >= 500 : true;
  const title = isNotFound ? "Not found" : "Unable to load";
  const message = isNotFound
    ? "The requested page or Managed Skill could not be found."
    : getErrorMessage(error);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {status ? `HTTP ${status}` : "Route error"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="mt-6 flex gap-2">
          {isServerError ? (
            <Button
              onClick={() => {
                void router.invalidate();
              }}
            >
              Retry
            </Button>
          ) : null}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/skills" />}
          >
            Library
          </Button>
        </div>
      </section>
    </main>
  );
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <RouteError error={new Error("Not found")} status={404} />
  ),
});
