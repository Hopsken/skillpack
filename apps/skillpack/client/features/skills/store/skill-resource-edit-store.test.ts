import { beforeEach, describe, expect, it } from "vitest";

import { getChangeCount } from "../lib/resource-draft-session";
import {
  getSkillResourceEditSession,
  useSkillResourceEditStore,
} from "./skill-resource-edit-store";

const getSession = () =>
  getSkillResourceEditSession(useSkillResourceEditStore.getState());

describe("skill resource edit store", () => {
  beforeEach(() => {
    useSkillResourceEditStore.getState().resetForSkill();
  });

  it("tracks a skill name draft until it matches the original name", () => {
    const store = useSkillResourceEditStore.getState();

    store.changeSkillName("renamed-skill", "demo-skill");
    expect(useSkillResourceEditStore.getState().skillNameDraft).toBe(
      "renamed-skill"
    );

    useSkillResourceEditStore
      .getState()
      .changeSkillName("demo-skill", "demo-skill");
    expect(useSkillResourceEditStore.getState().skillNameDraft).toBeUndefined();
  });

  it("clears the original deletion when deleting a renamed file draft", () => {
    const store = useSkillResourceEditStore.getState();

    store.renamePath("references/old.md", "references/new.md", "content");
    expect(getChangeCount(getSession())).toBe(1);

    const result = useSkillResourceEditStore
      .getState()
      .deletePath("references/new.md");
    const state = useSkillResourceEditStore.getState();

    expect(result).toStrictEqual({ selectedPath: "SKILL.md" });
    expect({
      added: state.addedPaths.has("references/new.md"),
      changeCount: getChangeCount(getSession()),
      deletedOriginal: state.deletedPaths.has("references/old.md"),
      renamedFrom: state.renamedFromByPath["references/new.md"],
    }).toStrictEqual({
      added: false,
      changeCount: 0,
      deletedOriginal: false,
      renamedFrom: undefined,
    });
  });
});
