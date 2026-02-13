import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LockFile } from '../types.js';
import { exists } from '../util/fs.js';

const LOCK_FILE = 'skillpack-lock.json';

export function lockfilePath(cwd: string = process.cwd()): string {
  return join(cwd, LOCK_FILE);
}

export async function readLockfile(cwd?: string): Promise<LockFile> {
  const path = lockfilePath(cwd);
  if (!(await exists(path))) {
    return createLockfile();
  }
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as LockFile;
}

export async function writeLockfile(lock: LockFile, cwd?: string): Promise<void> {
  const path = lockfilePath(cwd);
  lock.locked_at = new Date().toISOString();
  await writeFile(path, JSON.stringify(lock, null, 2) + '\n');
}

export function createLockfile(): LockFile {
  return {
    version: 1,
    locked_at: new Date().toISOString(),
    skills: {},
  };
}
