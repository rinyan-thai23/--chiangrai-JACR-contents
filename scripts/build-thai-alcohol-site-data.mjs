import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'tsv-knowledge', '004.タイ産アルコール・地酒ブランド.tsv');
const output = path.join(root, 'site', '004-thai-alcohol', 'alcohol-data.js');
const lines = fs.readFileSync(input, 'utf8').trim().split(/\r?\n/);
const headers = lines.shift().split('\t');
const records = lines.map(line => Object.fromEntries(line.split('\t').map((value, index) => [headers[index], value])));
fs.writeFileSync(output, `window.alcoholItems=${JSON.stringify(records, null, 2)};\n`, 'utf8');
console.log(`Wrote ${records.length} records: ${output}`);
