import { describe, it, expect } from 'vitest';
import {
  parseSpecifier,
  expandBatchSpecifier,
  deriveSkillName,
  serializeSpecifier,
} from '../../src/core/specifier.js';

describe('parseSpecifier', () => {
  it('parses owner/repo', () => {
    const spec = parseSpecifier('vercel-labs/agent-skills');
    expect(spec).toEqual({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: undefined,
      versionRange: undefined,
    });
  });

  it('parses owner/repo@version', () => {
    const spec = parseSpecifier('vercel-labs/agent-skills@^1.0.0');
    expect(spec).toEqual({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: undefined,
      versionRange: '^1.0.0',
    });
  });

  it('parses owner/repo@sha', () => {
    const spec = parseSpecifier('vercel-labs/agent-skills@abc1234');
    expect(spec).toEqual({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: undefined,
      versionRange: 'abc1234',
    });
  });

  it('parses owner/repo#skill', () => {
    const spec = parseSpecifier('vercel-labs/agent-skills#react-best-practices');
    expect(spec).toEqual({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: 'react-best-practices',
      versionRange: undefined,
    });
  });

  it('parses owner/repo#skill@version', () => {
    const spec = parseSpecifier('vercel-labs/agent-skills#react-best-practices@^1.0.0');
    expect(spec).toEqual({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: 'react-best-practices',
      versionRange: '^1.0.0',
    });
  });

  it('parses file: local path', () => {
    const spec = parseSpecifier('file:./skills/my-custom');
    expect(spec).toEqual({
      type: 'local',
      localPath: './skills/my-custom',
    });
  });

  it('throws on missing owner/repo', () => {
    expect(() => parseSpecifier('just-a-name')).toThrow('missing owner/repo');
  });
});

describe('expandBatchSpecifier', () => {
  it('returns single specifier as-is', () => {
    expect(expandBatchSpecifier('owner/repo#skill')).toEqual(['owner/repo#skill']);
  });

  it('expands multiple skills', () => {
    const result = expandBatchSpecifier('owner/repo#skill-a#skill-b@^1.0.0');
    expect(result).toEqual([
      'owner/repo#skill-a@^1.0.0',
      'owner/repo#skill-b@^1.0.0',
    ]);
  });

  it('expands without version', () => {
    const result = expandBatchSpecifier('owner/repo#a#b#c');
    expect(result).toEqual([
      'owner/repo#a',
      'owner/repo#b',
      'owner/repo#c',
    ]);
  });

  it('passes through file: specifiers', () => {
    expect(expandBatchSpecifier('file:./local')).toEqual(['file:./local']);
  });

  it('passes through no-hash specifiers', () => {
    expect(expandBatchSpecifier('owner/repo@^1.0.0')).toEqual(['owner/repo@^1.0.0']);
  });
});

describe('deriveSkillName', () => {
  it('uses skillName when present', () => {
    expect(deriveSkillName({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: 'react-best-practices',
    })).toBe('react-best-practices');
  });

  it('falls back to repo name', () => {
    expect(deriveSkillName({
      type: 'github',
      owner: 'someone',
      repo: 'cool-skill',
    })).toBe('cool-skill');
  });

  it('uses last segment for local paths', () => {
    expect(deriveSkillName({
      type: 'local',
      localPath: './skills/my-custom',
    })).toBe('my-custom');
  });
});

describe('serializeSpecifier', () => {
  it('serializes github specifier', () => {
    expect(serializeSpecifier({
      type: 'github',
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skillName: 'react-best-practices',
      versionRange: '^1.0.0',
    })).toBe('vercel-labs/agent-skills#react-best-practices@^1.0.0');
  });

  it('serializes minimal github specifier', () => {
    expect(serializeSpecifier({
      type: 'github',
      owner: 'owner',
      repo: 'repo',
    })).toBe('owner/repo');
  });

  it('serializes local specifier', () => {
    expect(serializeSpecifier({
      type: 'local',
      localPath: './skills/custom',
    })).toBe('file:./skills/custom');
  });
});
