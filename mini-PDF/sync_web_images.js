const fs = require('fs');
const path = require('path');

// Update only the illustration section; preserve each page's edited content.
function syncWebImages() {
  const imageDir = path.join(__dirname, 'img2');
  let updated = 0;
  for (const name of fs.readdirSync(imageDir)) {
    const match = /^(\d{3})-a4-portrait-white\.png$/.exec(name);
    if (!match) continue;
    const file = path.join(__dirname, 'WEB', match[1], 'index.html');
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const title = (html.match(/<title>(.*?)<\/title>/s)?.[1] || 'イラストガイド').split('|')[0].trim();
    const src = `../../img2/${name}`;
    const section = `<section class="section infographic-section">
      <div class="section-header">
        <span class="section-subtitle">VISUAL GUIDE</span>
        <h2 class="section-title">印刷して持ち歩けるイラストガイド</h2>
        <p class="section-desc">白背景のA4縦向きガイド。画像を開くと拡大できます。印刷時はA4・縦向き・用紙に合わせる設定を選んでください。</p>
      </div>
      <div style="max-width: 760px; margin: 0 auto;">
        <a class="image-card" href="${src}" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;" aria-label="${title}の画像を新しいタブで開く">
          <div class="image-wrapper">
            <img src="${src}" alt="${title}：白背景・A4縦向きのイラストガイド" loading="lazy" style="max-height: none; height: auto;">
            <div class="zoom-badge">画像を開いて拡大</div>
          </div>
          <div class="card-caption"><span class="badge">A4 縦向き・白背景</span><h3>${title}</h3></div>
        </a>
        <p style="text-align: center; margin-top: 16px;"><a href="${src}" download="${name}">印刷用画像を保存（PNG）</a></p>
      </div>
    </section>`;
    const pattern = /<section class="section infographic-section">[\s\S]*?<\/section>/;
    if (!pattern.test(html)) throw new Error(`Image section missing: ${file}`);
    const result = html.replace(pattern, () => section);
    if (result !== html) {
      fs.writeFileSync(file, result, 'utf8');
      updated++;
    }
  }
  console.log(`Updated ${updated} illustration sections.`);
}

if (require.main === module) syncWebImages();
module.exports = syncWebImages;
