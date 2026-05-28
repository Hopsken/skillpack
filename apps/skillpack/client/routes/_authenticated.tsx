import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShellLayout } from "@/components/app-shell-layout";
import { sessionQueryOptions } from "@/shared/auth/client";

const getLoginPath = (href: string) =>
  `/login?redirect=${encodeURIComponent(href)}`;

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    );

    if (!session.data) {
      throw redirect({
        replace: true,
        to: getLoginPath(location.href),
      });
    }

    return { session: session.data };
  },
  component: AppShellLayout,
});
