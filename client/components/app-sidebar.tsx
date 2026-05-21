import { LibraryIcon, SettingsIcon, UserCircleIcon } from "lucide-react";
import { NavLink } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";

const footerItems = [
  { label: "Preferences", icon: SettingsIcon },
  { label: "Sean", icon: UserCircleIcon }
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="h-svh border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
        skillpack
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Library" className="font-medium">
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
          {footerItems.map(({ label, icon: Icon }) => (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton>
                <Icon />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
