import { Navigate, useParams, useSearchParams } from "react-router";

import {
  useLatestSkill,
  useSkillDetail,
  useSkillVersions,
} from "@/features/skills/api/use-skill-detail";
import { useRestoreSkillVersion } from "@/features/skills/api/use-skill-mutations";
import type { SkillDetailTab } from "@/features/skills/views/skill-detail-view";
import { SkillDetailView } from "@/features/skills/views/skill-detail-view";

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
  const skillVersions = useSkillVersions(skillId);
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
  const versionCount = skillVersions.versions?.versions.length ?? 0;
  const versionsStatus = skillVersions.isLoading
    ? "Loading versions..."
    : `${versionCount} versions loaded`;

  return (
    <SkillDetailView
      skill={skill}
      skillId={skillId}
      versions={skillVersions.versions?.versions ?? []}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRestoreVersion={restore}
    />
  );
};
