import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSession } from "@/shared/auth/client";

const RouteFallback = () => (
  <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </header>
  </main>
);

const loadLatestSkillPage = async () => {
  const module = await import("@/pages/latest-skill-page");
  return { default: module.LatestSkillPage };
};

const loadLibraryPage = async () => {
  const module = await import("@/pages/library-page");
  return { default: module.LibraryPage };
};

const loadLoginPage = async () => {
  const module = await import("@/pages/login-page");
  return { default: module.LoginPage };
};

const LatestSkillPage = lazy(loadLatestSkillPage);
const LibraryPage = lazy(loadLibraryPage);
const LoginPage = lazy(loadLoginPage);

const getLoginPath = (pathname: string, search: string) => {
  const redirect = `${pathname}${search}`;
  return `/login?redirect=${encodeURIComponent(redirect)}`;
};

const ProtectedLayout = () => {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return <RouteFallback />;
  }

  if (!session.data) {
    const loginPath = getLoginPath(location.pathname, location.search);
    return <Navigate to={loginPath} replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </SidebarProvider>
  );
};

export const App = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="skills/skillpack/:handle" element={<LatestSkillPage />} />
      </Route>
    </Routes>
  </Suspense>
);
