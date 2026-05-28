import { Outlet, createFileRoute } from "@tanstack/react-router";

const SkillsLayoutRoute = () => <Outlet />;

export const Route = createFileRoute("/_authenticated/skills")({
  component: SkillsLayoutRoute,
});
