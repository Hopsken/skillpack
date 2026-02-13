import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { x as extractTar } from 'tar';
import { ghFetch } from './http.js';

export interface ExtractResult {
  tempDir: string;
  contentDir: string;
}

export async function downloadAndExtract(tarballUrl: string): Promise<ExtractResult> {
  const tempDir = await mkdtemp(join(tmpdir(), 'skillpack-'));
  const tarPath = join(tempDir, 'archive.tar.gz');
  const extractDir = join(tempDir, 'extracted');
  await mkdir(extractDir, { recursive: true });

  // Download tarball
  const res = await ghFetch(tarballUrl, {
    'Accept': 'application/vnd.github.v3.tarball',
  });
  if (!res.body) throw new Error('Empty response body from tarball URL');

  const fileStream = createWriteStream(tarPath);
  await pipeline(Readable.fromWeb(res.body as any), fileStream);

  // Extract
  await extractTar({ file: tarPath, cwd: extractDir });

  // GitHub tarballs have a single top-level dir like `owner-repo-sha/`
  const entries = await readdir(extractDir);
  const contentDir = entries.length === 1
    ? join(extractDir, entries[0])
    : extractDir;

  return { tempDir, contentDir };
}
