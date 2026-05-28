import {
  skillIdSchema,
  skillVersionNumberSchema,
} from "@skillpack/core/primitives";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { activeSkillQueryOptions } from "@/features/skills/api/query-options";
import {
  useSkillDetail,
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
  skillId: skillIdSchema,
});

const parseSkillRouteParams = (params: unknown) => {
  const parsed = skillRouteParamsSchema.safeParse(params);
  return parsed.success ? parsed.data : false;
};

/* eslint-disable no-use-before-define -- Route exposes typed route-local hooks from the file route declared below. */
const SkillDetailRoute = () => {
  const { skillId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  /* eslint-enable no-use-before-define */
  const { version } = search;
  const skillDetail = useSkillDetail(skillId, version);
  const skillVersions = useSkillVersions(skillId);
  const restoreVersion = useRestoreSkillVersion(skillId);
  const skill = skillDetail.data;

  const { tab: activeTab } = search;
  const setActiveTab = (tab: SkillDetailTab) => {
    void navigate({
      params: { skillId },
      search: {
        tab: tab === "skill" ? undefined : tab,
        version: search.version,
      },
      to: "/skills/$skillId",
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
      skillId={skillId}
      versions={versions}
      versionsStatus={versionsStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRestoreVersion={restore}
    />
  );
};

export const Route = createFileRoute("/_authenticated/skills/$skillId")({
  component: SkillDetailRoute,
  params: {
    parse: parseSkillRouteParams,
    stringify: ({ skillId }) => ({ skillId: String(skillId) }),
  },

  loaderDeps: ({ search }) => ({
    version: search.version,
  }),

  loader: ({ context, deps, params }) => {
    const { skillId } = params;
    const { version } = deps;

    return context.queryClient.ensureQueryData(
      activeSkillQueryOptions(skillId, version)
    );
  },
  validateSearch: zodValidator(skillDetailSearchSchema),
});
