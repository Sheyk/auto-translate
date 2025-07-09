const fs = require('fs');
const path = require('path');

// Copy ESM files from dist-esm to dist with .mjs extension
function copyEsmFiles(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyEsmFiles(srcPath, path.join(destDir, file));
    } else if (file.endsWith('.js')) {
      const destPath = path.join(destDir, file.replace('.js', '.mjs'));
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy main index.js as index.mjs
if (fs.existsSync('dist-esm/index.js')) {
  copyEsmFiles('dist-esm', 'dist');
}

// Cleanup dist-esm directory
if (fs.existsSync('dist-esm')) {
  fs.rmSync('dist-esm', { recursive: true, force: true });
}

console.log('✅ ESM build completed'); 