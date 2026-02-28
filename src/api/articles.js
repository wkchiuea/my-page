/**
 * Fetches the articles manifest (metadata + excerpt) and single article content by id.
 * Manifest is generated at build time by scripts/generate-articles.js.
 */

const ARTICLES_BASE = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/articles` : '/articles';

/**
 * Fetch all articles (metadata + excerpt), sorted by date desc.
 * @returns {Promise<{ id, title, date, category, tag, image, excerpt }[]>}
 */
export async function fetchArticles() {
  const res = await fetch(`${ARTICLES_BASE}.json`);
  if (!res.ok) throw new Error('Failed to load articles');
  const { articles } = await res.json();
  return articles || [];
}

/**
 * Fetch a single article's raw markdown by id (e.g. "20260228").
 * @param {string} id - Article id (filename without .md)
 * @returns {Promise<string>} Raw markdown content
 */
export async function fetchArticleContent(id) {
  const res = await fetch(`${ARTICLES_BASE}/${id}.md`);
  if (!res.ok) return null;
  return res.text();
}

/**
 * Parse frontmatter and body from raw markdown.
 * @param {string} raw
 * @returns {{ frontmatter: Record<string,string>, content: string }}
 */
export function parseArticleMd(raw) {
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
