import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/skills/$skillId/edit")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { skillId: params.skillId },
      replace: true,
      search: { tab: undefined, version: undefined },
      to: "/skills/$skillId",
    });
  },
});
