import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'tsv-knowledge', '004.北タイのお酒ブランド.tsv');

const thaiNames = [
  'หมาใจดำดอกไม้','หมาใจดำลำก้า','ยอดข้าวสุราทิพย์','เคไฟว์ พรีเมียมสปิริต','แกรนด์มา จินน์ เรซิพี นัมเบอร์ 1',
  'เจมินี','คริสตัล ไทย สปิริต','เหล้าเวียง','ออริจิน จิน','ไวน์สตรอว์เบอร์รีดอยคำ','ไวน์ลิ้นจี่ดอยคำ','เบญจา','สาโทสยาม','รุ่งตะวัน','แม่โขง',
  'พระยา รัม','ไวน์ลำไยลำพูน','เหล้าข่า','ไวน์สับปะรดเชียงราย','สุราขาว','น้ำหม้อ','ไวน์มัลเบอร์รีแม่สาย','หงส์ทอง','ปันดี','อุเมะชูดอยอ่างขาง',
  'เหล้าอุ / เหล้าไห','สุราลำไยลำพูน','เสือ 11 ตัว','ม้ากระทืบโรง','สาโทข้าวแดง','วิสกี้ข้าวโพดม้ง','มานี ปิติ ชูใจ','พญาเสือ','เหล้ากาแฟเชียงราย','ไวน์น้ำผึ้ง',
  'รวงข้าว','ไวน์มะเม่า','นิยมไทย','เหล้าขาว','กิโลสปิริต','บรั่นดีข้าวแพร่','เหล้าเสาวรส','ไวต์แรบบิต วอดก้า','ข้าวหมาก','ไวน์มะขาม',
  'แสงโสม','เหล้าขาวหอมมะลิ','ไวน์ขิง','หงส์ทอง (ใส / เคลียร์)','น้ำข้าว'
];

const official = new Map([
  ['5', ['公式表記確認', '確認済み', 'Lamai Distilleries / Bootleggers Trading', 'https://www.bootleggerstrading.com/product/gin/grandma-jinn']],
  ['15', ['公式表記確認', '確認済み', 'Mekhong / ThaiBev', 'https://www.mekhong.com/authentic_spirit.html']],
  ['23', ['公式表記確認', '確認済み', 'Hong Thong / ThaiBev', 'https://www.hongthong.com/']],
  ['36', ['公式表記確認', '確認済み', 'Ruang Khao / ThaiBev', 'https://www.thaibev.com/aboutus/thaibev?select_about=1&select_tab=2']],
  ['38', ['公式表記確認', '確認済み', 'Niyom Thai / ThaiBev', 'https://www.thaibev.com/aboutus/thaibev?select_about=1&select_tab=2']],
  ['46', ['公式表記確認', '確認済み', 'SangSom / ThaiBev', 'https://sangsom.com/th/story/']],
]);

const thaiAudit = new Map([
  ['1',['北タイ商品として確認','เชียงใหม่の実在ブランド。正式な商品呼称は「หมาใจดำดอกไม้」。','https://gooloochiangmai.com/?p=26841']],
  ['2',['北タイ商品として確認','เชียงใหม่の実在ブランド。透明タイプは「หมาใจดำลำก้า」。','https://gooloochiangmai.com/?p=26841']],
  ['3',['名称候補のみ確認','タイの登録銘柄一覧に「ยอดข้าวสุราทิพย์」はあるが、Tap 35・プレー産という説明は未確認。','https://www.nso.go.th/nsoweb/storage/contents_detail/2026/20260326084006_46650.pdf']],
  ['4',['裏付けなし・差し替え推奨','「เคไฟว์ พรีเมียมสปิริต」とプレー産酒の組み合わせをタイ語検索で確認できない。','']],
  ['5',['タイ商品・北タイ産は未確認','Grandma Jinnは実在するが、北タイまたはチェンマイ産という裏付けは確認できない。','https://www.bootleggerstrading.com/product/gin/grandma-jinn']],
  ['6',['裏付けなし・差し替え推奨','チェンマイ産Gemini Ginをタイ語検索で確認できない。','']],
  ['7',['商品名・酒種に不一致あり','Kristall Thai Spirit/Ginの流通例はあるが、チェンマイ産ラムという説明は未確認。','https://www.gajkitchenchiangmai.com/menu']],
  ['8',['裏付けなし・差し替え推奨','「เหล้าเวียง」をウィアンパパオの固有銘柄として確認できない。','']],
  ['9',['裏付けなし・差し替え推奨','チェンマイ産Origin Ginをタイ語検索で確認できない。','']],
  ['10',['裏付けなし・差し替え推奨','ดอยคำのイチゴ事業は確認できるが、同社のイチゴワイン商品は確認できない。','https://www.thaipost.net/main/detail/86091']],
  ['11',['裏付けなし・差し替え推奨','ดอยคำのライチワイン商品をタイ語検索で確認できない。','']],
  ['12',['裏付けなし・差し替え推奨','Bennchcha／เบญจาという北タイ酒を確認できない。綴り自体も要再確認。','']],
  ['13',['実在商品・北タイ外','สาโทสยามは実在する市販サトーだが、北タイ固有商品ではない。','https://www.priceza.com/s/ราคา/สาโทสยาม']],
  ['14',['裏付けなし・差し替え推奨','รุ่งตะวันという北タイ酒の固有商品を確認できない。','']],
  ['15',['実在商品・全国銘柄','แม่โขงは公式確認済み。ただし北タイ限定の酒ではない。','https://www.mekhong.com/index_th.html']],
  ['16',['実在商品・全国銘柄','พระยาはタイのラムとして流通するが、北タイ固有ではない。','']],
  ['23',['実在商品・全国銘柄','หงส์ทองは公式確認済み。北タイ限定ではない。','https://www.hongthong.com/']],
  ['24',['裏付けなし・差し替え推奨','ปันดีという北タイ酒を確認できない。','']],
  ['25',['裏付けなし・差し替え推奨','ดอยอ่างขาง産梅酒という固有商品を確認できない。','']],
  ['28',['ヤードーン処方・酒銘柄ではない','เสือ 11 ตัวは酒そのものではなく、白酒へ漬ける薬草処方・薬材商品。','https://www.tudsinjai.com/data/product/eleven_tigers_liquor/']],
  ['29',['ヤードーン処方・酒銘柄ではない','正しいタイ語は「ม้ากระทืบโรง」。薬草酒の処方名で、固有の酒ブランドではない。','https://spacebar.th/business/explore-northeast-local-liquor-wisdom-poison']],
  ['32',['北タイ商品として確認','มานี ปิติ ชูใจはサンカムペーンの伝統的な米の醸造酒として確認。','https://gooloochiangmai.com/?p=26811']],
  ['33',['実在商品・北タイ産は未確認','พญาเสือという白酒銘柄は確認できるが、北タイ産という裏付けはない。','https://www.nationtv.tv/news/378865956']],
  ['36',['実在商品・全国銘柄','รวงข้าวはThaiBevの白酒。北タイ限定ではない。','https://www.thaibev.com/aboutus/thaibev?select_about=1&select_tab=2']],
  ['38',['実在商品・全国銘柄','นิยมไทยはThaiBev系の登録銘柄。北タイ限定ではない。','https://www.thaibev.com/aboutus/thaibev?select_about=1&select_tab=2']],
  ['39',['一般酒・公開非推奨','袋入り白酒はブランドではなく非正規流通を連想させる。紹介項目としては差し替え推奨。','']],
  ['40',['実在商品・北タイ外','กิโลสปิริตは実在するが、タイ語資料ではクラビの事業者として紹介される。','https://www.thairath.co.th/news/local/2826846']],
  ['43',['北タイ商品ではない','White Rabbit Vodkaの流通品はオーストラリア産として案内され、北タイとの関係を確認できない。','https://www.songsaengsawang.com/product/199236-199217/white-rabbit-vodka-700ml']],
  ['44',['発酵食品・酒銘柄ではない','ข้าวหมากは甘酒状の発酵食品・発酵米。酒ブランドとして扱わない。','']],
  ['46',['実在商品・全国銘柄','แสงโสมは公式確認済みのタイ産ラム。北タイ限定ではない。','https://sangsom.com/th/story/']],
  ['49',['裏付けなし・差し替え推奨','หงส์ทองのClear/Saiという公式商品を確認できない。通常のหงส์ทองとの重複。','']],
]);

const genericIds = new Set(['17','18','19','20','21','22','26','27','30','31','34','35','37','41','42','45','47','48','50']);
const nameCorrections = new Map([
  ['1','Maa Jai Dum Flowery (หมาใจดำดอกไม้)'],
  ['2','Maa Jai Dum Lumka (หมาใจดำลำก้า)'],
  ['3','Yod Khao Suratip (ยอดข้าวสุราทิพย์)'],
  ['7','Kristall Thai Spirit (クリスタル・タイ・スピリット)'],
  ['13','Sato Siam (สาโทสยาม)'],
  ['28','Suea 11 Tua (เสือ 11 ตัว / ヤードーン薬材)'],
  ['29','Ma Krathuep Rong (ม้ากระทืบโรง / ヤードーン処方)'],
  ['32','Manee Piti Chujai Rice Wine (มานี ปิติ ชูใจ)'],
  ['40','Kilo Spirits (กิโลสปิริต)'],
  ['43','White Rabbit Vodka (ไวต์แรบบิต・オーストラリア産)'],
]);

const generalThaiIds = new Set(['8','17','18','19','20','21','22','26','27','29','30','31','34','35','37','39','41','42','44','45','47','48','50']);
const distilledWords = /Lao Khao|Spirit|Gin|Rum|Whiskey|Brandy|สุรา|焼酎/i;
const liqueurWords = /Liqueur|Umeshu/i;
const fermentedWords = /Kaow Mak/i;

function broadType(genre) {
  if (liqueurWords.test(genre)) return 'リキュール・混成酒';
  if (fermentedWords.test(genre)) return '発酵食品・低アルコール';
  if (/Wine|Mead|Sato/i.test(genre)) return '醸造酒';
  if (distilledWords.test(genre)) return '蒸留酒';
  return '要分類確認';
}

function serving(type, taste) {
  if (type === '醸造酒') return /甘口|フルーティー/i.test(taste) ? 'よく冷やして少量ずつ' : '冷やして食事と合わせる';
  if (type === 'リキュール・混成酒') return 'ロック、ソーダ割り、カクテル';
  if (type === '発酵食品・低アルコール') return '商品表示を確認し、少量から試す';
  return /強烈|辛口/i.test(taste) ? '少量のストレート、ロック、水割り' : 'ロック、ソーダ割り、カクテル';
}

function normalizeAbv(value) {
  const raw = String(value || '').trim();
  if (/^0\.\d+$/.test(raw)) return `${Math.round(Number(raw) * 100)}%`;
  return raw;
}

const lines = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/);
const oldHeaders = lines[0].split('\t');
const oldRows = lines.slice(1).map((line) => {
  const cells = line.split('\t');
  return Object.fromEntries(oldHeaders.map((header, index) => [header, cells[index] ?? '']));
});

const newHeaders = [
  'ID','銘柄名','タイ文字表記','タイ文字表記区分','名称の要点','ジャンル','酒類大分類','産地','主原料','度数(ABV・目安)','味わい','おすすめの飲み方',
  'レア度','製造者・ブランド','確認状態','タイ語検索判定','推奨対応','精査メモ','出典URL','Google画像検索URL','公開用解説','旧解説・ストーリー（未精査）'
];

const output = oldRows.map((row, index) => {
  const type = broadType(row['ジャンル']);
  const confirmed = official.get(row.ID);
  let notationType = confirmed?.[0] || (generalThaiIds.has(row.ID) ? '一般的なタイ語名称' : '暫定音写・要確認');
  let status = confirmed?.[1] || (generalThaiIds.has(row.ID) ? '品目名のみ確認・銘柄要調査' : '実在・表記とも要追加調査');
  const producer = confirmed?.[2] || '';
  const audit = thaiAudit.get(row.ID);
  const source = audit?.[2] || confirmed?.[3] || '';
  const auditResult = audit?.[0] || (genericIds.has(row.ID) ? '一般的な酒種・固有銘柄ではない' : '追加調査が必要');
  const auditNote = audit?.[1] || (genericIds.has(row.ID) ? '酒または原料の種類としては成立するが、この名称だけでは製造者・商品を特定できない。' : 'タイ語検索による十分な裏付けをまだ確認できない。');
  const action = /北タイ商品として確認/.test(auditResult) ? '掲載候補' : /裏付けなし|公開非推奨|北タイ商品ではない/.test(auditResult) ? '差し替え推奨' : /ヤードーン|酒銘柄ではない|北タイ外|全国銘柄/.test(auditResult) ? '別枠または補足扱い' : '追加調査後に判断';
  if (/北タイ商品として確認/.test(auditResult)) { notationType = 'タイ語資料で確認'; status = '確認済み'; }
  if (/裏付けなし/.test(auditResult)) status = '未確認';
  const publicText = action === '掲載候補'
    ? auditNote
    : genericIds.has(row.ID)
      ? `${thaiNames[index]}は酒または原料・製法の一般名称として扱う。この名称だけでは特定の商品や製造者を示さない。`
      : /実在商品/.test(auditResult)
        ? auditNote
        : '';
  const point = `${row['産地']}に関連する、${row['主原料']}を主原料として収録された${row['ジャンル']}。`;
  return {
    ...row,
    '銘柄名': nameCorrections.get(row.ID) || row['銘柄名'],
    'タイ文字表記': thaiNames[index],
    'タイ文字表記区分': notationType,
    '名称の要点': point,
    '酒類大分類': type,
    '度数(ABV・目安)': normalizeAbv(row['度数(ABV・目安)'] || row['度数(ABV)']),
    'おすすめの飲み方': serving(type, row['味わい']),
    '製造者・ブランド': producer,
    '確認状態': status,
    'タイ語検索判定': auditResult,
    '推奨対応': action,
    '精査メモ': auditNote,
    '出典URL': source,
    'Google画像検索URL': `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(thaiNames[index])}`,
    '公開用解説': publicText,
    '旧解説・ストーリー（未精査）': row['旧解説・ストーリー（未精査）'] || row['解説・ストーリー'] || '',
  };
});

const safe = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
const text = `${newHeaders.join('\t')}\n${output.map((row) => newHeaders.map((header) => safe(row[header])).join('\t')).join('\n')}\n`;
fs.writeFileSync(file, text, 'utf8');
console.log(`Updated ${output.length} rows and ${newHeaders.length} columns: ${file}`);
