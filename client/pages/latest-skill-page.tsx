import { Navigate, useParams, useSearchParams } from "react-router";

import {
  SkillDetailView,
  useLatestSkill,
  useSkillVersions,
} from "@/features/skills";
import type { SkillDetailTab } from "@/features/skills";

const skillDetailTabs = ["skill", "resources", "versions"] as const;
const validTabs = new Set<string>(skillDetailTabs);

const parseSkillDetailTab = (value: string | null): SkillDetailTab => {
  if (value && validTabs.has(value)) {
    return value as SkillDetailTab;
  }

  return "skill";
};

export const LatestSkillPage = () => {
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { skill } = useLatestSkill(name);
  const { versions, status: versionsStatus } = useSkillVersions(name);

  if (!name) {
    return <Navigate to="/library" replace />;
  }

  const activeTab = parseSkillDetailTab(searchParams.get("tab"));
  const setActiveTab = (tab: SkillDetailTab) => {
    setSearchParams(tab === "skill" ? {} : { tab });
  };

  return (
    <SkillDetailView
      skill={skill}
      versions={versions?.versions ?? []}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
};
