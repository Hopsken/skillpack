import type {
  DiscoverSkillsInput,
  ReadSkillDefinitionsInput,
} from "@skillpack/contracts/origins/requests";
import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import { useCallback } from "react";

import {
  SkillForkView,
  useDiscoverSkills,
  useForkSkill,
  useReadSkillDefinitions,
} from "@/features/skills";

export const ForkSkillPage = () => {
  const discoverSkills = useDiscoverSkills();
  const forkSkill = useForkSkill();
  const readSkillDefinitions = useReadSkillDefinitions();
  const discoverSkillsAsync = discoverSkills.mutateAsync;
  const forkSkillAsync = forkSkill.mutateAsync;
  const readSkillDefinitionsAsync = readSkillDefinitions.mutateAsync;

  const discover = useCallback(
    (input: DiscoverSkillsInput) => discoverSkillsAsync(input),
    [discoverSkillsAsync]
  );

  const submit = useCallback(
    (input: ForkSkillInput) => forkSkillAsync(input),
    [forkSkillAsync]
  );

  const readDefinitions = useCallback(
    (input: ReadSkillDefinitionsInput) => readSkillDefinitionsAsync(input),
    [readSkillDefinitionsAsync]
  );

  return (
    <SkillForkView
      status="Review origin before use"
      onDiscover={discover}
      onReadDefinitions={readDefinitions}
      onSubmit={submit}
    />
  );
};
