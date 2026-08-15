import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'tsv-knowledge', '004.タイ産アルコール・地酒ブランド.tsv');
const previousTarget = path.join(root, 'tsv-knowledge', '004.タイのお酒・マニアック地酒.tsv');
const previousBackup = path.join(root, 'tsv-knowledge', '004.タイのお酒・マニアック地酒_27件版.tsv');
const oldTarget = path.join(root, 'tsv-knowledge', '004.北タイのお酒ブランド.tsv');
const backup = path.join(root, 'tsv-knowledge', '004.北タイのお酒ブランド_旧50件監査.tsv');

const headers = ['ID','銘柄名','タイ文字表記','タイ文字表記区分','名称の要点','ジャンル','酒類大分類','産地','主原料','度数(ABV・目安)','味わい','おすすめの飲み方','レア度','製造者・ブランド','確認状態','タイ語検索判定','推奨対応','精査メモ','出典URL','Google画像検索URL','公開用解説','レコード種別','親ブランド','タイ国内生産','国内生産確認根拠'];

const sources = {
  local: 'https://www.thairath.co.th/news/local/2826846',
  maa: 'https://gooloochiangmai.com/?p=26841',
  chujai: 'https://gooloochiangmai.com/?p=26811',
  phai: 'https://cheewid.com/organization/nw6ig/phai-craft/about',
  zebra: 'https://www.otopchiangmai.com/page/id/%E0%B9%80%E0%B8%AB%E0%B8%A5%E0%B9%89%E0%B8%B2-%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B8%A1%E0%B9%89%E0%B8%B2%E0%B8%A5%E0%B8%B2%E0%B8%A2-%E0%B8%A8%E0%B8%B9%E0%B8%99%E0%B8%A2%E0%B9%8C-otop-%E0%B9%80%E0%B8%8A%E0%B8%B5%E0%B8%A2%E0%B8%87%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88',
  langmaze: 'https://maefaluang.cdd.go.th/th/file/get/file/1802.20250826d8c971d6a646d1c1cb0a124942ecca9b004723.pdf',
  sanpatong: 'https://sanpatong.com/th',
  mekhong: 'https://www.mekhong.com/index_th.html',
  hongthong: 'https://www.hongthong.com/',
  thaibev: 'https://www.thaibev.com/aboutus/thaibev?select_about=1&select_tab=2',
  sangsom: 'https://sangsom.com/th/story/',
  grandma: 'https://www.bootleggerstrading.com/product/gin/grandma-jinn',
  singha: 'https://singhacorporation.com/th',
  leoPlant: 'https://kkb.boonrawd.co.th/th/index',
  singhaPlant: 'https://sbc.boonrawd.co.th/th/index',
  ubeer: 'https://www.singhacorporation.com/ubeer/index.php/th/home',
  thaibevCurrent: 'https://sustainability.thaibev.com/download/thaibevsr2025en.pdf',
  thaibevProducts: 'https://www.thaibev.com/products/group?cateId=1',
  monsoon: 'https://www.monsoonvalley.com/en/our-wines',
  granmonte: 'https://www.granmonte.com/granmonte-wines.php',
};

const rows = [
  ['Hma Jai Dam / Maa Jai Dum','หมาใจดำ','ブランド自身のタイ語表記','チェンマイ発のクラフトスピリッツブランド','クラフトスピリッツ','ブランド','チェンマイ','','','','','地域限定','หมาใจดำ','確認済み','タイ語資料でブランドと複数商品を確認','掲載候補','ブランド総称の行。個別商品は親ブランド欄で紐づける。',sources.maa],
  ['Maa Jai Dum Flowery','หมาใจดำดอกไม้','タイ語資料で確認','花を示す「ดอกไม้」を冠したチェンマイの銘柄','地域蒸留酒','蒸留酒','チェンマイ','','','','','地域限定','','確認済み','タイ語資料で商品名と地域を確認','掲載候補','旧版の説明は使わず、確認できた名称と地域だけを採用。',sources.maa],
  ['Maa Jai Dum Lumka','หมาใจดำลำก้า','タイ語資料で確認','หมาใจดำブランドの透明タイプ','地域蒸留酒','蒸留酒','チェンマイ','','','','','地域限定','','確認済み','タイ語資料で商品名と地域を確認','掲載候補','原料や味は資料間の確認が足りないため空欄。',sources.maa],
  ['Manee Piti Chujai','มานี ปิติ ชูใจ','タイ語資料で確認','タイの教科書の登場人物を思わせる名称','米の醸造酒','醸造酒','サンカムペーン郡、チェンマイ','米','','','','地域限定','','確認済み','タイ語資料で地域の米酒として確認','掲載候補','一般語検索では教材情報が多いため、画像検索では「สุรา」を併記。',sources.chujai],
  ['PHAI Craft','ไผ่คราฟท์','ブランド自身のタイ語表記','チェンマイ発のクラフト白酒ブランド','クラフト白酒','蒸留酒','サンサーイ郡、チェンマイ','ジャスミンライス','','','','地域限定','Chiang Mai PS 2554','確認済み','タイ語資料で産地・原料・製法を確認','掲載候補','2011年創業。薪火を用いる伝統的な蒸留法と熟成を掲げる。',sources.phai],
  ['Tang Ma Lai','ทางม้าลาย','タイ語資料で確認','「横断歩道／シマウマ模様」を意味する名称','クラフトスピリッツ','蒸留酒','チェンマイ','北部産ジャガイモ','','ミントの香りをうたう','','地域限定','','確認済み','OTOPチェンマイ資料で商品を確認','掲載候補','透明な蒸留酒。資料にある原料・香り以上の説明は加えていない。',sources.zebra],
  ['Coyote Lumka Mixed Fruit','โคโยตี้ลำก้า รสผลไม้รวม','タイ語資料で確認','โคโยตี้ลำก้าのミックスフルーツ味','果実風味の地域蒸留酒','蒸留酒','チェンマイ','もち米、果実','','','','地域限定','','確認済み','OTOPチェンマイ資料で商品名を確認','掲載候補','OTOP掲載ページに表示される商品名を採用。',sources.zebra],
  ['Coyote Lumka Strawberry','โคโยตี้ลำก้า รสสตรอว์เบอร์รี','タイ語資料で確認','โคโยตี้ลำก้าのイチゴ味','果実風味の地域蒸留酒','蒸留酒','チェンマイ','もち米、イチゴ','','','','地域限定','','確認済み','OTOPチェンマイ資料で商品名を確認','掲載候補','タイ語の表記ゆれを考慮し公式掲載名に寄せた。',sources.zebra],
  ['Langmaze','แลงมาเซ','行政資料で確認','チェンライ県メーラオ郡の地域酒','地域酒','蒸留酒','メーラオ郡、チェンライ','','','','','地域限定','วิสาหกิจชุมชนสุรากลั่นฐิตินันท์','確認済み','県OTOP資料で商品・事業者・所在地を確認','掲載候補','商品詳細は未確認のため、酒種・原料・度数を推測していない。',sources.langmaze],
  ['Rebel Rebel White','เรเบล เรเบล ไวต์','検索補助音写（公式名は英字）','Sanpatong Distilleryの白ラム','ラム','蒸留酒','サンパトーン郡、チェンマイ','サトウキビジュース','40%','','','専門店・蒸留所','Sanpatong Distillery','確認済み','公式タイ語サイトで商品仕様を確認','掲載候補','チェンマイの蒸留所が現地製造する、無添加を掲げた商品。',sources.sanpatong],
  ['Imagin Black','อิเมจิน แบล็ก','検索補助音写（公式名は英字）','Sanpatong Distilleryのジン','ジン','蒸留酒','サンパトーン郡、チェンマイ','ココナッツ花蜜','40%','','','専門店・蒸留所','Sanpatong Distillery','確認済み','公式タイ語サイトで商品仕様を確認','掲載候補','公式名が英字のため、タイ文字は画像検索用の音写。',sources.sanpatong],
  ['Elevated Vodka','เอลิเวเต็ด วอดก้า','検索補助音写（公式名は英字）','Sanpatong Distilleryのウォッカ','ウォッカ','蒸留酒','サンパトーン郡、チェンマイ','タピオカ','40%','','','専門店・蒸留所','Sanpatong Distillery','確認済み','公式タイ語サイトで商品仕様を確認','掲載候補','公式名が英字のため、タイ文字は画像検索用の音写。',sources.sanpatong],
  ['Lychee Eau de Vie','ลิ้นจี่ โอ เดอ วี','検索補助音写（公式名は英字）','ライチを原料とする透明なフルーツブランデー','オー・ド・ヴィー','蒸留酒','サンパトーン郡、チェンマイ','ライチ','40%','','','専門店・蒸留所','Sanpatong Distillery','確認済み','公式タイ語サイトで商品仕様を確認','掲載候補','公式名が英字のため、タイ文字は画像検索用の音写。',sources.sanpatong],
  ['Mekhong','แม่โขง','公式タイ語表記','1941年に登場したタイの代表的銘柄','タイ・スピリッツ','蒸留酒','タイ','糖蜜、米','','','','全国流通','Mekhong / ThaiBev','確認済み','公式タイ語サイトで確認','掲載候補','地域酒比較の基準として残す全国銘柄。北タイ産とは扱わない。',sources.mekhong],
  ['Hong Thong','หงส์ทอง','公式タイ語表記','「金の白鳥」を意味する全国流通銘柄','ブレンデッドスピリッツ','蒸留酒','タイ','','','','','全国流通','Hong Thong / ThaiBev','確認済み','公式サイトで確認','掲載候補','旧版にあったClear版は確認できないため統合・削除。',sources.hongthong],
  ['Ruang Khao','รวงข้าว','公式タイ語表記','稲穂を意味する名称の白酒','白酒','蒸留酒','タイ','','','','','全国流通','ThaiBev','確認済み','製造者公式ブランド情報で確認','掲載候補','北タイ限定ではない全国銘柄。',sources.thaibev],
  ['Niyom Thai','นิยมไทย','公式タイ語表記','「タイで好まれる」の意をもつ白酒銘柄','白酒','蒸留酒','タイ','','','','','全国流通','ThaiBev','確認済み','製造者公式ブランド情報で確認','掲載候補','北タイ限定ではない全国銘柄。',sources.thaibev],
  ['SangSom','แสงโสม','公式タイ語表記','タイを代表するラム系銘柄','ラム','蒸留酒','タイ','糖蜜','','','','全国流通','SangSom / ThaiBev','確認済み','公式サイトで確認','掲載候補','地域限定品ではないが、タイ酒の基礎銘柄として採用。',sources.sangsom],
  ['Grandma Jinn Recipe No.1','แกรนด์มา จินน์ เรซิพี นัมเบอร์ 1','検索補助音写（公式名は英字）','タイ産クラフトジン','ジン','蒸留酒','タイ','','','','','専門店','Lamai Distilleries','確認済み','公式取扱ページで実在を確認','掲載候補','北タイ産という旧説明は削除。産地をタイ国内以上に限定しない。',sources.grandma],
  ['Assa Dong','อัสดง','タイ語記事で確認','ナーン県の地域酒として紹介される銘柄','地域酒','','ナーン','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','商品詳細は未確認のため空欄を維持。',sources.local],
  ['Prachachuen Group','กลุ่มประชาชื่น','タイ語記事で確認','ナーン県の地域酒生産グループ','地域酒','','ナーン','','','','','地域限定','กลุ่มประชาชื่น','確認済み','タイ語報道で名称と県を確認','掲載候補','個別商品名ではなく生産グループ名として収録。',sources.local],
  ['Maw','เหม๊าะ','タイ語記事で確認','ナーン県の地域酒として紹介される銘柄','地域酒','','ナーン','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','短い名称のため画像検索では「สุรา น่าน」を併記。',sources.local],
  ['Jan Peng','จันเป๋ง','タイ語記事で確認','ラムプーン県の地域酒として紹介される銘柄','地域酒','','ラムプーン','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','商品詳細は未確認のため空欄を維持。',sources.local],
  ['Bamroe','บำเรอ','タイ語記事で確認','チェンライ県の地域酒として紹介される銘柄','地域酒','','チェンライ','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','一般語でもあるため画像検索では「สุรา เชียงราย」を併記。',sources.local],
  ['Kilo Spirits','กิโลสปิริต','タイ語記事で確認','クラビ県のクラフト蒸留酒ブランド','クラフトスピリッツ','蒸留酒','クラビ','','','','','地域限定','Kilo Spirits','確認済み','タイ語報道でブランドと県を確認','掲載候補','旧版の北タイ扱いを修正し、クラビ産として収録。',sources.local],
  ['Siam Sato','สยามสาโท','タイ語記事で確認','ナコーンラーチャシーマー県のサトーブランド','サトー','醸造酒','ナコーンラーチャシーマー','米','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','米の醸造酒という分類以上の詳細は推測しない。',sources.local],
  ['Onson','ออนซอน','タイ語記事で確認','サコンナコーン県の地域酒として紹介される銘柄','地域酒','','サコンナコーン','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','商品詳細は未確認のため空欄を維持。',sources.local],
  ['White Shark','ไวต์ชาร์ค','タイ語記事で確認','チョンブリー県の地域酒として紹介される銘柄','地域酒','','チョンブリー','','','','','地域限定','','確認済み','タイ語報道で銘柄と県を確認','掲載候補','英字公式綴りの細部は今後公式資料が見つかれば更新。',sources.local],
  ['Singha Beer','เบียร์สิงห์','公式タイ語表記','タイを代表する国産ラガービール','ラガービール','ビール','タイ','','','','','全国流通','Boon Rawd Brewery','確認済み','公式製品一覧と国内工場資料で確認','掲載候補','海外ブランドではなく、タイ企業が国内工場で製造する銘柄。',sources.singhaPlant],
  ['LEO Beer','เบียร์ลีโอ','公式タイ語表記','タイ国内で広く流通するラガービール','ラガービール','ビール','タイ','','','なめらかなラガー','','全国流通','Boon Rawd Brewery','確認済み','公式ブランドページと国内工場資料で確認','掲載候補','コンケーン工場などで国内生産が公式に確認できる。',sources.leoPlant],
  ['U Beer','ยู เบียร์','公式タイ語表記','Boon Rawd系のラガービール','ラガービール','ビール','タイ','','4.5%','','','全国流通','Boon Rawd Brewery','確認済み','公式商品ページで確認','掲載候補','原料の一部が輸入でも、完成品はタイ国内生産の対象として扱う。',sources.ubeer],
  ['Singha Reserve','สิงห์ รีเซิร์ฟ','公式製品一覧の表記を音写','Singhaのプレミアム系商品','ビール','ビール','タイ','','','','','全国流通','Boon Rawd Brewery','確認済み','公式製品一覧と国内製造拠点で確認','掲載候補','外国ブランドのライセンス品ではなくSinghaの商品として収録。',sources.singha],
  ['SNOWY WEIZEN','สโนวี่ ไวเซ่น','検索補助音写（公式名は英字）','Boon Rawd系の小麦ビール','ヴァイツェン','ビール','タイ','小麦','','','','全国流通','Boon Rawd Brewery','確認済み','公式製品一覧と国内製造拠点で確認','掲載候補','公式名が英字のためタイ文字は検索補助音写。',sources.singha],
  ['EST.33 Copper','เอสที 33 คอปเปอร์','検索補助音写（公式名は英字）','Boon Rawd系のクラフトスタイル商品','ビール','ビール','タイ','','','','','限定流通','Boon Rawd Brewery','確認済み','公式製品一覧で確認','掲載候補','国内企業の自社銘柄として収録。',sources.singha],
  ['Chang Beer','เบียร์ช้าง','公式タイ語表記','ThaiBevを代表するタイ産ビール','ラガービール','ビール','タイ','','','','','全国流通','ThaiBev','確認済み','ThaiBev最新報告書で主力ビールと国内醸造所を確認','掲載候補','輸入品ではなくタイ国内生産の主力銘柄。',sources.thaibevCurrent],
  ['Blend 285','เบลนด์ 285','公式製品名の音写','ThaiBevの代表的ブレンデッドスピリッツ','ブレンデッドスピリッツ','蒸留酒','タイ','','','','','全国流通','ThaiBev','確認済み','公式製品一覧と最新報告書で確認','掲載候補','超メジャー枠として追加。',sources.thaibevProducts],
  ['MERIDIAN','เมอริเดียน','公式製品名の音写','ThaiBevのブランデー銘柄','ブランデー','蒸留酒','タイ','','','','','全国流通','ThaiBev','確認済み','公式製品一覧で確認','掲載候補','タイ国内製造の公式ポートフォリオ掲載品。',sources.thaibevProducts],
  ['Phraya','พระยา','公式タイ語表記','ThaiBevのプレミアムラム','ラム','蒸留酒','タイ','糖蜜','','','','専門店','ThaiBev','確認済み','公式製品一覧で確認','掲載候補','旧版では北タイ扱いを否定したが、タイ産酒DBでは適格。',sources.thaibevProducts],
  ['Monsoon Valley','มอนซูน แวลลีย์','公式タイ語サイトの表記を音写','タイ産ブドウを用いるワインブランド','ワインブランド','ワイン','ホアヒンほか、タイ国内','ブドウ','','','','全国・専門店','Siam Winery','確認済み','公式サイトで国内の畑とサムットサーコーンの醸造所を確認','掲載候補','ブランド総称。個別シリーズは必要に応じ別商品として追加可能。',sources.monsoon],
  ['GranMonte','กรานมอนเต้','公式名の一般的なタイ語音写','カオヤイGIのタイ産ワインブランド','ワインブランド','ワイン','カオヤイ、ナコーンラーチャシーマー','ブドウ','','','','専門店・ワイナリー','GranMonte','確認済み','公式サイトで全商品がKhao Yai Wine GIと確認','掲載候補','ブランド総称として収録。',sources.granmonte],
  ['GranMonte Asoke Cabernet Sauvignon Syrah','กรานมอนเต้ อโศก','検索補助音写（公式名は英字）','GranMonteの赤ワイン','赤ワイン','ワイン','カオヤイ、ナコーンラーチャシーマー','カベルネ・ソーヴィニヨン、シラー','','','','専門店・ワイナリー','GranMonte','確認済み','公式ワイン一覧で商品とカオヤイGIを確認','掲載候補','GranMonteの個別商品。',sources.granmonte],
  ['GranMonte The Orient Viognier','กรานมอนเต้ ดิ โอリエント วิโอเนียร์','検索補助音写（公式名は英字）','GranMonteの白ワイン','白ワイン','ワイン','カオヤイ、ナコーンラーチャシーマー','ヴィオニエ','','','','専門店・ワイナリー','GranMonte','確認済み','公式ワイン一覧で商品とカオヤイGIを確認','掲載候補','GranMonteの個別商品。',sources.granmonte],
  ['GranMonte Spring Chenin Blanc','กรานมอนเต้ สปริง เชอแนง บล็อง','検索補助音写（公式名は英字）','GranMonteの白ワイン','白ワイン','ワイン','カオヤイ、ナコーンラーチャシーマー','シュナン・ブラン','','','','専門店・ワイナリー','GranMonte','確認済み','公式ワイン一覧で商品とカオヤイGIを確認','掲載候補','GranMonteの個別商品。',sources.granmonte],
];

const sanitize = value => String(value ?? '').replaceAll('\t',' ').replaceAll(/\r?\n/g,' ');
const output = [headers.join('\t')];
for (const [index, row] of rows.entries()) {
  const thai = row[1];
  let query = `${thai} สุรา`;
  if (thai === 'เหม๊าะ') query += ' น่าน';
  if (thai === 'บำเรอ') query += ' เชียงราย';
  const imageUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  const publicText = `${row[0]}（${thai}）は、${row[6]}に関連する${row[4]}。${row[3]}。`;
  const brandParents = new Map([
    ['Maa Jai Dum Flowery','Hma Jai Dam / Maa Jai Dum'],['Maa Jai Dum Lumka','Hma Jai Dam / Maa Jai Dum'],
    ['GranMonte Asoke Cabernet Sauvignon Syrah','GranMonte'],['GranMonte The Orient Viognier','GranMonte'],['GranMonte Spring Chenin Blanc','GranMonte'],
  ]);
  const brandRows = new Set(['Hma Jai Dam / Maa Jai Dum','PHAI Craft','Prachachuen Group','Monsoon Valley','GranMonte']);
  const recordType = brandRows.has(row[0]) ? 'ブランド／生産者' : '個別商品・銘柄';
  const parentBrand = brandParents.get(row[0]) ?? '';
  const productionEvidence = row[17];
  // rowは出典URLまで。Google画像検索URLと公開用解説を末尾に追加する。
  const reordered = [index + 1, ...row, imageUrl, publicText, recordType, parentBrand, '確認済み', productionEvidence];
  output.push(reordered.map(sanitize).join('\t'));
}

if (fs.existsSync(oldTarget) && !fs.existsSync(backup)) fs.copyFileSync(oldTarget, backup);
if (fs.existsSync(previousTarget) && !fs.existsSync(previousBackup)) fs.copyFileSync(previousTarget, previousBackup);
fs.writeFileSync(target, `${output.join('\n')}\n`, 'utf8');
if (fs.existsSync(oldTarget)) fs.unlinkSync(oldTarget);
if (fs.existsSync(previousTarget)) fs.unlinkSync(previousTarget);
console.log(`Wrote ${rows.length} curated rows: ${target}`);
