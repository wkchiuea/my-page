/**
 * Build-time script: scans src/assets/articles for .md files,
 * parses frontmatter and excerpt, writes public/articles.json (sorted by date desc),
 * and copies each .md to public/articles/{id}.md for runtime fetch by id.
 *
 * Run: node scripts/generate-articles.js
 * Add to package.json: "generate-articles": "node scripts/generate-articles.js"
 */

const fs = require('fs');
const path = require('path');

const ARTICLES_SRC = path.join(__dirname, '../src/assets/articles');
const PUBLIC_ARTICLES = path.join(__dirname, '../public/articles');
const ARTICLES_JSON = path.join(__dirname, '../public/articles.json');
const EXCERPT_WORDS = 50;

function getAllMdFiles(dir, base = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const rel = path.join(base, ent.name);
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...getAllMdFiles(full, rel));
    } else if (ent.name.endsWith('.md')) {
      results.push({ full, rel });
    }
  }
  return results;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw.trim() };
  const [, yamlBlock, content] = match;
  const frontmatter = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    frontmatter[key] = value;
  }
  return { frontmatter, content: content.trim() };
}

/** Remove markdown and special formatting for plain-text excerpt */
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/`{3}[\s\S]*?`{3}/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstWords(text, n = EXCERPT_WORDS) {
  const plain = stripMarkdown(text);
  const words = plain.split(' ').filter(Boolean);
  if (words.length <= n) return plain;
  return words.slice(0, n).join(' ') + '...';
}

function main() {
  if (!fs.existsSync(ARTICLES_SRC)) {
    console.warn('Articles source dir not found:', ARTICLES_SRC);
    fs.writeFileSync(ARTICLES_JSON, JSON.stringify({ articles: [] }, null, 2));
    return;
  }

  const files = getAllMdFiles(ARTICLES_SRC);
  const articles = [];
  const validIds = new Set();

  if (!fs.existsSync(PUBLIC_ARTICLES)) {
    fs.mkdirSync(PUBLIC_ARTICLES, { recursive: true });
  }

  for (const { full, rel } of files) {
    const raw = fs.readFileSync(full, 'utf8');
    const { frontmatter, content } = parseFrontmatter(raw);
    const id = path.basename(rel, '.md');
    const excerpt = firstWords(content, EXCERPT_WORDS);
    validIds.add(id);

    articles.push({
      id,
      title: frontmatter.title || id,
      date: frontmatter.date || '',
      category: frontmatter.category || '',
      tag: frontmatter.tag || '',
      image: frontmatter.image || '',
      excerpt,
    });

    const destPath = path.join(PUBLIC_ARTICLES, `${id}.md`);
    fs.writeFileSync(destPath, raw, 'utf8');
  }

  // Prune orphaned .md files: remove any copy in public/articles whose
  // source .md no longer exists, keeping the dir in sync with articles.json.
  let removed = 0;
  for (const name of fs.readdirSync(PUBLIC_ARTICLES)) {
    if (!name.endsWith('.md')) continue;
    const id = path.basename(name, '.md');
    if (!validIds.has(id)) {
      fs.rmSync(path.join(PUBLIC_ARTICLES, name));
      removed++;
    }
  }

  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  fs.writeFileSync(ARTICLES_JSON, JSON.stringify({ articles }, null, 2), 'utf8');
  console.log(`Generated ${ARTICLES_JSON} with ${articles.length} articles and copied .md files to ${PUBLIC_ARTICLES}` + (removed ? ` (pruned ${removed} orphaned .md file${removed === 1 ? '' : 's'})` : ''));
}

main();
