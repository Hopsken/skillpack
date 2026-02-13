import { mkdir, cp, rm, access } from 'node:fs/promises';
import { join } from 'node:path';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  await cp(src, dest, { recursive: true });
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function getSkillsDir(global: boolean = false): string {
  if (global) {
    return join(process.env.HOME || '~', '.agents', 'skills');
  }
  return join(process.cwd(), '.agents', 'skills');
}
