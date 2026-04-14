const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'public', 'extension.zip');
const placeholder = [
  'This is a bootstrap placeholder for the packaged extension.',
  'Task 1 only guarantees the package script target exists.'
].join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${placeholder}\n`, 'utf8');

console.log(`Created placeholder package at ${outputPath}`);
