import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { LibraryView } from "@/components/library-view";
import { SidebarProvider } from "@/components/ui/sidebar";
import { skillCatalogResponseSchema, type SkillCatalogItem } from "@shared/schemas/skills";

export function App() {
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [status, setStatus] = useState("Loading skills...");

  async function loadSkills() {
    setStatus("Loading skills...");
    const response = await fetch("/api/v1/skills/catalog");
    const data = skillCatalogResponseSchema.parse(await response.json());
    setSkills(data.skills);
    setStatus(`${data.skills.length} skills loaded`);
  }

  useEffect(() => {
    loadSkills().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load skills");
    });
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <LibraryView skills={skills} status={status} onRefresh={() => void loadSkills()} />
    </SidebarProvider>
  );
}
