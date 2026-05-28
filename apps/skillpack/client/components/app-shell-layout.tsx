import { Outlet, useRouteContext } from "@tanstack/react-router";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const AppShellRouteFallback = () => (
  <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <Skeleton className="h-5 w-40 rounded-md" />
      <Skeleton className="h-8 w-24 rounded-md" />
    </header>
    <div className="min-h-0 flex-1 p-6">
      <div className="grid gap-3">
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
      </div>
    </div>
  </>
);

export const AppShellLayout = () => {
  const { session } = useRouteContext({ from: "/_authenticated" });

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
        <Suspense fallback={<AppShellRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </SidebarProvider>
  );
};
