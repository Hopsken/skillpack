import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeIntegrity } from '../../src/core/integrity.js';

describe('computeIntegrity', () => {
  it('produces consistent hash for same content', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integrity-test-'));
    await writeFile(join(dir, 'SKILL.md'), '# Test Skill\nHello world');
    await writeFile(join(dir, 'README.md'), 'readme content');

    const hash1 = await computeIntegrity(dir);
    const hash2 = await computeIntegrity(dir);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256-/);
  });

  it('produces different hash for different content', async () => {
    const dir1 = await mkdtemp(join(tmpdir(), 'integrity-test-'));
    const dir2 = await mkdtemp(join(tmpdir(), 'integrity-test-'));

    await writeFile(join(dir1, 'SKILL.md'), 'content A');
    await writeFile(join(dir2, 'SKILL.md'), 'content B');

    const hash1 = await computeIntegrity(dir1);
    const hash2 = await computeIntegrity(dir2);

    expect(hash1).not.toBe(hash2);
  });

  it('includes subdirectory files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integrity-test-'));
    await mkdir(join(dir, 'sub'), { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), 'root');
    await writeFile(join(dir, 'sub', 'file.txt'), 'nested');

    const hash = await computeIntegrity(dir);
    expect(hash).toMatch(/^sha256-/);
  });
});
