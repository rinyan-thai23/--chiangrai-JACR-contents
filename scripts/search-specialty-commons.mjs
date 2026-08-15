const queries = [
  'Kaeng hang le', 'Doi Din Dang pottery', 'Lanna tung flag',
  'Khao kwap rice cracker', 'Khao tan rice cracker', 'fermented tea leaves Thailand',
  'ancient tea tree Yunnan', 'Chin som northern Thailand'
];
for (const query of queries) {
  const params = new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:`filetype:bitmap ${query}`,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'extmetadata'});
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {headers:{'User-Agent':'JACR-Knowledge-Atlas/1.0'}});
  const json = await response.json();
  console.log(`\n## ${query}`);
  for (const page of Object.values(json.query?.pages || {})) {
    const description = String(page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,240);
    console.log(`${page.title.replace(/^File:/,'')} :: ${description}`);
  }
  await new Promise((resolve)=>setTimeout(resolve,5000));
}
