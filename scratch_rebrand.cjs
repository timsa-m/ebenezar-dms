const fs = require('fs');
const path = require('path');

const rootDirs = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components'),
  path.join(__dirname, 'constants'),
  path.join(__dirname, 'lib'),
  path.join(__dirname, 'mobile-app'),
  path.join(__dirname, 'public'),
  path.join(__dirname, 'scripts'),
  path.join(__dirname, 'src'),
  path.join(__dirname, 'types'),
  path.join(__dirname, 'worker'),
  path.join(__dirname, 'EbenezarCar-Bazaar', 'src'),
  path.join(__dirname, 'EbenezarCar-Bazaar', 'public'),
];

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.html', '.css'];

const replaceMap = [
  { search: /El Elyon Capital & Credit solutions/gi, replace: 'Ebenezar Enterprises Car Bazaar' },
  { search: /El Elyon Capital & Credit Solutions/gi, replace: 'Ebenezar Enterprises Car Bazaar' },
  { search: /El Elyon Capital and Credit Solutions/gi, replace: 'Ebenezar Enterprises Car Bazaar' },
  { search: /El Elyon/gi, replace: 'Ebenezar' },
  { search: /logo\.svg/g, replace: 'logo.png' } // Replace logo.svg with logo.png
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('dist') || dir.includes('.git')) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (extensions.includes(ext)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        for (const rule of replaceMap) {
          if (rule.search.test(content)) {
            content = content.replace(rule.search, rule.replace);
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

// 1. Copy the logo
try {
  const sourceLogo = path.join(__dirname, 'public', 'icons', 'ebenezerlogo (1).png');
  const destLogo = path.join(__dirname, 'public', 'icons', 'logo.png');
  if (fs.existsSync(sourceLogo)) {
    fs.copyFileSync(sourceLogo, destLogo);
    console.log('Successfully copied the logo to public/icons/logo.png');
  } else {
    console.log('Source logo not found at: ' + sourceLogo);
  }
} catch (error) {
  console.error('Error copying logo:', error);
}

// 2. Perform replacements
for (const dir of rootDirs) {
  processDir(dir);
}

// Check root level files
const rootFiles = ['README.md', 'worker.ts'];
for (const file of rootFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    for (const rule of replaceMap) {
      if (rule.search.test(content)) {
        content = content.replace(rule.search, rule.replace);
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Updated ${fullPath}`);
    }
  }
}

console.log('Rebranding complete.');
