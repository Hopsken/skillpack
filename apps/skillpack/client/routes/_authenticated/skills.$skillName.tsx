import {
  safeRelativePathSchema,
  skillNameSchema,
} from "@skillpack/core/primitives";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { activeSkillQueryOptions } from "@/features/skills/api/query-options";
import {
  useSkillDetail,
  useSkillSnapshots,
} from "@/features/skills/api/use-skill-detail";
import {
  usePatchSkill,
  useRestoreSkillSnapshot,
} from "@/features/skills/api/use-skill-mutations";
import { SkillDetailSkeleton } from "@/features/skills/components/skill-page-skeletons";
import { skillFilePath } from "@/features/skills/lib/resource-drafts";
import { SkillDetailView } from "@/features/skills/views/skill-detail-view";

const skillDetailSearchSchema = z.object({
  path: safeRelativePathSchema.optional(),
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
  const { path } = search;
  const skillDetail = useSkillDetail(skillName);
  const skill = skillDetail.data;
  const skillSnapshots = useSkillSnapshots(skillName);
  const restoreSnapshot = useRestoreSkillSnapshot(skillName);
  const patchSkill = usePatchSkill(skillName);

  const setSelectedPath = (nextPath: string | undefined) => {
    void navigate({
      params: { skillName },
      search: { path: nextPath === skillFilePath ? undefined : nextPath },
      to: "/skills/$skillName",
    });
  };

  const restore = async (snapshotNumber: number) => {
    await restoreSnapshot.mutateAsync(snapshotNumber);
    await skillDetail.refetch();
  };

  const saveChanges: Parameters<
    typeof SkillDetailView
  >[0]["onSaveChanges"] = async (input) => {
    const result = await patchSkill.mutateAsync(input);
    const nextSkillName = result.name;
    await skillDetail.refetch();

    if (nextSkillName !== skillName) {
      await navigate({
        params: { skillName: nextSkillName },
        search: { path },
        to: "/skills/$skillName",
      });
    }
  };
  const snapshots = skillSnapshots.data ?? [];
  const snapshotCount = snapshots.length;
  const snapshotsStatus = skillSnapshots.isPending
    ? "Loading snapshots..."
    : `${snapshotCount} snapshots loaded`;

  if (skillDetail.isPending && !skill) {
    return <SkillDetailSkeleton />;
  }

  return (
    <SkillDetailView
      skill={skill}
      snapshots={snapshots}
      snapshotsStatus={snapshotsStatus}
      selectedPath={path}
      onPathChange={setSelectedPath}
      onRestoreSnapshot={restore}
      onSaveChanges={saveChanges}
    />
  );
};

export const Route = createFileRoute("/_authenticated/skills/$skillName")({
  component: SkillDetailRoute,
  loader: ({ context, params }) => {
    const { skillName } = params;

    return context.queryClient.ensureQueryData(
      activeSkillQueryOptions(skillName)
    );
  },
  params: {
    parse: parseSkillRouteParams,
    stringify: ({ skillName }) => ({ skillName }),
  },
  validateSearch: zodValidator(skillDetailSearchSchema),
});
