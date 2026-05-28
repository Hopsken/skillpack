import {
  skillNameSchema,
  skillVersionNumberSchema,
} from "@skillpack/core/primitives";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { activeSkillByNameQueryOptions } from "@/features/skills/api/query-options";
import {
  useSkillDetailByName,
  useSkillVersions,
} from "@/features/skills/api/use-skill-detail";
import { useRestoreSkillVersion } from "@/features/skills/api/use-skill-mutations";
import { SkillDetailSkeleton } from "@/features/skills/components/skill-page-skeletons";
import type { SkillDetailTab } from "@/features/skills/views/skill-detail-view";
import { SkillDetailView } from "@/features/skills/views/skill-detail-view";

const skillDetailTabs = ["skill", "resources", "versions"] as const;
const skillDetailTabSchema = z.enum(skillDetailTabs);
const defaultSkillDetailTab: SkillDetailTab = "skill";

const skillDetailSearchSchema = z.object({
  tab: skillDetailTabSchema.default(defaultSkillDetailTab),
  version: skillVersionNumberSchema.optional(),
});

const skillRouteParamsSchema = z.object({
  skillName: skillNameSchema,
});

const parseSkillRouteParams = (params: unknown) => {
  const parsed = skillRouteParamsSchema.safeParse(params);
  return parsed.success ? parsed.data : false;
};

/* eslint-disable no-use-before-define -- Route exposes typed route-local hooks from the file route declared below. */
const SkillDetailRoute = () => {
  const { skillName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  /* eslint-enable no-use-before-define */
  const { version } = search;
  const skillDetail = useSkillDetailByName(skillName, version);
  const skill = skillDetail.data;
  const skillVersions = useSkillVersions(skill?.id);
  const restoreVersion = useRestoreSkillVersion(skill?.id);

  const { tab: activeTab } = search;
  const setActiveTab = (tab: SkillDetailTab) => {
    void navigate({
      params: { skillName },
      search: {
        tab: tab === "skill" ? undefined : tab,
        version: search.version,
      },
      to: "/skills/$skillName",
    });
  };

  const restore = async (versionNumber: number) => {
    await restoreVersion.mutateAsync({
      input: {
        changeSummary: `Restore version ${versionNumber}`,
      },
      version: versionNumber,
    });
  };
  const versions = skillVersions.data ?? [];
  const versionCount = versions.length;
  const versionsStatus = skillVersions.isPending
    ? "Loading versions..."
    : `${versionCount} versions loaded`;

  if (skillDetail.isPending && !skill) {
    return <SkillDetailSkeleton />;
  }

  return (
    <SkillDetailView
      skill={skill}
      skillName={skillName}
      versions={versions}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRestoreVersion={restore}
    />
  );
};

export const Route = createFileRoute("/_authenticated/skills/$skillName")({
  component: SkillDetailRoute,
  params: {
    parse: parseSkillRouteParams,
    stringify: ({ skillName }) => ({ skillName }),
  },

  loaderDeps: ({ search }) => ({
    version: search.version,
  }),

  loader: ({ context, deps, params }) => {
    const { skillName } = params;
    const { version } = deps;

    return context.queryClient.ensureQueryData(
      activeSkillByNameQueryOptions(skillName, version)
    );
  },
  validateSearch: zodValidator(skillDetailSearchSchema),
});
