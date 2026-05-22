import { Navigate, useParams, useSearchParams } from "react-router";

import {
  SkillDetailView,
  useSkillDetail,
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
  const { handle } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = searchParams.get("version") ?? undefined;
  const latestSkill = useLatestSkill(handle);
  const versionedSkill = useSkillDetail(handle, version);
  const { versions, status: versionsStatus } = useSkillVersions(handle);
  const skill = version ? versionedSkill.skill : latestSkill.skill;

  if (!handle) {
    return <Navigate to="/library" replace />;
  }

  const activeTab = parseSkillDetailTab(searchParams.get("tab"));
  const setActiveTab = (tab: SkillDetailTab) => {
    const nextParams = new URLSearchParams(searchParams);

    if (tab === "skill") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    setSearchParams(nextParams);
  };

  return (
    <SkillDetailView
      skill={skill}
      skillHandle={handle}
      versions={versions?.versions ?? []}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
};
