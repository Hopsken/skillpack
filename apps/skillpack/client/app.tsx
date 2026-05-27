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

const loadCreateSkillPage = async () => {
  const module = await import("@/pages/create-skill-page");
  return { default: module.CreateSkillPage };
};

const loadEditSkillPage = async () => {
  const module = await import("@/pages/edit-skill-page");
  return { default: module.EditSkillPage };
};

const loadForkSkillPage = async () => {
  const module = await import("@/pages/fork-skill-page");
  return { default: module.ForkSkillPage };
};

const loadManagedSkillsPage = async () => {
  const module = await import("@/pages/managed-skills-page");
  return { default: module.ManagedSkillsPage };
};

const loadLoginPage = async () => {
  const module = await import("@/pages/login-page");
  return { default: module.LoginPage };
};

const loadOAuthConsentPage = async () => {
  const module = await import("@/pages/oauth-consent-page");
  return { default: module.OAuthConsentPage };
};

const CreateSkillPage = lazy(loadCreateSkillPage);
const EditSkillPage = lazy(loadEditSkillPage);
const ForkSkillPage = lazy(loadForkSkillPage);
const LatestSkillPage = lazy(loadLatestSkillPage);
const LoginPage = lazy(loadLoginPage);
const ManagedSkillsPage = lazy(loadManagedSkillsPage);
const OAuthConsentPage = lazy(loadOAuthConsentPage);

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
      <Route path="oauth/consent" element={<OAuthConsentPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/skills" replace />} />
        <Route path="skills" element={<ManagedSkillsPage />} />
        <Route path="skills/new" element={<CreateSkillPage />} />
        <Route path="skills/fork" element={<ForkSkillPage />} />
        <Route path="skills/:skillId" element={<LatestSkillPage />} />
        <Route path="skills/:skillId/edit" element={<EditSkillPage />} />
      </Route>
    </Routes>
  </Suspense>
);
