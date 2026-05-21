export const apiError = (error: string) => ({ error });
export const skillLocation = (name: string, path = "SKILL.md") => `api://skills/${name}/${path}`;
