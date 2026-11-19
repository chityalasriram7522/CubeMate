import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Ensure .nojekyll exists in dist, docs, and root
fs.writeFileSync('dist/.nojekyll', '');
if (!fs.existsSync('docs')) fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/.nojekyll', '');
fs.writeFileSync('.nojekyll', '');

// 2. Clean old hashed JS bundles in assets/ and docs/assets/
const distAssets = fs.existsSync('dist/assets') ? fs.readdirSync('dist/assets') : [];
['assets', 'docs/assets'].forEach(targetDir => {
  if (!fs.existsSync(targetDir)) return;
  const files = fs.readdirSync(targetDir);
  files.forEach(f => {
    if (f.endsWith('.js') && !distAssets.includes(f)) {
      try {
        fs.unlinkSync(path.join(targetDir, f));
      } catch (e) {}
    }
  });
});

// 3. Sync dist/ to docs/
copyDir('dist', 'docs');

// 4. Sync dist/assets to root assets/
copyDir('dist/assets', 'assets');

// 5. Copy dist/index.html to root index.html
fs.copyFileSync('dist/index.html', 'index.html');

console.log('✓ Successfully synced build assets across dist/, docs/, and root!');
