import { LibraryIcon, LogOutIcon, UserCircleIcon } from "lucide-react";
import { matchPath, NavLink, useLocation } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/shared/auth/client";

const libraryActivePatterns = ["/library/*", "/skills/*"] as const;

const matchesAnyPath = (pathname: string, patterns: readonly string[]) =>
  patterns.some((pattern) => matchPath(pattern, pathname));

const signOutAndRedirect = async () => {
  await signOut(() => {
    window.location.assign("/login");
  });
};

export const AppSidebar = () => {
  const { pathname } = useLocation();
  const session = useSession();
  const isLibraryActive = matchesAnyPath(pathname, libraryActivePatterns);
  const userName = session.data?.user.name ?? "Account";

  return (
    <Sidebar
      collapsible="none"
      className="h-svh border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
        skillpack
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isLibraryActive}
                  size="lg"
                  tooltip="Library"
                  className="font-medium"
                >
                  <NavLink to="/library">
                    <LibraryIcon />
                    <span>Library</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <UserCircleIcon />
              <span>{userName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => {
                void signOutAndRedirect();
              }}
            >
              <LogOutIcon />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
