const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const extensionDir = path.join(__dirname, '..', 'extension');
const outputDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(outputDir, 'extension.zip');

fs.mkdirSync(outputDir, { recursive: true });

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

execSync(`cd "${extensionDir}" && zip -r "${outputPath}" . -x ".*"`, {
  stdio: 'inherit'
});

const stats = fs.statSync(outputPath);
console.log(`Extension packaged: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
