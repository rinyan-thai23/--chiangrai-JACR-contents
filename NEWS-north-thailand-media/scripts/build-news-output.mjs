#!/usr/bin/env node
// articles/*.md から配信用セットを生成する。
//   - html/YYYY_MM_DD.html … GitHub Pages・SNS投稿用。カード型・トグル展開、高齢者/スマホ向けに出典を簡略化。
//   - blog/YYYY_MM_DD.md   … ブログ投稿用。article調査フォルダのmdをそのまま結合し、冒頭に目次を付けるだけの1ファイル。
//   - newsletter/YYYY_MM_DD.md … メール・FB・LINE配信用。号ごとに1ファイル（記事ごとに分けない）。各記事の紹介文＋html/へのアンカー付きURLを連結。
// NEWS-north-thailand-media フォルダの外を一切参照しない自己完結スクリプト。
//
// 使い方:
//   node scripts/build-news-output.mjs                       … articles/配下の全記事を1本にまとめて生成（号の日付=実行日）
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

const SITE_TITLE = "チェンライ・北タイローカル情報";
const SITE_SUBTITLE = "チェンライ・北タイの地域密着ニュース ｜ Powered by チェンライ日本人会";
const SITE_KICKER = "北タイ地域メディア";

// マストヘッド下に毎回表示する装飾SVG。山・川の線画が読み込み時に一筆書きで描かれ、
// 拠点（チェンライ・メーサイ・メーファールアン等をイメージした点）が現地確認中のように明滅・接続する。
// 純粋に雰囲気づくりのための演出で、実データとは連動しない（CSSアニメーションのみ、JS不要）。
const SITE_MASTHEAD_SVG = `<svg class="masthead-art" viewBox="0 0 600 150" role="img" aria-label="北タイの山・川と取材拠点をイメージした装飾アニメーション">
<path class="art-ridge" d="M0,112 L55,64 L95,92 L145,46 L195,88 L255,58 L315,96 L375,52 L435,90 L495,48 L555,82 L600,64" />
<path class="art-river" d="M0,128 C80,118 120,138 200,124 C280,110 320,132 400,120 C480,110 520,130 600,118" />
<g class="art-node" style="--d:0s"><circle class="art-ring" cx="95" cy="92" r="5" /><circle class="art-dot" cx="95" cy="92" r="3.5" /></g>
<g class="art-node" style="--d:.5s"><circle class="art-ring" cx="255" cy="58" r="5" /><circle class="art-dot" cx="255" cy="58" r="3.5" /></g>
<g class="art-node" style="--d:1s"><circle class="art-ring" cx="375" cy="52" r="5" /><circle class="art-dot" cx="375" cy="52" r="3.5" /></g>
<g class="art-node" style="--d:1.5s"><circle class="art-ring" cx="495" cy="48" r="5" /><circle class="art-dot" cx="495" cy="48" r="3.5" /></g>
<path class="art-link" d="M95,92 L255,58" />
<path class="art-link" d="M255,58 L375,52" />
<path class="art-link" d="M375,52 L495,48" />
</svg>`;

// カテゴリ（記事の最後のタグ）ごとの配色。ライトモード・高コントラストを優先する。
const CATEGORY_PALETTE = [
  { bg: "#fbe7e2", text: "#a8391e", border: "#c1432e" }, // 赤系（防災など）
  { bg: "#eee3fb", text: "#5f3494", border: "#7c4dbd" }, // 紫系（文化・観光など）
  { bg: "#dfebfa", text: "#1c5c96", border: "#2b6cae" }, // 青系（生活・渡航情報など）
  { bg: "#e0f2ea", text: "#1f6e4b", border: "#2c8f63" }, // 緑系（行政・生活情報など）
  { bg: "#fdf0da", text: "#93611a", border: "#c68a2e" }, // 黄系（経済・観光情報など）
  { bg: "#e7e9ef", text: "#414a5c", border: "#5c6680" }, // グレー系（その他）
];

// README記載の想定カテゴリ（防災・行政・生活・観光・文化・国境事情）にキーワードで色を割り当てる。
// 該当しない新しいカテゴリはグレー（その他）にフォールバックし、色の衝突を避ける。
const CATEGORY_KEYWORDS = [
  { keywords: ["防災", "災害"], index: 0 }, // 赤
  { keywords: ["観光", "文化"], index: 1 }, // 紫
  { keywords: ["生活", "渡航", "国境"], index: 2 }, // 青
  { keywords: ["行政"], index: 3 }, // 緑
  { keywords: ["経済"], index: 4 }, // 黄
];
const FALLBACK_INDEX = 5; // グレー

function paletteFor(category) {
  const match = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((k) => category.includes(k)));
  return CATEGORY_PALETTE[match ? match.index : FALLBACK_INDEX];
}

function formatJaDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

// 目次の見出しリンク用。GitHub等のMarkdown見出しアンカー生成に近い簡易スラグ化（完全一致は保証しない）。
function slugifyHeading(text) {
  return text
    .replace(/[「」『』（）()【】\[\]:：!！?？、。・"'’]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text, { linkToAnchor } = {}) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    // 記事間の相互リンク（./YYYY-MM-DD-slug.md）は、まとめページ内の該当カードへのアンカーに変える。
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

// 出典セクション専用のレンダラー。高齢者・スマホ閲覧を想定するHTML出力では、
// ①各出典の英語・タイ語見出し引用（「...」の部分）と、②末尾の注記（取材手法の免責文）を省く。
// articles/の元原稿・newsletterでは従来通り残すため、ここだけで完結させる。
function renderSourceBlocks(content, opts) {
  const blocks = content.trim().split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((l) => l.startsWith("- "));
      if (isList) {
        const items = lines
          .map((l) => l.slice(2).replace(/「[^」]*」/g, "").trim())
          .map((l) => `<li>${inline(l, opts)}</li>`)
          .join("\n");
        return `<ul>\n${items}\n</ul>`;
      }
      const isNote = lines[0]?.startsWith("**注記**");
      if (isNote) return "";
      return `<p>${inline(lines.join(" "), opts)}</p>`;
    })
    .filter(Boolean)
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
    .filter(Boolean)
    .map((t) => t.replace(/^#/, ""));

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

  // エリア表示は2つ目のタグ（例: #チェンライ #メーサイ #防災 → メーサイ）、
  // カテゴリ表示は最後のタグ（例: 防災／文化観光／渡航情報）を採用する簡易ルール。
  const area = tags.length > 1 ? tags[1] : tags[0] || "";
  const category = tags.length > 2 ? tags[tags.length - 1] : tags[0] || "";

  return { title, lead, tags, area, category, reportedDate, updatedDate, sections };
}

function renderCard(article, slug) {
  const palette = paletteFor(article.category);
  const allTags = article.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  const sections = article.sections
    .map((sec) => {
      const isSources = sec.heading === "出典";
      const cls = isSources ? ' class="sources"' : "";
      const body = isSources
        ? renderSourceBlocks(sec.content, { linkToAnchor: true })
        : renderBlocks(sec.content, { linkToAnchor: true });
      return `<section${cls}>\n<h3>${escapeHtml(sec.heading)}</h3>\n${body}\n</section>`;
    })
    .join("\n");

  return `<details id="${slug}" class="card" style="--card-border:${palette.border}">
<summary>
<div class="card-top">
<span class="category" style="background:${palette.bg};color:${palette.text}">${escapeHtml(article.category)}</span>
<span class="area-date">${escapeHtml(article.area)} ・ ${formatJaDate(article.reportedDate)}</span>
</div>
<h2>${escapeHtml(article.title)}</h2>
<p class="lead">${inline(article.lead, { linkToAnchor: true })}</p>
<span class="read-more-btn">
<span class="btn-label"><span class="label-closed">続きを読む</span><span class="label-open">閉じる</span></span>
<span class="btn-arrow" aria-hidden="true">↓</span>
</span>
</summary>
<div class="card-body">
<div class="tags">${allTags}</div>
${sections}
</div>
</details>`;
}

function renderDigestHtml(items, batchDate) {
  const cards = items.map(({ article, slug }) => renderCard(article, slug)).join("\n");
  const description = items.map(({ article }) => article.lead).join(" ");
  const issueDateJa = formatJaDate(batchDate);

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${SITE_TITLE}｜${issueDateJa}号</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="./style.css">
</head>
<body>
<header class="masthead">
<div class="kicker-row">
<p class="kicker">${escapeHtml(issueDateJa)}発行 ・ ${escapeHtml(SITE_KICKER)}</p>
<span class="badge">PROTOTYPE</span>
</div>
<h1>${escapeHtml(SITE_TITLE)}</h1>
<p class="subtitle">${escapeHtml(SITE_SUBTITLE)}</p>
${SITE_MASTHEAD_SVG}
</header>
<main>
<p class="section-label">今号の${items.length}本</p>
<div class="cards">
${cards}
</div>
</main>
<footer class="site-footer">
<p>${escapeHtml(SITE_TITLE)}は現在プロトタイプ運用中です。掲載記事はWeb検索経由の複数ソース照合に基づく二次情報のまとめであり、最新状況は各記事末尾の出典を直接ご確認ください。</p>
</footer>
</body>
</html>
`;
}

function renderIntroBlock(article, slug, batchSlug) {
  const url = `${PAGES_BASE}/${batchSlug}.html#${slug}`;
  const tagsLine = article.tags.map((t) => `#${t}`).join(" ");
  return `# ${article.title}

${article.lead}

${tagsLine}

続きを読む:
${url}

- 取材日: ${article.reportedDate}
- 最終更新: ${article.updatedDate}`;
}

// ニュースレター用: 号（配信回）ごとに1ファイル。articles/index.mdが全履歴を持っているのと同じ考え方で、
// 記事ごとにファイルを分けない（2026-09-10改訂）。中身は各記事の紹介文（タイトル・リード・タグ・号ページへのリンク）を連結。
function renderNewsletterMarkdown(items, batchSlug) {
  return items.map(({ article, slug }) => renderIntroBlock(article, slug, batchSlug)).join("\n\n---\n\n") + "\n";
}

// ブログ投稿用: article調査フォルダのmdをそのまま結合し、冒頭に目次だけ付けたシンプルな1ファイル。
// HTMLのカード・トグルは使わない。GitHub Pages（html/）とは別物、そちらは変更しない。
function renderBlogMarkdown(items, batchDate) {
  const issueSlashDate = batchDate.replace(/-/g, "/");
  const toc = items
    .map(({ article }) => `- [${article.title}](#${slugifyHeading(article.title)})`)
    .join("\n");
  const body = items.map(({ rawContent }) => rawContent.trim()).join("\n\n---\n\n");

  return `# チェンライ/北タイ 週間ローカルニュース ${issueSlashDate}

## 目次

${toc}

---

${body}
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

  const allFiles = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md") && f !== "index.md");
  const files = slugs.length > 0 ? slugs.map((s) => `${s}.md`) : allFiles;

  const items = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = readFileSync(join(ARTICLES_DIR, file), "utf8");
    return { slug, rawContent: raw, article: parseArticle(raw) };
  });

  const digestHtml = renderDigestHtml(items, batchDate);
  writeFileSync(join(HTML_DIR, `${batchSlug}.html`), digestHtml);

  const blogMd = renderBlogMarkdown(items, batchDate);
  writeFileSync(join(BLOG_DIR, `${batchSlug}.md`), blogMd);

  const newsletterMd = renderNewsletterMarkdown(items, batchSlug);
  writeFileSync(join(NEWSLETTER_DIR, `${batchSlug}.md`), newsletterMd);

  console.log(`generated: html/${batchSlug}.html (SNS/GitHub Pages用), blog/${batchSlug}.md (ブログ投稿用), newsletter/${batchSlug}.md (${items.length}件まとめ)`);
}

main();
