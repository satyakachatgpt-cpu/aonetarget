import fs from 'fs';

const filePath = 'server.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Delete lines from 4701 to 4924 (1-indexed)
// 0-indexed: lines 4700 to 4923
const start = 4700;
const end = 4923;

lines.splice(start, end - start + 1);

fs.writeFileSync(filePath, lines.join('\n'));
console.log(`Successfully deleted corrupted lines from 4701 to 4924`);
