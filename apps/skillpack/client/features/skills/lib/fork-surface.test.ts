import { describe, expect, it } from "vitest";

import { getForkDiscoveryStatus, getForkSelectionStatus } from "./fork-surface";

describe("fork surface helpers", () => {
  it("describes discovery progress with product copy", () => {
    expect(getForkDiscoveryStatus(0, true)).toBe("Discovering skills...");
    expect(getForkDiscoveryStatus(0, false)).toBe("No skills found.");
    expect(getForkDiscoveryStatus(4, false)).toBe("4 skills found");
  });

  it("tracks selection count for batch Add to Library", () => {
    expect(getForkSelectionStatus(0)).toBe("No skills selected");
    expect(getForkSelectionStatus(1)).toBe("1 skill selected");
    expect(getForkSelectionStatus(3)).toBe("3 skills selected");
  });
});
