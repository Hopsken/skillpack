import { Navigate, Outlet, Route, Routes } from "react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LibraryPage } from "@/pages/library-page";

const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <Outlet />
  </SidebarProvider>
);

export const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Navigate to="/library" replace />} />
      <Route path="library" element={<LibraryPage />} />
    </Route>
  </Routes>
);
