const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const tsvDir = path.join(baseDir, 'TSV');
const webDir = path.join(baseDir, 'WEB');
const imgDir = path.join(baseDir, 'img');
const ideaFile = path.join(baseDir, '50idea.txt');

// 50idea.txt を読み込む
const ideas = {};
if (fs.existsSync(ideaFile)) {
  const ideaContent = fs.readFileSync(ideaFile, 'utf-8');
  const lines = ideaContent.split('\n');
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const idNum = parseInt(parts[0].trim(), 10);
      if (!isNaN(idNum)) {
        const idStr = String(idNum).padStart(3, '0');
        ideas[idStr] = {
          title: parts[1].trim(),
          description: parts[2].trim(),
        };
      }
    }
  }
}

// 002〜050 を処理
const targetIds = [];
for (let i = 2; i <= 50; i++) {
  targetIds.push(String(i).padStart(3, '0'));
}

const tsvFiles = fs.readdirSync(tsvDir).filter(f => f.endsWith('.tsv'));

targetIds.forEach(idStr => {
  const tsvFile = tsvFiles.find(f => f.startsWith(idStr + '-'));
  if (!tsvFile) {
    console.log(`TSV not found for ID: ${idStr}`);
    return;
  }

  const rawTitle = tsvFile.replace(idStr + '-', '').replace('.tsv', '');
  const idea = ideas[idStr] || { title: rawTitle, description: rawTitle };

  const tsvPath = path.join(tsvDir, tsvFile);
  const tsvContent = fs.readFileSync(tsvPath, 'utf-8').trim();
  const rows = tsvContent.split('\n').map(r => r.replace('\r', '').split('\t'));

  if (rows.length < 2) return;

  const headers = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1).filter(r => r.length === headers.length || r.join('').trim() !== '');

  // 画像の存在確認
  const imgA = fs.existsSync(path.join(imgDir, `${idStr}-a.jpg`));
  const imgB = fs.existsSync(path.join(imgDir, `${idStr}-b.jpg`));

  const targetFolder = path.join(webDir, idStr);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // HTML生成
  const html = generateHTML(idStr, rawTitle, idea.description, headers, dataRows, imgA, imgB);
  fs.writeFileSync(path.join(targetFolder, 'index.html'), html, 'utf-8');

  // style.css コピーまたは作成
  const css = generateCSS();
  fs.writeFileSync(path.join(targetFolder, 'style.css'), css, 'utf-8');

  // script.js 作成
  const js = generateJS();
  fs.writeFileSync(path.join(targetFolder, 'script.js'), js, 'utf-8');

  console.log(`Generated WEB/${idStr}/index.html`);
});

function generateHTML(idStr, title, description, headers, dataRows, hasImgA, hasImgB) {
  // 画像セクション
  let galleryHtml = '';
  if (hasImgA || hasImgB) {
    galleryHtml = `
    <!-- イラスト画像ギャラリーセクション -->
    <section class="section infographic-section">
      <div class="section-header">
        <span class="section-subtitle">VISUAL GUIDE</span>
        <h2 class="section-title">インフォグラフィック・イラストガイド</h2>
        <p class="section-desc">クリックすると拡大して詳細を確認・印刷できます。</p>
      </div>

      <div class="gallery-grid">
        ${hasImgA ? `
        <!-- 画像A: A4縦型 -->
        <div class="image-card" onclick="openLightbox('../../img/${idStr}-a.jpg', '【A4縦型】${escapeHtml(title)}')">
          <div class="image-wrapper">
            <img src="../../img/${idStr}-a.jpg" alt="${escapeHtml(title)} A4縦型" loading="lazy">
            <div class="zoom-badge">🔍 タップで拡大</div>
          </div>
          <div class="card-caption">
            <span class="badge">A4 縦型</span>
            <h3>${escapeHtml(title)}（情報凝縮ポスター）</h3>
            <p>旅行者の持ち歩き・印刷に適した手書き風インフォグラフィック。</p>
          </div>
        </div>` : ''}

        ${hasImgB ? `
        <!-- 画像B: A4横型 -->
        <div class="image-card" onclick="openLightbox('../../img/${idStr}-b.jpg', '【A4横型】${escapeHtml(title)} 周遊マップ')">
          <div class="image-wrapper">
            <img src="../../img/${idStr}-b.jpg" alt="${escapeHtml(title)} A4横型" loading="lazy">
            <div class="zoom-badge">🔍 タップで拡大</div>
          </div>
          <div class="card-caption">
            <span class="badge">A4 横型</span>
            <h3>周遊マップ ＆ 見開きガイド</h3>
            <p>位置関係やルート、全体像を俯瞰できるワイドデザイン。</p>
          </div>
        </div>` : ''}
      </div>
    </section>`;
  }

  // カード生成
  let cardsHtml = '';
  dataRows.forEach((row, idx) => {
    const itemNum = String(idx + 1).padStart(2, '0');
    const primaryName = row[0] || `項目 ${idx + 1}`;
    const secondaryName = headers.length > 1 && (headers[1].includes('タイ語') || headers[1].includes('英語')) ? row[1] : '';
    
    let bodyContent = '';
    let metaContent = '';
    let tipsContent = '';

    headers.forEach((h, hIdx) => {
      if (hIdx === 0) return;
      if (hIdx === 1 && secondaryName) return;

      const val = row[hIdx] || '-';

      if (h.includes('特徴') || h.includes('見どころ') || h.includes('説明') || h.includes('由来') || h.includes('内容') || h.includes('意味')) {
        bodyContent += `<p class="item-desc">${escapeHtml(val)}</p>`;
      } else if (h.includes('注意') || h.includes('マナー') || h.includes('アドバイス') || h.includes('コツ') || h.includes('ポイント') || h.includes('補足')) {
        tipsContent += `
        <div class="manner-box">
          <span class="manner-title">💡 ${escapeHtml(h)}</span>
          <p>${escapeHtml(val)}</p>
        </div>`;
      } else {
        metaContent += `
        <div class="meta-item">
          <strong>${escapeHtml(h)}</strong>
          <p>${escapeHtml(val)}</p>
        </div>`;
      }
    });

    cardsHtml += `
    <article class="data-card">
      <div class="card-header">
        <div class="card-num">${itemNum}</div>
        <div>
          <h3 class="card-title">${escapeHtml(primaryName)}</h3>
          ${secondaryName ? `<p class="card-sub">${escapeHtml(secondaryName)}</p>` : ''}
        </div>
      </div>
      <div class="card-body">
        ${bodyContent}
        ${metaContent ? `<div class="meta-row">${metaContent}</div>` : ''}
        ${tipsContent}
      </div>
    </article>`;
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | タイ・チェンライ旅ガイド</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;700&family=Prompt:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- ヘッダー -->
  <header class="site-header">
    <div class="container header-inner">
      <div class="badge-tag">No. ${idStr} / タイ・チェンライ旅ガイド</div>
      <h1 class="main-title">${escapeHtml(title)}</h1>
      <p class="lead-text">${escapeHtml(description)}</p>
      
      <div class="quick-stats">
        <div class="stat-card">
          <span class="stat-num">${dataRows.length}</span>
          <span class="stat-label">収録項目数</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">公式</span>
          <span class="stat-label">一次情報リサーチ済</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">A4</span>
          <span class="stat-label">印刷最適化デザイン</span>
        </div>
      </div>
    </div>
  </header>

  <main class="main-content container">
    ${galleryHtml}

    <!-- データ一覧セクション -->
    <section class="section data-section">
      <div class="section-header">
        <span class="section-subtitle">DETAILED GUIDE & DATA</span>
        <h2 class="section-title">詳細ガイド ＆ データ一覧（全${dataRows.length}件）</h2>
        <p class="section-desc">現地調査および公的データに基づく最新詳細情報。</p>
      </div>

      <div class="cards-grid">
        ${cardsHtml}
      </div>
    </section>
  </main>

  <!-- ライトボックスモーダル -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <div class="lightbox-content">
      <button class="lightbox-close" onclick="closeLightbox(event)">✕ 閉じる</button>
      <img id="lightboxImg" src="" alt="拡大画像">
      <div class="lightbox-caption" id="lightboxCaption"></div>
    </div>
  </div>

  <!-- フッター -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <p class="footer-copy">© 2026 JACR Chiang Rai Contents. All Rights Reserved.</p>
      <p class="footer-note">※営業時間・運賃・施設情報等は現地の事情により予告なく変更される場合があります。</p>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateCSS() {
  return `/* ===================================================
   Chiang Rai Guide - Modern Elegant Universal Stylesheet
   =================================================== */

:root {
  --primary: #0f766e;
  --primary-light: #14b8a6;
  --primary-dark: #115e59;
  --accent-gold: #d97706;
  --accent-gold-light: #fef3c7;
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.04);
  --shadow-md: 0 8px 20px rgba(0,0,0,0.06);
  --shadow-lg: 0 16px 36px rgba(0,0,0,0.1);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

.container {
  width: 100%;
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.site-header {
  background: linear-gradient(135deg, #0f172a 0%, #115e59 100%);
  color: #ffffff;
  padding: 50px 0 60px;
  position: relative;
  overflow: hidden;
  border-bottom: 4px solid var(--accent-gold);
}

.site-header::after {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background-image: radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 60%);
  pointer-events: none;
}

.header-inner {
  position: relative;
  z-index: 1;
}

.badge-tag {
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fed7aa;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.main-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 12px;
  letter-spacing: 0.02em;
}

.lead-text {
  font-size: 1.05rem;
  color: #e2e8f0;
  max-width: 820px;
  margin-bottom: 30px;
}

.quick-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 10px 22px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fef08a;
  line-height: 1.1;
}

.stat-label {
  font-size: 0.8rem;
  color: #cbd5e1;
  margin-top: 2px;
}

/* Sections */
.main-content {
  padding: 50px 20px 80px;
}

.section {
  margin-bottom: 70px;
}

.section-header {
  margin-bottom: 32px;
}

.section-subtitle {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.15em;
  margin-bottom: 4px;
}

.section-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 1.85rem;
  color: #0f172a;
  position: relative;
  display: inline-block;
  padding-bottom: 8px;
}

.section-title::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 50px;
  height: 3px;
  background-color: var(--accent-gold);
  border-radius: 2px;
}

.section-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 8px;
}

/* Gallery */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 28px;
}

.image-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
}

.image-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-light);
}

.image-wrapper {
  position: relative;
  background: #ffffff;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
}

.image-wrapper img {
  width: 100%;
  height: auto;
  max-height: 460px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background: #ffffff;
  transition: var(--transition);
}

.image-card:hover .image-wrapper img {
  transform: scale(1.02);
}

.zoom-badge {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 0.8rem;
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 500;
  opacity: 0.9;
  transition: var(--transition);
}

.image-card:hover .zoom-badge {
  opacity: 1;
  background: var(--primary);
}

.card-caption {
  padding: 20px 24px;
  flex-grow: 1;
}

.card-caption .badge {
  display: inline-block;
  background: var(--accent-gold-light);
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.card-caption h3 {
  font-size: 1.15rem;
  color: #0f172a;
  margin-bottom: 6px;
}

.card-caption p {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.data-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 28px;
  transition: var(--transition);
}

.data-card:hover {
  box-shadow: var(--shadow-md);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 18px;
}

.card-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary);
  background: #ccfbf1;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.card-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 1.35rem;
  color: #0f172a;
  margin-bottom: 2px;
}

.card-sub {
  font-family: 'Prompt', sans-serif;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.item-desc {
  font-size: 0.98rem;
  color: #334155;
  margin-bottom: 18px;
  line-height: 1.75;
}

.meta-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  background: #f8fafc;
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.meta-item strong {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.meta-item p {
  font-size: 0.92rem;
  color: #0f172a;
  font-weight: 500;
  line-height: 1.4;
}

.manner-box {
  background: #fffbeb;
  border-left: 4px solid var(--accent-gold);
  padding: 12px 16px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin-top: 12px;
}

.manner-title {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #b45309;
  margin-bottom: 4px;
}

.manner-box p {
  font-size: 0.88rem;
  color: #78350f;
  line-height: 1.6;
}

/* Lightbox */
.lightbox {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.lightbox.active {
  opacity: 1;
  pointer-events: auto;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  background: #ffffff;
}

.lightbox-close {
  position: absolute;
  top: -44px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: var(--transition);
}

.lightbox-close:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.lightbox-caption {
  color: #ffffff;
  font-size: 0.95rem;
  margin-top: 14px;
  text-align: center;
  font-weight: 500;
}

/* Footer */
.site-footer {
  background: #0f172a;
  color: #94a3b8;
  padding: 40px 0;
  font-size: 0.88rem;
  border-top: 1px solid #1e293b;
}

.footer-inner {
  text-align: center;
}

.footer-note {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 8px;
}

/* Responsive & Print */
@media (max-width: 768px) {
  .main-title {
    font-size: 1.7rem;
  }
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media print {
  .site-header {
    background: none;
    color: #000;
    padding: 20px 0;
    border-bottom: 2px solid #000;
  }
  .badge-tag, .zoom-badge, .lightbox, .site-footer {
    display: none !important;
  }
  .main-title {
    font-size: 1.8rem;
    color: #000;
  }
  .image-card, .data-card {
    box-shadow: none;
    border: 1px solid #ccc;
    page-break-inside: avoid;
  }
}
`;
}

function generateJS() {
  return `// Lightbox functionality
function openLightbox(src, caption) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');

  lightboxImg.src = src;
  lightboxCaption.textContent = caption;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  if (event && event.target && event.target.id === 'lightboxImg') {
    return;
  }
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});
`;
}
