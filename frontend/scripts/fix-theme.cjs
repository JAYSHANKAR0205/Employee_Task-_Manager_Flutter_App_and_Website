const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Fix the overlapping regex mistakes from the previous run
const replacements = [
  // Fix text-sand chain: text-white dark:text-forest dark:text-sand -> text-forest dark:text-sand
  { regex: /\btext-white dark:text-forest dark:text-sand\b/g, replacement: 'text-forest dark:text-sand' },
  
  // Also check if any other chained replacements happened. 
  // group-hover:text-sand -> group-hover:text-forest dark:group-hover:text-sand. Did group-hover:text-forest get chained? No rule for it.
  
  // The input placeholder was originally `placeholder-white/40`.
  // My script did `text-white\/([0-9]+)` -> `text-gray-900/$1 dark:text-white/$1`.
  // Wait, `placeholder-white/40` wasn't matched by `text-white/40`!
  // Ah! `placeholder-white/40` was completely UNTOUCHED by my script!
  // So it remained `placeholder-white/40`!
  // `placeholder-white/40` in light mode is white on a white background. Invisible!
  { regex: /\bplaceholder-white\/([0-9]+)\b/g, replacement: 'placeholder-gray-500 dark:placeholder-white/$1' },
  
  // Did I miss any other `white` things?
  // `border-white/40` -> `border-gray-200 dark:border-white/40` (I only did `border-white\/([0-9]+)`)
  
  // `ring-white`?
  { regex: /\bring-white\/([0-9]+)\b/g, replacement: 'ring-gray-200 dark:ring-white/$1' },
  
  // Let's also check for plain `text-white` that was inside a string and not caught?
  // No, `\btext-white\b` caught them all.
  
  // Let's fix `bg-white/5` which was replaced with `bg-gray-50 dark:bg-white/5`.
  // This is fine. But maybe we need a border? `border border-gray-200 dark:border-white/20`.
  
  // What about `text-white/60`?
  // `text-white/60` -> `text-gray-900/60 dark:text-white/60`.
  // Wait, `text-gray-900/60` is valid in Tailwind v3, but maybe it's `text-gray-500` they want?
  // Let's replace `text-gray-900/60` with `text-gray-500`.
  { regex: /\btext-gray-900\/60 dark:text-white\/60\b/g, replacement: 'text-gray-500 dark:text-white/60' },
  { regex: /\btext-gray-900\/80 dark:text-white\/80\b/g, replacement: 'text-gray-600 dark:text-white/80' },
  { regex: /\btext-gray-900\/70 dark:text-white\/70\b/g, replacement: 'text-gray-500 dark:text-white/70' },
  { regex: /\btext-gray-900\/50 dark:text-white\/50\b/g, replacement: 'text-gray-400 dark:text-white/50' },
  { regex: /\btext-gray-900\/40 dark:text-white\/40\b/g, replacement: 'text-gray-400 dark:text-white/40' },
  
  // The login hover underline issue might have been brought back? No, I used literal classes.
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
