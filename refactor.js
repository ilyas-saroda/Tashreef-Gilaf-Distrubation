const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.jsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Replacements for BulkDistribution.jsx & DistributionTable.jsx
  content = content.replace(/mnc-universal-card/g, 'mnc-card-global');
  content = content.replace(/mnc-universal-input/g, 'mnc-input-global');
  content = content.replace(/mnc-universal-th/g, 'mnc-table-th-global');

  // 2. Refit dark background wrappers to mnc-card-global or bg-white panels
  // For simplicity, we can replace bg-slate-900, bg-slate-950, bg-slate-800 wrappers with mnc-card-global where it's a wrapper,
  // or bg-white where it's a wrapper.
  content = content.replace(/bg-slate-950/g, 'bg-white');
  content = content.replace(/bg-slate-900\/50/g, 'bg-white');
  content = content.replace(/bg-slate-900/g, 'bg-white');
  content = content.replace(/bg-slate-800\/50/g, 'bg-slate-50');
  content = content.replace(/bg-slate-800\/60/g, 'bg-slate-50');
  content = content.replace(/bg-slate-800/g, 'bg-white');
  
  // 3. Text colors
  content = content.replace(/text-slate-200/g, 'text-slate-900');
  content = content.replace(/text-slate-300/g, 'text-slate-900');
  content = content.replace(/text-slate-400/g, 'text-slate-500');
  content = content.replace(/text-slate-100/g, 'text-slate-900');
  
  // 4. Border colors
  content = content.replace(/border-slate-800/g, 'border-slate-200');
  content = content.replace(/border-slate-700\/50/g, 'border-slate-200');
  content = content.replace(/border-slate-700/g, 'border-slate-200');

  // 5. Buttons and Actions
  // "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
  content = content.replace(/bg-blue-600 text-white shadow-lg shadow-blue-500\/20/g, 'mnc-btn-primary shadow-lg');
  content = content.replace(/bg-blue-600 hover:bg-blue-500 text-white/g, 'mnc-btn-primary');
  content = content.replace(/hover:bg-blue-600/g, 'hover:bg-blue-50');
  content = content.replace(/hover:bg-blue-500/g, 'hover:bg-blue-50');
  content = content.replace(/bg-blue-600 text-white shadow-md/g, 'mnc-btn-primary shadow-md');
  content = content.replace(/bg-blue-600 text-white/g, 'mnc-btn-primary');
  content = content.replace(/bg-blue-600/g, 'mnc-btn-primary');
  content = content.replace(/text-blue-400/g, 'text-blue-600');
  content = content.replace(/border-blue-500/g, 'border-blue-300');
  
  // Custom button styles in App.jsx and others
  content = content.replace(/bg-white text-slate-400 hover:bg-white border border-slate-200/g, 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200');

  // 6. Form input blocks and wrappers
  // "w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-300 transition-colors shadow-inner" -> mnc-input-global
  content = content.replace(/w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-300 transition-colors shadow-inner/g, 'mnc-input-global pl-9 pr-4 py-2 w-full');
  
  // Replace direct uses of text-white if they no longer apply
  // Wait, if we replace bg-slate-900 with bg-white, then text-white on the same element needs to become text-slate-900
  content = content.replace(/bg-white hover:bg-black text-white/g, 'mnc-btn-primary');
  content = content.replace(/hover:bg-slate-700/g, 'hover:bg-slate-100');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

walkDir('./frontend/src', processFile);
