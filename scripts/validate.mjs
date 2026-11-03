// Repository checks for the brainbase plugin. Run: node scripts/validate.mjs
// Exit 1 on any error; warnings are printed but do not fail the run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const error = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(ROOT, p));

// --- manifests -----------------------------------------------------------
for (const f of [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
  "README.md",
  "LICENSE",
  "docs/skill-authoring.md",
]) {
  if (!exists(f)) error(`missing required file: ${f}`);
}

const claudePlugin = readJson(".claude-plugin/plugin.json");
const codexPlugin = readJson(".codex-plugin/plugin.json");
const marketplace = readJson(".claude-plugin/marketplace.json");

if (claudePlugin.name !== "brainbase") error("plugin.json name must be 'brainbase'");
if (codexPlugin.name !== claudePlugin.name) error("codex plugin name differs from plugin.json");
if (codexPlugin.version !== claudePlugin.version) error("codex plugin version differs from plugin.json");
if (!/^\d+\.\d+\.\d+$/.test(claudePlugin.version)) error("plugin version must be semver");
const entry = (marketplace.plugins || []).find((p) => p.name === "brainbase");
if (!entry) error("marketplace.json has no 'brainbase' entry");
else if (entry.source !== "./" && entry.source !== ".") error("marketplace 'brainbase' entry source must be './'");

// --- skills --------------------------------------------------------------
const skillsDir = path.join(ROOT, "skills");
const skillNames = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
if (skillNames.length === 0) error("no skills found under skills/");

const ALLOWED_FRONTMATTER = new Set([
  "name",
  "description",
  "allowed-tools",
  "argument-hint",
  "disable-model-invocation",
  "user-invocable",
  "model",
  "context",
  "agent",
  "hooks",
  "paths",
  "when_to_use",
  "version",
  "license",
  "metadata",
]);

const SECRET_PATTERNS = [
  [/bbpat_[A-Za-z0-9]{12,}/, "personal access token"],
  [/bb_live_[A-Za-z0-9]{12,}/, "agent task key"],
  [/xox[abp]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/sk-ant-[A-Za-z0-9-]{10,}/, "Anthropic key"],
  [/sk-[A-Za-z0-9]{32,}/, "OpenAI-style key"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/ghp_[A-Za-z0-9]{20,}/, "GitHub token"],
];

function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    error(`${file}: missing YAML frontmatter`);
    return {};
  }
  const fm = {};
  let currentKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const kv = raw.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      fm[currentKey] = kv[2].replace(/^>-?\s*$/, "").trim();
    } else if (currentKey && /^\s+\S/.test(raw)) {
      fm[currentKey] = (fm[currentKey] + " " + raw.trim()).trim();
    }
  }
  return fm;
}

function walk(dir) {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const readme = exists("README.md") ? read("README.md") : "";

for (const name of skillNames) {
  const rel = `skills/${name}`;
  const skillFile = `${rel}/SKILL.md`;
  if (!exists(skillFile)) {
    error(`${rel}: missing SKILL.md`);
    continue;
  }
  const text = read(skillFile);
  const fm = parseFrontmatter(text, skillFile);
  if (fm.name !== name) error(`${skillFile}: frontmatter name '${fm.name}' must equal directory name '${name}'`);
  if (!name.startsWith("brainbase-")) error(`${rel}: skill names are 'brainbase-<topic>'`);
  if (!fm.description) error(`${skillFile}: description is required`);
  else {
    const d = fm.description.replace(/^["']|["']$/g, "");
    if (d.length > 1024) error(`${skillFile}: description is ${d.length} chars; keep it under 1024`);
    if (d.length < 80) warn(`${skillFile}: description is short (${d.length} chars); say when to use the skill`);
  }
  for (const key of Object.keys(fm)) {
    if (!ALLOWED_FRONTMATTER.has(key)) warn(`${skillFile}: unexpected frontmatter key '${key}'`);
  }
  const lines = text.split(/\r?\n/).length;
  if (lines > 500) warn(`${skillFile}: ${lines} lines; move detail into references/`);

  // reference files mentioned in SKILL.md must exist, and vice versa
  const mentioned = new Set([...text.matchAll(/references\/([A-Za-z0-9._-]+\.md)/g)].map((m) => m[1]));
  for (const f of mentioned) {
    if (!exists(`${rel}/references/${f}`)) error(`${skillFile}: references/${f} does not exist`);
  }
  const refDir = path.join(ROOT, rel, "references");
  if (fs.existsSync(refDir)) {
    for (const f of fs.readdirSync(refDir).filter((f) => f.endsWith(".md"))) {
      if (!mentioned.has(f)) warn(`${rel}/references/${f} is not mentioned in SKILL.md`);
      const head = read(`${rel}/references/${f}`).split(/\r?\n/).slice(0, 12).join("\n");
      if (!/Source:/.test(head)) warn(`${rel}/references/${f}: add 'Source:' lines near the top`);
      if (!/Snapshot:/.test(head)) warn(`${rel}/references/${f}: add a 'Snapshot:' line near the top`);
    }
  }

  // secrets scan across the skill
  for (const file of walk(path.join(ROOT, rel))) {
    const body = fs.readFileSync(file, "utf8");
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(body)) error(`${path.relative(ROOT, file)}: looks like a real ${label}; use a placeholder`);
    }
  }

  if (readme && !readme.includes(`\`${name}\``)) warn(`README.md does not list ${name}`);
}

// --- report --------------------------------------------------------------
for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error: ${e}`);
console.log(`\n${skillNames.length} skills, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
