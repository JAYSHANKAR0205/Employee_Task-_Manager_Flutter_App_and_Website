const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// This script will transform the current broken theme into a True Dark Mode setup.
// It restores the original design as the "Light/Default" mode,
// and maps it to a true dark mode (Black/Gray) for the "Dark" mode.
const replacements = [
  // Restore outer background
  { regex: /\bbg-gray-100 dark:bg-mint\b/g, replacement: 'bg-mint dark:bg-gray-950' },
  
  // Restore card background
  { regex: /\bbg-white dark:bg-forest\b/g, replacement: 'bg-forest dark:bg-gray-900' },
  
  // Restore texts
  { regex: /\btext-gray-900 dark:text-white\b/g, replacement: 'text-white' },
  { regex: /\btext-forest dark:text-sand\b/g, replacement: 'text-sand' },
  { regex: /\btext-white dark:text-forest\b/g, replacement: 'text-forest' },
  
  // Restore text with opacities
  { regex: /\btext-gray-900\/([0-9]+) dark:text-white\/([0-9]+)\b/g, replacement: 'text-white/$1' },
  { regex: /\btext-gray-500 dark:text-white\/60\b/g, replacement: 'text-white/60' },
  { regex: /\btext-gray-600 dark:text-white\/80\b/g, replacement: 'text-white/80' },
  { regex: /\btext-gray-500 dark:text-white\/70\b/g, replacement: 'text-white/70' },
  { regex: /\btext-gray-400 dark:text-white\/50\b/g, replacement: 'text-white/50' },
  { regex: /\btext-gray-400 dark:text-white\/40\b/g, replacement: 'text-white/40' },
  
  // Restore inputs and borders
  { regex: /\bbg-gray-50 dark:bg-white\/([0-9]+)\b/g, replacement: 'bg-white/$1' },
  { regex: /\bborder-gray-200 dark:border-white\/([0-9]+)\b/g, replacement: 'border-white/$1' },
  { regex: /\bring-gray-200 dark:ring-white\/([0-9]+)\b/g, replacement: 'ring-white/$1' },
  
  // Restore placeholders
  { regex: /\bplaceholder-gray-500 dark:placeholder-white\/([0-9]+)\b/g, replacement: 'placeholder-white/$1' },
  
  // Restore hovers
  { regex: /\bhover:bg-gray-100 dark:hover:bg-white\/([0-9]+)\b/g, replacement: 'hover:bg-white/$1' },
  { regex: /\bhover:text-gray-700 dark:hover:text-white\b/g, replacement: 'hover:text-white' },
  { regex: /\bhover:text-red-700 dark:hover:text-red-300\b/g, replacement: 'hover:text-red-300' },
  
  // Restore from-black
  { regex: /\bfrom-gray-200\/([0-9]+) dark:from-black\/([0-9]+)\b/g, replacement: 'from-black/$1' },
  { regex: /\bbg-gray-800\/([0-9]+) dark:bg-black\/([0-9]+)\b/g, replacement: 'bg-black/$1' },
  
  // Restore red text
  { regex: /\btext-red-600 dark:text-red-400\b/g, replacement: 'text-red-400' },
  
  // Restore peers
  { regex: /\bpeer-checked:border-forest dark:peer-checked:border-sand\b/g, replacement: 'peer-checked:border-sand' },
  { regex: /\bpeer-checked:bg-forest dark:peer-checked:bg-sand\b/g, replacement: 'peer-checked:bg-sand' },
  { regex: /\bgroup-hover:border-forest dark:group-hover:border-sand\b/g, replacement: 'group-hover:border-sand' },
  { regex: /\bgroup-hover:text-forest dark:group-hover:text-sand\b/g, replacement: 'group-hover:text-sand' }
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
