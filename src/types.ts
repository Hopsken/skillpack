export interface SkillSpecifier {
  type: 'github' | 'local';
  // GitHub
  owner?: string;
  repo?: string;
  skillName?: string;
  versionRange?: string;
  // Local
  localPath?: string;
}

export interface ResolvedSkill {
  type: 'github' | 'local';
  owner?: string;
  repo?: string;
  commit?: string;
  ref?: string;
  skill_path?: string;
  version?: string;
  localPath?: string;
}

export interface LockEntry {
  specifier: string;
  resolved: ResolvedSkill;
  integrity: string;
  resolved_at: string;
}

export interface Manifest {
  version: number;
  skills: Record<string, string>;
}

export interface LockFile {
  version: number;
  locked_at: string;
  skills: Record<string, LockEntry>;
}
