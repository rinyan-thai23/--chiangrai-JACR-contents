import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site', '003-chiangrai-specialties');
const imgDir = path.join(site, 'img');
const tsvPath = path.join(imgDir, 'IMAGE_SOURCES.tsv');

// Wikimedia Commonsのファイル説明で対象を確認したものだけを指定する。
const replacements = {
  '4': 'ARS Litchi chinensis.jpg',
  '9': 'แกงฮังเล ที่ หลู้ลำ.jpg',
  '12': 'Chin som mok.JPG',
  '17': 'Gymnema inodorum Blanco2.402.jpg',
  '22': 'Cascara, Coffee cherry tea-6447.jpg',
  '24': 'Camellia sinensis MHNT.BOT.2016.12.24.jpg',
  '26': 'Pottery at Bangkok National Museum.jpg',
  '28': 'Thailand Paper-Making (706841150).jpg',
  '31': 'Tribes woman with ear piercing.jpg',
  '32': 'Mangrai Monument.jpg',
  '39': 'Tam som-o nam pu.JPG',
  '42': '20171111 Ciastka ryżowe Luang Prabang 1189 DxO.jpg',
  '44': 'Darjeeling, India, Fermented tea leaves.jpg',
  '45': 'Rice crackers.jpg',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = (value) => String(value || '').replace(/<[^>]*>/g, '').replace(/[\t\r\n]+/g, ' ').trim();
const lines = fs.readFileSync(tsvPath, 'utf8').trim().split(/\r?\n/);
const headers = lines[0].split('\t');
const rows = lines.slice(1).map((line) => {
  const cells = line.split('\t');
  return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
});

async function getFile(title) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', titles: `File:${title}`,
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '1200',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'JACR-Knowledge-Atlas/1.0' },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const json = await response.json();
  const page = Object.values(json.query.pages)[0];
  if (page.missing !== undefined) throw new Error(`Missing ${title}`);
  return { page, info: page.imageinfo[0] };
}

async function download(url) {
  const clean = new URL(url);
  clean.search = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(clean, { headers: { 'User-Agent': 'JACR-Knowledge-Atlas/1.0' } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429) throw new Error(`Download ${response.status}`);
    await wait(20000);
  }
  throw new Error('Rate limited');
}

for (const [id, title] of Object.entries(replacements)) {
  await wait(10000);
  try {
    const { page, info } = await getFile(title);
    const image = await download(info.thumburl);
    const target = `${id.padStart(3, '0')}.jpg`;
    const row = rows.find((entry) => entry.ID === id);
    const meta = info.extmetadata || {};
    fs.writeFileSync(path.join(imgDir, target), image);
    Object.assign(row, {
      '画像ファイル': target,
      '検索語': `File:${title}`,
      'Commonsファイル名': page.title.replace(/^File:/, ''),
      '出典ページ': info.descriptionurl,
      '作者': strip(meta.Artist?.value || meta.Credit?.value || '不明'),
      'ライセンス': strip(meta.LicenseShortName?.value || '要確認'),
      'ライセンスURL': meta.LicenseUrl?.value || '',
      '利用条件': strip(meta.UsageTerms?.value || ''),
      '画像区分': ['24', '26', '31', '32', '42', '44', '45'].includes(id) ? '対象分野に関連する参考写真' : '対象を個別確認した写真',
    });
    fs.writeFileSync(tsvPath, `${headers.join('\t')}\n${rows.map((entry) => headers.map((header) => String(entry[header] ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n')}\n`, 'utf8');
    console.log(`Updated ${id}: ${title}`);
  } catch (error) {
    console.warn(`Skipped ${id}: ${error.message}`);
  }
}

fs.writeFileSync(path.join(site, 'image-sources.js'), `window.specialtyImages=${JSON.stringify(Object.fromEntries(rows.map((entry) => [entry.ID, entry])), null, 2)};\n`, 'utf8');
