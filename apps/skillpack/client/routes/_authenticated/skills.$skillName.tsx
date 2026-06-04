import {
  safeRelativePathSchema,
  skillNameSchema,
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
import {
  usePatchSkill,
  useRestoreSkillVersion,
} from "@/features/skills/api/use-skill-mutations";
import { SkillDetailSkeleton } from "@/features/skills/components/skill-page-skeletons";
import { skillFilePath } from "@/features/skills/lib/resource-drafts";
import { SkillDetailView } from "@/features/skills/views/skill-detail-view";

const skillDetailSearchSchema = z.object({
  path: safeRelativePathSchema.optional(),
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
  const { path, version } = search;
  const skillDetail = useSkillDetail(skillName, version);
  const skill = skillDetail.data;
  const skillVersions = useSkillVersions(skillName);
  const restoreVersion = useRestoreSkillVersion(skillName);
  const patchSkill = usePatchSkill(skillName);

  const setSelectedPath = (nextPath: string | undefined) => {
    void navigate({
      params: { skillName },
      search: {
        path: nextPath === skillFilePath ? undefined : nextPath,
        version,
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

  const saveChanges: Parameters<
    typeof SkillDetailView
  >[0]["onSaveChanges"] = async (input) => {
    await patchSkill.mutateAsync(input);
    await skillDetail.refetch();

    if (search.version) {
      await navigate({
        params: { skillName },
        search: { path, version: undefined },
        to: "/skills/$skillName",
      });
    }
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
      selectedPath={path}
      onPathChange={setSelectedPath}
      onRestoreVersion={restore}
      onSaveChanges={saveChanges}
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
      activeSkillQueryOptions(skillName, version)
    );
  },
  validateSearch: zodValidator(skillDetailSearchSchema),
});
