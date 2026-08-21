const fs = require('fs');

let html = fs.readFileSync('src/report/template.html', 'utf8');

// 1. Revert the dark glassmorphism back to the solid dark color
html = html.replace(/bg-white\/\[0\.03\] backdrop-blur-2xl shadow-2xl/g, 'bg-surface-container-lowest/80 backdrop-blur-md');
// Wait, actually earlier I replaced `bg-surface-container-lowest/80 backdrop-blur-md` with the new one. 
// BUT, the original color is just `bg-surface-container-lowest`.
// I should replace BOTH possibilities to be safe.
html = html.replace(/bg-white\/\[0\.03\] backdrop-blur-2xl shadow-2xl/g, 'bg-surface-container-lowest');
html = html.replace(/bg-surface-container-lowest\/80 backdrop-blur-md/g, 'bg-surface-container-lowest');


// 2. Remove ambient glowing orbs behind the page
const bodyStart = '<body\n    class="bg-surface text-on-surface font-body font-body-md relative overflow-x-hidden min-h-screen selection:bg-primary/30"\n  >';
const bodyWithOrbs = bodyStart + `
    <!-- Ambient Glowing Orbs for Glassmorphism Contrast -->
    <div class="fixed top-[-10%] left-[-10%] w-[40%] h-[50%] bg-primary/20 rounded-full blur-[140px] pointer-events-none z-[-1] mix-blend-screen" aria-hidden="true"></div>
    <div class="fixed bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-secondary/10 rounded-full blur-[140px] pointer-events-none z-[-1] mix-blend-screen" aria-hidden="true"></div>
`;

html = html.replace(bodyWithOrbs, bodyStart);


fs.writeFileSync('src/report/template.html', html, 'utf8');
console.log('Strong glassmorphism reverted successfully!');
