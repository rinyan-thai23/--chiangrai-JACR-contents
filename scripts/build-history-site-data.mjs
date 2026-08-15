import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'tsv-knowledge','002.タイの歴史.tsv');
const output=path.join(root,'site','002-thai-history','history-data.js');
const text=fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'').trim();
const [header,...lines]=text.split(/\r?\n/);
const fields=header.split('\t');
const rows=lines.map(line=>Object.fromEntries(fields.map((field,index)=>[field,line.split('\t')[index]??''])));
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,`// Generated from 002.タイの歴史.tsv — do not edit by hand.\nwindow.historyEntries=${JSON.stringify(rows,null,2)};\n`,'utf8');
console.log(`Wrote ${rows.length} entries to ${output}`);
