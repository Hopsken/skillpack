import { createRouter } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { queryClient } from "@/shared/api/query-client";

export const router = createRouter({
  context: { queryClient },
  defaultPreloadStaleTime: 0,
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
