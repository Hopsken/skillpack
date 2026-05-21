import { useEffect, useState } from "react";
import { skillCatalogResponseSchema, type SkillCatalogItem } from "@shared/schemas/skills";

export type SkillCatalogState = {
  skills: SkillCatalogItem[];
  status: string;
  refresh: () => void;
};

export function useSkillCatalog(): SkillCatalogState {
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [status, setStatus] = useState("Loading skills...");

  async function loadSkills(): Promise<void> {
    setStatus("Loading skills...");
    const response = await fetch("/api/v1/skills/catalog");
    const data = skillCatalogResponseSchema.parse(await response.json());
    setSkills(data.skills);
    setStatus(`${data.skills.length} skills loaded`);
  }

  function refresh(): void {
    void loadSkills().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load skills");
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  return { skills, status, refresh };
}
