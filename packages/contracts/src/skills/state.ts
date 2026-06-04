export interface SkillOriginJson {
  kind: "github";
  metadata: Record<string, unknown> | null;
  url: string;
}

export interface SkillSnapshotStateJson {
  name: string;
  description: string;
  license: string | null;
  compatibility: string | null;
  allowedTools: string | null;
  metadata: Record<string, string> | null;
  origin: SkillOriginJson | null;

  resources: {
    path: string;
    sha256: string;
    mediaType: string;
    size: number;
  }[];
}
