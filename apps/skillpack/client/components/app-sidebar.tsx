import { LibraryIcon, LogOutIcon } from "lucide-react";
import { matchPath, NavLink, useLocation } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const managedSkillsActivePatterns = ["/skills/*"] as const;

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
  const isManagedSkillsActive = matchesAnyPath(
    pathname,
    managedSkillsActivePatterns
  );
  const userName = session.data?.user.name ?? "Account";
  const userImage = session.data?.user.image;
  const userInitial = userName.trim().charAt(0).toUpperCase() || "A";

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
                  isActive={isManagedSkillsActive}
                  size="lg"
                  tooltip="Library"
                  className="font-medium"
                  render={<NavLink to="/skills" />}
                >
                  <LibraryIcon />
                  <span>Library</span>
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
              <Avatar size="sm">
                {userImage ? <AvatarImage src={userImage} alt="" /> : null}
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
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
