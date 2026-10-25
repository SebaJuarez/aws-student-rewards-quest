import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const FONTS_CSS = path.join(ROOT, 'src/styles/fonts.css');
const README = path.join(ROOT, 'README.md');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function exists(p) {
  return fs.existsSync(p);
}

function extractLinks(html) {
  const links = [];
  const linkRegex = /<link[^>]+href\s*=\s*["']\.\/([^"']+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  const scriptRegex = /<script[^>]+src\s*=\s*["']\.\/([^"']+)["']/gi;
  while ((match = scriptRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function extractFontUrls(css) {
  const urls = [];
  const urlRegex = /url\(['"]?\.\.\/([^'")]+)['"]?\)/gi;
  let match;
  while ((match = urlRegex.exec(css)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function extractReadmeImages(md) {
  const images = [];
  const imgRegex = /!\[[^\]]*\]\((docs\/[^)]+)\)/gi;
  let match;
  while ((match = imgRegex.exec(md)) !== null) {
    images.push(match[1]);
  }
  return images;
}

test('index.html links point to existing files', () => {
  const html = readFile(INDEX);
  const links = extractLinks(html);
  assert.ok(links.length > 0, 'should find at least one link in index.html');
  for (const link of links) {
    const fullPath = path.join(ROOT, link);
    assert.ok(exists(fullPath), `referenced file does not exist: ${link}`);
  }
});

test('src/styles/fonts.css url() references exist', () => {
  const css = readFile(FONTS_CSS);
  const urls = extractFontUrls(css);
  assert.ok(urls.length > 0, 'should find at least one font url in fonts.css');
  for (const url of urls) {
    const fullPath = path.join(ROOT, 'src', url);
    assert.ok(exists(fullPath), `referenced font file does not exist: ${url}`);
  }
});

test('README.md images in docs/ exist', () => {
  const md = readFile(README);
  const images = extractReadmeImages(md);
  assert.ok(images.length > 0, 'should find at least one docs/ image in README.md');
  for (const img of images) {
    const fullPath = path.join(ROOT, img);
    assert.ok(exists(fullPath), `referenced image does not exist: ${img}`);
  }
});