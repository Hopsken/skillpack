import type {
  DiscoverSkillsInput,
  ReadSkillDefinitionsInput,
} from "@skillpack/contracts/origins/requests";
import type {
  CreateSkillInput,
  ForkSkillInput,
  PatchSkillInput,
  RestoreVersionInput,
} from "@skillpack/contracts/skills/requests";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createManagedSkill,
  discoverSkills,
  forkManagedSkill,
  patchManagedSkill,
  readSkillDefinitions,
  restoreManagedSkillVersion,
  skillDetailQueryKey,
  skillListQueryKey,
  skillVersionsQueryKey,
} from "./queries";

const invalidateSkillQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  skillId: number | undefined
) => {
  await queryClient.invalidateQueries({ queryKey: skillListQueryKey });
  await queryClient.invalidateQueries({
    queryKey: skillDetailQueryKey(skillId),
  });
  await queryClient.invalidateQueries({
    queryKey: skillVersionsQueryKey(skillId),
  });
};

export const useCreateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSkillInput) => createManagedSkill(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillListQueryKey });
    },
  });
};

export const usePatchSkill = (skillId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PatchSkillInput) => {
      if (!skillId) {
        throw new Error("Missing Skill ID");
      }

      return patchManagedSkill(skillId, input);
    },
    onSuccess: async () => {
      await invalidateSkillQueries(queryClient, skillId);
    },
  });
};

export const useRestoreSkillVersion = (skillId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      version,
    }: {
      input: RestoreVersionInput;
      version: number;
    }) => {
      if (!skillId) {
        throw new Error("Missing Skill ID");
      }

      return restoreManagedSkillVersion(skillId, version, input);
    },
    onSuccess: async () => {
      await invalidateSkillQueries(queryClient, skillId);
    },
  });
};

export const useForkSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ForkSkillInput) => forkManagedSkill(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillListQueryKey });
    },
  });
};

export const useDiscoverSkills = () =>
  useMutation({
    mutationFn: (input: DiscoverSkillsInput) => discoverSkills(input),
  });

export const useReadSkillDefinitions = () =>
  useMutation({
    mutationFn: (input: ReadSkillDefinitionsInput) =>
      readSkillDefinitions(input),
  });
