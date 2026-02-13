import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files.sort();
}

export async function computeIntegrity(dir: string): Promise<string> {
  const files = await collectFiles(dir);
  const hash = createHash('sha256');

  for (const file of files) {
    const rel = relative(dir, file);
    hash.update(rel);
    const content = await readFile(file);
    hash.update(content);
  }

  return `sha256-${hash.digest('base64')}`;
}
