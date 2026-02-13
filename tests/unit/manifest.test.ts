import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createManifest,
  writeManifest,
  readManifest,
} from '../../src/core/manifest.js';

describe('manifest', () => {
  it('creates empty manifest', () => {
    const m = createManifest();
    expect(m.version).toBe(1);
    expect(m.skills).toEqual({});
  });

  it('round-trips through write/read', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'manifest-test-'));
    const manifest = createManifest();
    manifest.skills['my-skill'] = 'owner/repo#my-skill@^1.0.0';

    await writeManifest(manifest, dir);
    const loaded = await readManifest(dir);

    expect(loaded.version).toBe(1);
    expect(loaded.skills['my-skill']).toBe('owner/repo#my-skill@^1.0.0');
  });

  it('writes pretty JSON with trailing newline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'manifest-test-'));
    await writeManifest(createManifest(), dir);
    const raw = await readFile(join(dir, 'skillpack.json'), 'utf-8');
    expect(raw).toContain('  "version"');
    expect(raw.endsWith('\n')).toBe(true);
  });
});
