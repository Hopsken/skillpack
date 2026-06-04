export const getForkDiscoveryStatus = (
  skillCount: number,
  isLoading: boolean
): string => {
  if (isLoading) {
    return "Discovering skills...";
  }

  if (skillCount === 0) {
    return "No skills found.";
  }

  const noun = skillCount === 1 ? "skill" : "skills";
  return `${skillCount} ${noun} found`;
};

export const getForkSelectionStatus = (skillCount: number): string => {
  if (skillCount === 0) {
    return "No skills selected";
  }

  const noun = skillCount === 1 ? "skill" : "skills";
  return `${skillCount} ${noun} selected`;
};
