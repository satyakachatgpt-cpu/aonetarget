const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Replace calculateStreamStatus
const fnOpen = 'function calculateStreamStatus(item) {';
if (content.includes(fnOpen)) {
  content = content.replace(/function calculateStreamStatus\(item\) \{[\s\S]*?return 'ended';\s*\n\s*\}/, 
`function calculateStreamStatus(item) {
  if (['ended', 'inactive', 'completed'].includes(item.status)) return 'ended';
  if (item.status === 'live') return 'live';
  return item.status || 'upcoming';
}`);
}

// Replace inline calculation block 1 (var status)
const inline1 = `      let status = item.status || 'upcoming';
      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        status = 'ended';
      } else if (now < joinTime) {
        status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        status = 'live';
      } else {
        status = 'ended';
      }`;

const replacement1 = `      let status = item.status || 'upcoming';
      if (['inactive', 'ended', 'completed'].includes(item.status)) status = 'ended';`;

content = content.replace(new RegExp(inline1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement1);

// Replace inline calculation block 2 (item.status mutation)
const inline2 = `      if (item.status === 'inactive' || item.status === 'ended' || item.status === 'completed') {
        item.status = 'ended';
      } else if (now < joinTime) {
        item.status = 'upcoming';
      } else if (now >= joinTime && now <= endTime) {
        item.status = 'live';
      } else {
        item.status = 'ended';
      }`;

const replacement2 = `      if (['inactive', 'ended', 'completed'].includes(item.status)) {
        item.status = 'ended';
      } else {
        item.status = item.status || 'upcoming';
      }`;

content = content.replace(new RegExp(inline2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement2);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Replacements done!');
