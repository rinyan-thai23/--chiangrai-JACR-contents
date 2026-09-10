#!/usr/bin/env node
// articles/*.md から配信用セット（まとめHTML・ニュースレター紹介文MD・ブログ用HTML）を生成する。
// NEWS-north-thailand-media フォルダの外を一切参照しない自己完結スクリプト。
//
// 使い方:
//   node scripts/build-news-output.mjs                       … articles/配下の全記事を1本にまとめて生成（配信日=実行日）
//   node scripts/build-news-output.mjs --date=2026-09-13      … 号の日付を指定
//   node scripts/build-news-output.mjs 2026-09-09-a 2026-09-09-b  … まとめる記事をスラッグで指定（今週配信分だけ選ぶ場合）

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

function inline(text, { linkToAnchor } = {}) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    // 記事間の相互リンク（./YYYY-MM-DD-slug.md）は、まとめページ内の該当トグルへのアンカーに変える。
    const localMdLink = /^\.\/(.+)\.md$/.exec(url);
    const href = localMdLink && linkToAnchor ? `#${localMdLink[1]}` : url;
    return `<a href="${href}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

function renderBlocks(content, opts) {
  const blocks = content.trim().split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((l) => l.startsWith("- "));
      if (isList) {
        const items = lines.map((l) => `<li>${inline(l.slice(2), opts)}</li>`).join("\n");
        return `<ul>\n${items}\n</ul>`;
      }
      const isNote = lines[0]?.startsWith("**注記**");
      const paragraph = inline(lines.join(" "), opts);
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

function renderArticleToggle(article, slug, { open = false } = {}) {
  const tagPills = article.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const sections = article.sections
    .map((sec) => {
      const isSources = sec.heading === "出典";
      const cls = isSources ? ' class="sources"' : "";
      return `<section${cls}>\n<h3>${escapeHtml(sec.heading)}</h3>\n${renderBlocks(sec.content, { linkToAnchor: true })}\n</section>`;
    })
    .join("\n");

  return `<details id="${slug}" class="article-toggle"${open ? " open" : ""}>
<summary>
<span class="chevron" aria-hidden="true">▶</span>
<span class="summary-body">
<div class="tags">${tagPills}</div>
<h2>${escapeHtml(article.title)}</h2>
<p class="lead">${inline(article.lead, { linkToAnchor: true })}</p>
<p class="meta">取材日: ${escapeHtml(article.reportedDate)} ／ 最終更新: ${escapeHtml(article.updatedDate)}</p>
</span>
</summary>
<div class="article-body">
${sections}
</div>
</details>`;
}

function renderDigestHtml(items, batchLabel) {
  const toc = items
    .map(({ article, slug }) => `<li><a href="#${slug}">${escapeHtml(article.title)}</a></li>`)
    .join("\n");
  const toggles = items.map(({ article, slug }) => renderArticleToggle(article, slug)).join("\n");
  const description = items.map(({ article }) => article.lead).join(" ");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>北タイ・チェンライ地域ニュース ${escapeHtml(batchLabel)}号</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="./style.css">
</head>
<body>
<header class="site-header">
<p class="site-name">北タイ・チェンライ地域ニュース</p>
<p class="issue">${escapeHtml(batchLabel)}号</p>
</header>
<main>
<nav class="toc" aria-label="この号の記事一覧">
<h2>この号の記事（${items.length}本）</h2>
<ul>
${toc}
</ul>
</nav>
<div class="digest">
${toggles}
</div>
</main>
<footer class="site-footer">
<p>本記事は地域密着ニュースの取材・整理を行うプロトタイプ配信です。数値・固有名詞は各記事末尾の出典に基づきます。タイトルをクリックすると本文が開きます。</p>
</footer>
</body>
</html>
`;
}

function renderIntroMd(article, slug, batchSlug) {
  const url = `${PAGES_BASE}/${batchSlug}.html#${slug}`;
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

function parseArgs(argv) {
  let date = null;
  const slugs = [];
  for (const arg of argv) {
    if (arg.startsWith("--date=")) {
      date = arg.slice("--date=".length);
    } else {
      slugs.push(arg);
    }
  }
  return { date, slugs };
}

function main() {
  for (const dir of [HTML_DIR, NEWSLETTER_DIR, BLOG_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const { date, slugs } = parseArgs(process.argv.slice(2));
  const batchDate = date || new Date().toISOString().slice(0, 10);
  const batchSlug = batchDate.replace(/-/g, "_");
  const batchLabel = batchDate.replace(/-/g, "/");

  const allFiles = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md") && f !== "index.md");
  const files = slugs.length > 0 ? slugs.map((s) => `${s}.md`) : allFiles;

  const items = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = readFileSync(join(ARTICLES_DIR, file), "utf8");
    return { slug, article: parseArticle(raw) };
  });

  const digestHtml = renderDigestHtml(items, batchLabel);
  writeFileSync(join(HTML_DIR, `${batchSlug}.html`), digestHtml);
  // ブログに投稿するものもまったく同じまとめHTML。ファイルを分けているのは配信先ごとに個別調整できるようにするため。
  writeFileSync(join(BLOG_DIR, `${batchSlug}.html`), digestHtml);

  for (const { slug, article } of items) {
    const introMd = renderIntroMd(article, slug, batchSlug);
    writeFileSync(join(NEWSLETTER_DIR, `${slug}.md`), introMd);
  }

  console.log(`generated: html/${batchSlug}.html, blog/${batchSlug}.html (${items.length}件まとめ)`);
  for (const { slug } of items) console.log(`generated: newsletter/${slug}.md`);
}

main();
