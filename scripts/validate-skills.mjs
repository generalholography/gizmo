import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const skillsRoot = path.join(repoRoot, '.agents/skills');
const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseFrontmatter(content, filePath) {
  if (!content.startsWith('---\n')) {
    throw new Error(`${filePath} must start with YAML frontmatter`);
  }

  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${filePath} has unterminated YAML frontmatter`);
  }

  const raw = content.slice(4, end).trim();
  const data = {};

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      throw new Error(`${filePath} has unsupported frontmatter line: ${line}`);
    }
    const [, key, value] = match;
    data[key] = value.replace(/^["']|["']$/g, '').trim();
  }

  return data;
}

function extractMarkdownLinks(content) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
}

async function assertLinkExists(link, skillDir, filePath) {
  if (/^[a-z]+:\/\//i.test(link)) return;
  if (link.startsWith('#')) return;

  const cleanLink = link.split('#')[0];
  if (!cleanLink) return;

  const candidates = [
    path.resolve(skillDir, cleanLink),
    path.resolve(repoRoot, cleanLink),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(`${filePath} links to missing file: ${link}`);
}

async function validateSkill(skillName) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillPath = path.join(skillDir, 'SKILL.md');
  const relativeSkillPath = path.relative(repoRoot, skillPath);
  const content = await fs.readFile(skillPath, 'utf8');
  const frontmatter = parseFrontmatter(content, relativeSkillPath);

  if (!frontmatter.name) {
    throw new Error(`${relativeSkillPath} is missing frontmatter name`);
  }

  if (!frontmatter.description) {
    throw new Error(`${relativeSkillPath} is missing frontmatter description`);
  }

  if (frontmatter.name !== skillName) {
    throw new Error(`${relativeSkillPath} name must match directory (${skillName})`);
  }

  if (!namePattern.test(frontmatter.name)) {
    throw new Error(`${relativeSkillPath} name must match ${namePattern}`);
  }

  if (frontmatter.name.length > 64) {
    throw new Error(`${relativeSkillPath} name must be 64 characters or fewer`);
  }

  if (frontmatter.description.length > 1024) {
    throw new Error(`${relativeSkillPath} description must be 1024 characters or fewer`);
  }

  if (!frontmatter.license) {
    throw new Error(`${relativeSkillPath} should include license frontmatter`);
  }

  if (content.includes('| Name | Type | Required | Description |')) {
    throw new Error(`${relativeSkillPath} appears to duplicate generated command tables`);
  }

  if (content.includes('| Name | Description |')) {
    throw new Error(`${relativeSkillPath} appears to duplicate generated resource tables`);
  }

  const docReferenceMatches = content.match(/docs\/[A-Za-z0-9_./#-]*/g) ?? [];
  if (docReferenceMatches.length > 0 && !content.includes('Optional Repo Docs')) {
    throw new Error(
      `${relativeSkillPath} references repo docs outside an Optional Repo Docs section; skills must work without a source checkout`,
    );
  }

  for (const link of extractMarkdownLinks(content)) {
    await assertLinkExists(link, skillDir, relativeSkillPath);
  }

  return relativeSkillPath;
}

async function main() {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const skillNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (!skillNames.length) {
    throw new Error('.agents/skills must contain at least one skill');
  }

  const validated = [];
  for (const skillName of skillNames) {
    validated.push(await validateSkill(skillName));
  }

  console.log(`Skills validated: ${validated.join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
