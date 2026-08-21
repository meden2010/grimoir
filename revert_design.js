const fs = require('fs');

let html = fs.readFileSync('src/report/template.html', 'utf8');

// 1. Glassmorphism
html = html.replace(/bg-surface-container-lowest\/80 backdrop-blur-md/g, 'bg-surface-container-lowest');

// 2. Empty State
const oldEmptyState = `                <div id="emptyState" class="absolute inset-0 flex flex-col items-center justify-center text-outline bg-surface-container-lowest/80 backdrop-blur-md z-10 transition-opacity duration-300">
                  <span class="material-symbols-outlined text-4xl mb-4 opacity-50">data_object</span>
                  <p class="font-body text-sm">Select a test from the left panel to view its execution details.</p>
                </div>`;
const newEmptyState = `                <div id="emptyState" class="absolute inset-0 flex flex-col items-center justify-center text-outline bg-surface-container-lowest/80 backdrop-blur-md z-10 transition-opacity duration-300">
                  <span class="material-symbols-outlined text-6xl text-primary/40 animate-float mb-4" style="filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4));">auto_awesome</span>
                  <p class="font-body text-lg text-on-surface-variant font-medium">Select a test to reveal its details</p>
                </div>`;
html = html.replace(newEmptyState, oldEmptyState); // Reverted, but wait! The original didn't have bg-surface-container-lowest/80, it had bg-surface-container-lowest because I replaced the glassmorphism BEFORE the empty state.
// Let's just fix the whole block using regex or a simpler replacement for the empty state
const emptyStateReverted = `                <div id="emptyState" class="absolute inset-0 flex flex-col items-center justify-center text-outline bg-surface-container-lowest z-10 transition-opacity duration-300">
                  <span class="material-symbols-outlined text-4xl mb-4 opacity-50">data_object</span>
                  <p class="font-body text-sm">Select a test from the left panel to view its execution details.</p>
                </div>`;
// The empty state in current file actually looks like this because of glassmorphism replacement applied earlier!
// It currently has `bg-surface-container-lowest z-10` because I already reverted glassmorphism on line 6!
html = html.replace(/<div id="emptyState"[\s\S]*?<\/div>/, emptyStateReverted);


// 3. Badges Glow
const oldBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/30" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"}`;';
const newBadgeLogic = 'badge.className = `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isFailed ? "bg-error/10 text-error border-error/30 shadow-[0_0_8px_rgba(255,84,73,0.3)]" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.3)]"}`;';
html = html.replace(newBadgeLogic, oldBadgeLogic);

// 4. Smooth transitions on openTestDetails
const oldShowDetails = `document.getElementById("emptyState").classList.add("opacity-0", "pointer-events-none");`;
const newShowDetails = `document.getElementById("emptyState").classList.add("opacity-0", "pointer-events-none");
          const detailsPanelHeader = document.querySelector("#detailsPanel > div:first-child");
          if(detailsPanelHeader) {
            detailsPanelHeader.classList.remove("animate-fade-in-up");
            void detailsPanelHeader.offsetWidth;
            detailsPanelHeader.classList.add("animate-fade-in-up");
          }`;
html = html.replace(newShowDetails, oldShowDetails);

// 5. Active Filters Glow
const oldFilterActive = 'btn.classList.add("border-primary/40", "bg-primary/20", "text-primary");';
const newFilterActive = 'btn.classList.add("border-primary/40", "bg-primary/20", "text-primary", "shadow-[0_0_10px_rgba(139,92,246,0.3)]");';
html = html.replace(newFilterActive, oldFilterActive);

const oldFilterInactive = 'btn.classList.remove("border-primary/40", "bg-primary/20", "text-primary");';
const newFilterInactive = 'btn.classList.remove("border-primary/40", "bg-primary/20", "text-primary", "shadow-[0_0_10px_rgba(139,92,246,0.3)]");';
html = html.replace(newFilterInactive, oldFilterInactive);

const oldInitialActiveHtml = 'class="auto-filter-btn active flex-1 py-1 rounded text-[10px] font-label-caps font-semibold border border-primary/40 bg-primary/20 text-primary transition-all whitespace-nowrap"';
const newInitialActiveHtml = 'class="auto-filter-btn active flex-1 py-1 rounded text-[10px] font-label-caps font-semibold border border-primary/40 bg-primary/20 text-primary shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all whitespace-nowrap"';
html = html.replace(newInitialActiveHtml, oldInitialActiveHtml);


fs.writeFileSync('src/report/template.html', html, 'utf8');
console.log('Design changes REVERTED successfully!');
