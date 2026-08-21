const fs = require('fs');

let html = fs.readFileSync('src/report/template.html', 'utf8');

// 2. Badges Glow (in openTestDetails)
const oldBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/30" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"}`;';
const newBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/30 shadow-[0_0_8px_rgba(255,84,73,0.4)]" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.4)]"}`;';
html = html.replace(oldBadgeLogic, newBadgeLogic);

// Wait, the badges in the automated rows (the list on the left) also have badges!
// Line 83: <span class="inline-flex items-center gap-1 px-2 py-0.5 ${typeColor} text-[10px] font-bold rounded-full border">
// But those are for "Automated" or "Performance", maybe they don't need the glow. The glow is specifically for PASSED/FAILED.
// Let's add glow to the actual status badges in the right panel.

fs.writeFileSync('src/report/template.html', html, 'utf8');
console.log('Neon indicators (Glow) applied successfully!');
