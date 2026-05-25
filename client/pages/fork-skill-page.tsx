import type { DiscoverSkillsInput } from "@shared/contract/origins/requests";
import type { ForkSkillInput } from "@shared/contract/skills/requests";

import {
  SkillForkView,
  useDiscoverSkills,
  useForkSkill,
} from "@/features/skills";

export const ForkSkillPage = () => {
  const discoverSkills = useDiscoverSkills();
  const forkSkill = useForkSkill();

  const discover = (input: DiscoverSkillsInput) =>
    discoverSkills.mutateAsync(input);

  const submit = (input: ForkSkillInput) => forkSkill.mutateAsync(input);

  return (
    <SkillForkView
      status="Review origin before use"
      onDiscover={discover}
      onSubmit={submit}
    />
  );
};
