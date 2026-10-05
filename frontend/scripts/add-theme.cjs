const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// A mapping of dark classes to their light+dark equivalents
const replacements = [
  { regex: /\bbg-mint\b/g, replacement: 'bg-gray-100 dark:bg-mint' },
  { regex: /\bbg-forest\b/g, replacement: 'bg-white dark:bg-forest' },
  { regex: /\btext-sand\b/g, replacement: 'text-forest dark:text-sand' },
  { regex: /\bbg-sand\b/g, replacement: 'bg-forest dark:bg-sand' },
  { regex: /\btext-white\b/g, replacement: 'text-gray-900 dark:text-white' },
  { regex: /\btext-white\/([0-9]+)\b/g, replacement: 'text-gray-900/$1 dark:text-white/$1' },
  { regex: /\btext-forest\b/g, replacement: 'text-white dark:text-forest' },
  { regex: /\bbg-white\/([0-9]+)\b/g, replacement: 'bg-gray-50 dark:bg-white/$1' },
  { regex: /\bborder-white\/([0-9]+)\b/g, replacement: 'border-gray-200 dark:border-white/$1' },
  { regex: /\bhover:bg-white\/([0-9]+)\b/g, replacement: 'hover:bg-gray-100 dark:hover:bg-white/$1' },
  { regex: /\bhover:text-white\b/g, replacement: 'hover:text-gray-700 dark:hover:text-white' },
  { regex: /\bfrom-black\/([0-9]+)\b/g, replacement: 'from-gray-200/$1 dark:from-black/$1' },
  { regex: /\bbg-black\/([0-9]+)\b/g, replacement: 'bg-gray-800/$1 dark:bg-black/$1' },
  { regex: /\btext-red-400\b/g, replacement: 'text-red-600 dark:text-red-400' },
  { regex: /\bhover:text-red-300\b/g, replacement: 'hover:text-red-700 dark:hover:text-red-300' },
  { regex: /\bpeer-checked:border-sand\b/g, replacement: 'peer-checked:border-forest dark:peer-checked:border-sand' },
  { regex: /\bpeer-checked:bg-sand\b/g, replacement: 'peer-checked:bg-forest dark:peer-checked:bg-sand' },
  { regex: /\bgroup-hover:border-sand\b/g, replacement: 'group-hover:border-forest dark:group-hover:border-sand' },
  { regex: /\bgroup-hover:text-sand\b/g, replacement: 'group-hover:text-forest dark:group-hover:text-sand' }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walk(srcDir);
