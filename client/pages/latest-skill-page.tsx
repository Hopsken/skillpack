import { Navigate, useParams, useSearchParams } from "react-router";

import {
  SkillDetailView,
  useSkillDetail,
  useLatestSkill,
  useRestoreSkillVersion,
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
  const { skillId: skillIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const skillId = skillIdParam ? Number(skillIdParam) : undefined;
  const versionParam = searchParams.get("version");
  const version = versionParam ? Number(versionParam) : undefined;
  const latestSkill = useLatestSkill(skillId);
  const versionedSkill = useSkillDetail(skillId, version);
  const { versions, status: versionsStatus } = useSkillVersions(skillId);
  const restoreVersion = useRestoreSkillVersion(skillId);
  const skill = version ? versionedSkill.skill : latestSkill.skill;

  if (!(skillId && Number.isInteger(skillId))) {
    return <Navigate to="/skills" replace />;
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

  const restore = async (versionNumber: number) => {
    await restoreVersion.mutateAsync({
      input: {
        changeSummary: `Restore version ${versionNumber}`,
      },
      version: versionNumber,
    });
  };

  return (
    <SkillDetailView
      skill={skill}
      skillId={skillId}
      versions={versions?.versions ?? []}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRestoreVersion={restore}
    />
  );
};
