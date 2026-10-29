const fs = require('fs');
const file = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/components/TransactionRegistry.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('import { Button }')) {
  content = content.replace('import React, { useState, useMemo } from \'react\';', 'import React, { useState, useMemo } from \'react\';\nimport { Button } from \'@/components/ui/button\';');
}
function replaceBtn(pattern, replacement) { content = content.replace(pattern, replacement); }
replaceBtn(/<button[^>]*?onClick=\{\(\) => setDatePreset[^>]*?>([\s\S]*?)<\/button>/g, '<Button key={preset.id} variant={datePreset === preset.id ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setDatePreset(preset.id as any)} className=\"px-3 py-1.5 whitespace-nowrap\"></Button>');
replaceBtn(/<button[^>]*?onClick=\{handleExportCSV\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={handleExportCSV} className=\"gap-1.5\"></Button>');
replaceBtn(/<button[^>]*?onClick=\{onNewDocument\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button size=\"sm\" onClick={onNewDocument} className=\"gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white\"></Button>');
replaceBtn(/<button[^>]*?onClick=\{\(\) => onSelectDocument\(d\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={isSelected ? \'default\' : \'secondary\'} size=\"sm\" onClick={() => onSelectDocument(d)} className=\"gap-1 px-2.5 h-7 text-xs\"></Button>');
content = content.replace(/placeholder="Search by customer, invoice #, PIN, item..."/g, "placeholder=\"Search by client name, contract #, or invoice #...\"");
fs.writeFileSync(file, content);
