import { skillCatalogResponseSchema } from "@shared/schemas/skills";
import type { SkillCatalogItem } from "@shared/schemas/skills";
import { useCallback, useEffect, useState } from "react";

export interface SkillCatalogState {
  skills: SkillCatalogItem[];
  status: string;
  refresh: () => Promise<void>;
}

export const useSkillCatalog = (): SkillCatalogState => {
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [status, setStatus] = useState("Loading skills...");

  const loadSkills = async (): Promise<void> => {
    setStatus("Loading skills...");
    const response = await fetch("/api/v1/skills/catalog");
    const data = skillCatalogResponseSchema.parse(await response.json());
    setSkills(data.skills);
    setStatus(`${data.skills.length} skills loaded`);
  };

  const refresh = useCallback(async (): Promise<void> => {
    try {
      await loadSkills();
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load skills"
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { refresh, skills, status };
};
