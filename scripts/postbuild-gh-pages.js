/**
 * Copy build/index.html to build/404.html so GitHub Pages serves the SPA
 * for any path (e.g. /about, /tools/speed-reader). Run after `npm run build`
 * when deploying to GitHub Pages.
 *
 * Usage: node scripts/postbuild-gh-pages.js
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const indexHtml = path.join(buildDir, 'index.html');
const notfoundHtml = path.join(buildDir, '404.html');

if (!fs.existsSync(indexHtml)) {
  console.warn('postbuild-gh-pages: build/index.html not found. Run npm run build first.');
  process.exit(1);
}

fs.copyFileSync(indexHtml, notfoundHtml);
console.log('Copied index.html to 404.html for GitHub Pages SPA routing.');

const nojekyll = path.join(buildDir, '.nojekyll');
fs.writeFileSync(nojekyll, '', 'utf8');
console.log('Created build/.nojekyll so GitHub Pages serves static files (including .md).');
