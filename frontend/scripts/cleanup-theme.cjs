const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const cleanupMap = {
  // Fix double darks
  'bg-gray-100 dark:bg-mint dark:bg-gray-950': 'bg-gray-100 dark:bg-mint',
  'bg-white dark:bg-forest dark:bg-gray-900': 'bg-white dark:bg-forest',
  
  // Fix button bg
  'bg-white dark:bg-forest dark:bg-sand': 'bg-forest dark:bg-sand',
  
  // Fix text colors with double darks
  'text-gray-900 dark:text-gray-500 dark:text-white/50': 'text-gray-500 dark:text-white/50',
  'text-gray-900 dark:text-gray-900 dark:text-white/80': 'text-gray-700 dark:text-white/80',
  
  // CustomSelect dropdown hover
  'bg-gray-100 dark:bg-white/10 dark:hover:bg-white/10': 'hover:bg-gray-100 dark:hover:bg-white/10',
  
  // Register text-red-600 dark:text-red-400 (this is correct, wait)
  
  // ThemeToggle double darks
  'bg-gray-100 dark:bg-white/10 dark:bg-black/20': 'bg-gray-100 dark:bg-black/20',
  'text-white dark:text-forest dark:bg-forest dark:text-sand': 'text-white dark:text-forest dark:bg-gray-900',
  
  // Any others?
  'text-gray-900 dark:text-white/60': 'text-gray-500 dark:text-white/60',
  'text-gray-900 dark:text-white/80': 'text-gray-700 dark:text-white/80'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let original = content;
      for (const [bad, good] of Object.entries(cleanupMap)) {
        content = content.split(bad).join(good);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned ${fullPath}`);
      }
    }
  }
}

walk(srcDir);
