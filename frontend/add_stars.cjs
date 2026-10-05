const fs = require('fs');

function addStars(filepath, skipTexts = []) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  const replacer = (match, startTag, text, endTag) => {
    if (skipTexts.includes(text.trim()) || text.includes('<span')) {
      return match;
    }
    if (text.includes('<div') || text.includes('<input') || text.includes('<svg')) {
      return match;
    }
    return `${startTag}${text} <span className="text-red-500">*</span>${endTag}`;
  };
  
  content = content.replace(/(<label[^>]*>)([\s\S]*?)(<\/label>)/g, replacer);
  fs.writeFileSync(filepath, content);
}

addStars('src/pages/Register.tsx', ['Bio (Optional)', 'Remember me']);
addStars('src/pages/Login.tsx', ['Remember me']);
addStars('src/pages/ForgotPassword.tsx', ['Remember me']);

console.log('Stars added.');
