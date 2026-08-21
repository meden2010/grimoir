const fs = require('fs');

let html = fs.readFileSync('src/report/template.html', 'utf8');

// 2. Badges Glow - Make it MUCH more obvious
// Previous: shadow-[0_0_8px_rgba(255,84,73,0.4)]
// New: shadow-[0_0_15px_rgba(255,84,73,0.8)] border-error/60
const oldBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/30 shadow-[0_0_8px_rgba(255,84,73,0.4)]" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.4)]"}`;';
const newBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/60 shadow-[0_0_16px_rgba(255,84,73,0.8)]" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.8)]"}`;';
html = html.replace(oldBadgeLogic, newBadgeLogic);

// Let's also add it to the large cards at the top when hovering maybe? Or just keep it on the badges to see if they notice.

fs.writeFileSync('src/report/template.html', html, 'utf8');
console.log('Stronger neon indicators applied successfully!');
