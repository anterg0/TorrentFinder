const fs = require('fs');

console.log('🔧 Fixing CSS styling issues...\n');

// Check and fix CSS import issue
const cssFile = 'styles/globals.css';

if (!fs.existsSync(cssFile)) {
  console.log('❌ styles/globals.css not found!');
  process.exit(1);
}

const cssContent = fs.readFileSync(cssFile, 'utf8');

if (!cssContent.includes('@import "tailwindcss"')) {
  console.log('🔧 Adding missing Tailwind CSS import...');
  const fixedCss = '@import "tailwindcss";\n\n' + cssContent;
  fs.writeFileSync(cssFile, fixedCss);
  console.log('✅ Added @import "tailwindcss"; to globals.css');
} else {
  console.log('✅ CSS imports are already correct');
}

// Check if main.tsx imports the CSS
const mainTsxPath = 'src/main.tsx';
if (fs.existsSync(mainTsxPath)) {
  const mainContent = fs.readFileSync(mainTsxPath, 'utf8');
  if (mainContent.includes("import '../styles/globals.css'")) {
    console.log('✅ CSS is properly imported in main.tsx');
  } else {
    console.log('⚠️  Warning: CSS import not found in main.tsx');
  }
} else {
  console.log('⚠️  Warning: src/main.tsx not found');
}

console.log('\n🎉 CSS fix complete!');
console.log('💡 If you still see styling issues:');
console.log('   1. Hard refresh your browser (Ctrl+Shift+R)');
console.log('   2. Restart the dev server (npm run dev)');
console.log('   3. Clear browser cache');
console.log('   4. Check browser console for errors');