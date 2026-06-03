import type {
  CreateSkillInput,
  ForkSkillInput,
  PatchSkillInput,
  RestoreVersionInput,
} from "@skillpack/contracts/skills/requests";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  latestSkillQueryKey,
  skillQueryPrefix,
  skillDetailQueryPrefix,
  skillFileQueryPrefix,
  skillVersionsQueryKey,
} from "./query-keys";
import {
  createManagedSkill,
  forkManagedSkill,
  patchManagedSkill,
  restoreManagedSkillVersion,
} from "./requests";

const invalidateSkillQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  skillName: string | undefined
) => {
  await queryClient.invalidateQueries({ queryKey: skillQueryPrefix });
  await queryClient.invalidateQueries({
    queryKey: latestSkillQueryKey(skillName),
  });
  await queryClient.invalidateQueries({
    queryKey: skillDetailQueryPrefix(skillName),
  });
  await queryClient.invalidateQueries({
    queryKey: skillFileQueryPrefix(skillName),
  });
  await queryClient.invalidateQueries({
    queryKey: skillVersionsQueryKey(skillName),
  });
};

export const useCreateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSkillInput) => createManagedSkill(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillQueryPrefix });
    },
  });
};

export const usePatchSkill = (skillName: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PatchSkillInput) => {
      if (!skillName) {
        throw new Error("Missing Skill Name");
      }

      return patchManagedSkill(skillName, input);
    },
    onSuccess: async () => {
      await invalidateSkillQueries(queryClient, skillName);
    },
  });
};

export const useRestoreSkillVersion = (skillName: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      version,
    }: {
      input: RestoreVersionInput;
      version: number;
    }) => {
      if (!skillName) {
        throw new Error("Missing Skill Name");
      }

      return restoreManagedSkillVersion(skillName, version, input);
    },
    onSuccess: async () => {
      await invalidateSkillQueries(queryClient, skillName);
    },
  });
};

export const useForkSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ForkSkillInput) => forkManagedSkill(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillQueryPrefix });
    },
  });
};
