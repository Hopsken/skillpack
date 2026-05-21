export const apiError = (error: string) => ({ error });
export const skillLocation = (name: string, path = "SKILL.md") => `skill://skills/${name}/${path}`;
