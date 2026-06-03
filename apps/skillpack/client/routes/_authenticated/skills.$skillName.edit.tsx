import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/skills/$skillName/edit")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { skillName: params.skillName },
      replace: true,
      search: { path: undefined, version: undefined },
      to: "/skills/$skillName",
    });
  },
});
