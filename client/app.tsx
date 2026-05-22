import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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

const loadSkillDetailPage = async () => {
  const module = await import("@/pages/skill-detail-page");
  return { default: module.SkillDetailPage };
};

const LatestSkillPage = lazy(loadLatestSkillPage);
const LibraryPage = lazy(loadLibraryPage);
const SkillDetailPage = lazy(loadSkillDetailPage);

const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  </SidebarProvider>
);

export const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Navigate to="/library" replace />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="skills/:name" element={<LatestSkillPage />} />
      <Route path="skills/:name/v/:version" element={<SkillDetailPage />} />
    </Route>
  </Routes>
);
