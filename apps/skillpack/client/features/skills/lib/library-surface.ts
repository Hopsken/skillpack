import { addSkillPath, createSkillPath } from "./routes";

interface LibraryActionDefinition {
  kind: "primary" | "secondary";
  label: string;
  to: string;
}

export const getLibraryActions = (): LibraryActionDefinition[] => [
  {
    kind: "primary",
    label: "Add to Library",
    to: addSkillPath,
  },
  {
    kind: "secondary",
    label: "Create Skill",
    to: createSkillPath,
  },
];

export const getEmptyLibraryActions = (): LibraryActionDefinition[] => [
  {
    kind: "primary",
    label: "Add to Library",
    to: addSkillPath,
  },
  {
    kind: "secondary",
    label: "Create your first skill",
    to: createSkillPath,
  },
];

export const getManagedSkillsSummary = (skillCount: number): string => {
  if (skillCount === 0) {
    return "No managed skills yet";
  }

  const noun = skillCount === 1 ? "managed skill" : "managed skills";
  return `${skillCount} ${noun}`;
};
