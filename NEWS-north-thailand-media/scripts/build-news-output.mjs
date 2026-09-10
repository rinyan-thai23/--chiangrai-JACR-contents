#!/usr/bin/env node
// articles/*.md から配信用の3点セット（HTML・ニュースレター紹介文MD・ブログ用MD）を生成する。
// NEWS-north-thailand-media フォルダの外を一切参照しない自己完結スクリプト。

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEPT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ARTICLES_DIR = join(DEPT_DIR, "articles");
const HTML_DIR = join(DEPT_DIR, "html");
const NEWSLETTER_DIR = join(DEPT_DIR, "newsletter");
const BLOG_DIR = join(DEPT_DIR, "blog");

// GitHub Pages上の公開URLのベース。リポジトリ・配置場所が変わった場合はここだけ直す。
const PAGES_BASE = "https://rinyan-thai23.github.io/--chiangrai-JACR-contents/NEWS-north-thailand-media/html";

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const href = /^\.\/.*\.md$/.test(url) ? url.replace(/\.md$/, ".html") : url;
    return `<a href="${href}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

function renderBlocks(content) {
  const blocks = content.trim().split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((l) => l.startsWith("- "));
      if (isList) {
        const items = lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("\n");
        return `<ul>\n${items}\n</ul>`;
      }
      const isNote = lines[0]?.startsWith("**注記**");
      const paragraph = inline(lines.join(" "));
      return isNote ? `<p class="note">${paragraph}</p>` : `<p>${paragraph}</p>`;
    })
    .join("\n");
}

function parseArticle(raw) {
  const lines = raw.split("\n");
  const title = lines[0].replace(/^#\s*/, "").trim();

  const leadLine = lines.find((l) => l.startsWith("**リード**:"));
  const lead = leadLine.replace(/^\*\*リード\*\*:\s*/, "").trim();

  const tagsLine = lines.find((l) => /^`#/.test(l.trim()));
  const tags = tagsLine
    .trim()
    .replace(/^`|`$/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const reportedLine = lines.find((l) => l.startsWith("- 取材日:"));
  const updatedLine = lines.find((l) => l.startsWith("- 最終更新:"));
  const reportedDate = reportedLine.replace(/^-\s*取材日:\s*/, "").trim();
  const updatedDate = updatedLine.replace(/^-\s*最終更新:\s*/, "").trim();

  const bodyStart = raw.indexOf("\n## ");
  const body = raw.slice(bodyStart + 1);
  const rawSections = body.split(/^## /m).filter(Boolean);
  const sections = rawSections.map((s) => {
    const [heading, ...rest] = s.split("\n");
    return { heading: heading.trim(), content: rest.join("\n") };
  });

  return { title, lead, tags, reportedDate, updatedDate, sections };
}

function renderHtml(article, slug) {
  const tagPills = article.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const sections = article.sections
    .map((sec) => {
      const isSources = sec.heading === "出典";
      const cls = isSources ? ' class="sources"' : "";
      return `<section${cls}>\n<h2>${escapeHtml(sec.heading)}</h2>\n${renderBlocks(sec.content)}\n</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(article.title)}｜北タイ・チェンライ地域ニュース</title>
<meta name="description" content="${escapeHtml(article.lead)}">
<link rel="stylesheet" href="./style.css">
</head>
<body>
<header class="site-header">
<p class="site-name">北タイ・チェンライ地域ニュース</p>
</header>
<main>
<article>
<header class="article-header">
<div class="tags">${tagPills}</div>
<h1>${escapeHtml(article.title)}</h1>
<p class="lead">${inline(article.lead)}</p>
<p class="meta">取材日: ${escapeHtml(article.reportedDate)} ／ 最終更新: ${escapeHtml(article.updatedDate)}</p>
</header>
${sections}
</article>
</main>
<footer class="site-footer">
<p>本記事は地域密着ニュースの取材・整理を行うプロトタイプ配信です。数値・固有名詞は本文末の出典に基づきます。</p>
</footer>
</body>
</html>
`;
}

function renderIntroMd(article, slug) {
  const url = `${PAGES_BASE}/${slug}.html`;
  const tagsLine = article.tags.join(" ");
  return `# ${article.title}

${article.lead}

${tagsLine}

続きを読む:
${url}

---
- 取材日: ${article.reportedDate}
- 最終更新: ${article.updatedDate}
`;
}

function main() {
  for (const dir of [HTML_DIR, NEWSLETTER_DIR, BLOG_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md") && f !== "index.md");

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = readFileSync(join(ARTICLES_DIR, file), "utf8");
    const article = parseArticle(raw);

    writeFileSync(join(HTML_DIR, `${slug}.html`), renderHtml(article, slug));

    const introMd = renderIntroMd(article, slug);
    writeFileSync(join(NEWSLETTER_DIR, `${slug}.md`), introMd);
    writeFileSync(join(BLOG_DIR, `${slug}.md`), introMd);

    console.log(`generated: ${slug}`);
  }
}

main();
