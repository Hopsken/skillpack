import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { skillCatalogResponseSchema, type SkillCatalogItem } from "@schemas/skills";

export function App() {
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [status, setStatus] = useState("Loading skills...");

  async function loadSkills() {
    setStatus("Loading skills...");
    const response = await fetch("/api/v1/skills/catalog");
    const data = skillCatalogResponseSchema.parse(await response.json());
    setSkills(data.skills);
    setStatus(`${data.skills.length} skills loaded`);
  }

  useEffect(() => {
    loadSkills().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load skills");
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-4">
        <div className="text-sm font-medium text-muted-foreground">Cloudflare Skills Registry</div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">Skillpack</h1>
        <p className="max-w-2xl text-muted-foreground">
          A single Cloudflare Worker serving a Hono API and a Vite SPA with D1, Drizzle, R2, Tailwind, shadcn-style UI, and Zod schemas.
        </p>
        <div>
          <Button onClick={() => void loadSkills()}>Refresh catalog</Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>{status}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {skills.map((skill) => (
            <div key={skill.name} className="rounded-lg border border-border p-4">
              <div className="font-medium">{skill.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{skill.description}</div>
              <code className="mt-3 block text-xs text-muted-foreground">{skill.location}</code>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
