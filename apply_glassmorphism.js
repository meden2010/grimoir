const fs = require('fs');

let html = fs.readFileSync('src/report/template.html', 'utf8');

// 1. Glassmorphism: bg-surface-container-lowest -> bg-surface-container-lowest/80 backdrop-blur-md
html = html.replace(/bg-surface-container-lowest(?!.*?\/80)/g, 'bg-surface-container-lowest/80 backdrop-blur-md');

fs.writeFileSync('src/report/template.html', html, 'utf8');
console.log('Glassmorphism applied successfully!');
