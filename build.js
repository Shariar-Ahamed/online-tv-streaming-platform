const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Clean and create www
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// 2. Files to copy
const filesToCopy = [
  'index.html',
  'script.js',
  'style.css',
  'channels.m3u',
  'IP-TV.m3u',
  'LICENSE'
];

for (const file of filesToCopy) {
  const srcFile = path.join(srcDir, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(destDir, file));
    console.log(`Copied ${file} to www/`);
  }
}

// 3. Folders to copy
const foldersToCopy = ['logo'];
for (const folder of foldersToCopy) {
  const srcFolder = path.join(srcDir, folder);
  if (fs.existsSync(srcFolder)) {
    copyDirSync(srcFolder, path.join(destDir, folder));
    console.log(`Copied directory ${folder} to www/`);
  }
}

console.log('Build completed! Files are in the www/ directory.');
