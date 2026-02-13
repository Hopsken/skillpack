import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Manifest } from '../types.js';

const MANIFEST_FILE = 'skillpack.json';

export function manifestPath(cwd: string = process.cwd()): string {
  return join(cwd, MANIFEST_FILE);
}

export async function readManifest(cwd?: string): Promise<Manifest> {
  const path = manifestPath(cwd);
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export async function writeManifest(manifest: Manifest, cwd?: string): Promise<void> {
  const path = manifestPath(cwd);
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
}

export function createManifest(): Manifest {
  return { version: 1, skills: {} };
}
