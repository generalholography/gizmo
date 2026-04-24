import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const LEGACY_KEYS = [
  'OnInteract',
  'OnPrimaryAction',
  'OnSecondaryAction',
  'OnCollisionEnter',
  'OnEntityInRange',
  'OnTimeElapsed',
  'OnDie',
];

const ROOT = path.resolve(process.cwd(), 'src');

function walk(dir: string, out: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js'))) {
      out.push(full);
    }
  }
}

describe('legacy runtime path audit', () => {
  it('contains no imports/usages of On* gameplay components in executable runtime files', () => {
    const files: string[] = [];
    walk(ROOT, files);

    const allowed = [
      `${path.sep}__tests__${path.sep}`,
      `${path.sep}worlds${path.sep}`,
      `${path.sep}core${path.sep}components${path.sep}On`,
    ];

    const offenders: string[] = [];
    for (const file of files) {
      if (allowed.some((token) => file.includes(token))) continue;
      const source = fs.readFileSync(file, 'utf8');

      for (const key of LEGACY_KEYS) {
        const importPattern = new RegExp(`from\\s+['"].*${key}['"]`);
        const symbolPattern = new RegExp(`\\b${key}\\.`);
        const componentPattern = new RegExp(`Components\\.${key}\\b`);
        if (importPattern.test(source) || symbolPattern.test(source) || componentPattern.test(source)) {
          offenders.push(`${path.relative(ROOT, file)} -> ${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
