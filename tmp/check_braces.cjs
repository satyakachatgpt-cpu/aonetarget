const fs = require('fs');

const content = fs.readFileSync('server/server.js', 'utf8');
const lines = content.split('\n');

let openBraces = [];

lines.forEach((line, index) => {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '{') {
      openBraces.push(index + 1);
    } else if (line[i] === '}') {
      if (openBraces.length === 0) {
        console.log(`Unmatched closing brace at line ${index + 1}`);
      } else {
        openBraces.pop();
      }
    }
  }
});

if (openBraces.length > 0) {
  console.log('Unmatched opening braces at lines:', openBraces);
} else {
  console.log('All braces matched.');
}
