const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Exact class replacements
const classMap = {
  // Backgrounds
  'bg-mint': 'bg-gray-100 dark:bg-mint',
  'bg-forest': 'bg-white dark:bg-forest',
  'bg-sand': 'bg-forest dark:bg-sand',
  'bg-white/5': 'bg-gray-50 dark:bg-white/5',
  'hover:bg-white/10': 'hover:bg-gray-100 dark:hover:bg-white/10',
  'bg-white/10': 'bg-gray-100 dark:bg-white/10',
  'hover:bg-white/5': 'hover:bg-gray-100 dark:hover:bg-white/5',
  
  // Texts
  'text-white': 'text-gray-900 dark:text-white',
  'text-sand': 'text-forest dark:text-sand',
  'text-forest': 'text-white dark:text-forest',
  'text-white/40': 'text-gray-400 dark:text-white/40',
  'text-white/50': 'text-gray-500 dark:text-white/50',
  'text-white/60': 'text-gray-500 dark:text-white/60',
  'text-white/70': 'text-gray-600 dark:text-white/70',
  'text-white/80': 'text-gray-700 dark:text-white/80',
  'text-red-400': 'text-red-600 dark:text-red-400',
  'hover:text-white': 'hover:text-gray-900 dark:hover:text-white',
  'hover:text-red-300': 'hover:text-red-700 dark:hover:text-red-300',
  
  // Borders
  'border-white/20': 'border-gray-300 dark:border-white/20',
  'border-white/30': 'border-gray-300 dark:border-white/30',
  'border-white/40': 'border-gray-400 dark:border-white/40',
  'border-sand/30': 'border-forest/30 dark:border-sand/30',
  'focus-within:border-sand': 'focus-within:border-forest dark:focus-within:border-sand',
  
  // Placeholders
  'placeholder-white/30': 'placeholder-gray-400 dark:placeholder-white/30',
  'placeholder-white/40': 'placeholder-gray-400 dark:placeholder-white/40',
  'placeholder-white/50': 'placeholder-gray-500 dark:placeholder-white/50',
  
  // Checkbox/Peers
  'peer-checked:border-sand': 'peer-checked:border-forest dark:peer-checked:border-sand',
  'peer-checked:bg-sand': 'peer-checked:bg-forest dark:peer-checked:bg-sand',
  'group-hover:border-sand': 'group-hover:border-forest dark:group-hover:border-sand',
  'group-hover:text-sand': 'group-hover:text-forest dark:group-hover:text-sand',
  
  // Shadows & Rings (CustomCountrySelect)
  'shadow-[0_0_0_1px_rgba(255,255,255,0.1)]': 'shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
};

function processFile(content) {
  // We use a regex that matches valid Tailwind class characters
  // Tailwind classes can contain letters, numbers, hyphens, slashes, brackets, colons, percent signs
  const classRegex = /[a-zA-Z0-9\-\/\:\[\]\(\)\.\,\%]+/g;
  
  return content.replace(classRegex, (match) => {
    if (classMap[match]) {
      return classMap[match];
    }
    return match;
  });
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const newContent = processFile(content);
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

// First, we need to revert the Dark Mode classes that were added in the PREVIOUS step,
// otherwise the script will map `bg-mint` -> `bg-gray-100 dark:bg-mint`
// BUT `bg-gray-950` is also in the file!
// Ah wait, I ran revert-theme.cjs which restored everything to original. So the files are clean!
// Wait! I did NOT restore AuthPage.tsx perfectly?
// Let's check AuthPage.tsx in the last read.
// `bg-mint dark:bg-gray-950`.
// So it STILL has `dark:bg-gray-950` because my revert script ADDED it!
// If I run my new script now, it will see `bg-mint` and replace it with `bg-gray-100 dark:bg-mint`.
// So it will become `bg-gray-100 dark:bg-mint dark:bg-gray-950`. This is bad!
// I must first strip out the `dark:` classes I added in revert-theme.cjs.

function stripTrueDarkMode(content) {
  // Strip the ones I explicitly added in revert-theme.cjs
  let s = content;
  s = s.replace(/bg-mint dark:bg-gray-950/g, 'bg-mint');
  s = s.replace(/bg-forest dark:bg-gray-900/g, 'bg-forest');
  return s;
}

function walkStrip(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkStrip(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const stripped = stripTrueDarkMode(content);
      if (stripped !== content) {
        fs.writeFileSync(fullPath, stripped, 'utf8');
      }
    }
  }
}

// 1. Strip true dark mode
walkStrip(srcDir);

// 2. Apply perfect mapping
walk(srcDir);
