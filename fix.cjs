const fs = require('fs');

function processFile(file, replacer) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { Button }")) {
    content = content.replace("import React, { useState", "import { Button } from '@/components/ui/button';\nimport React, { useState");
  }
  content = replacer(content);
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

// 1. index.tsx
processFile('C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/index.tsx', (content) => {
  if (!content.includes('import CustomModal')) {
    content = content.replace("import { Button }", "import { Button }\nimport CustomModal from '@/components/ui/CustomModal';");
  }

  function replaceBtn(pattern, replacement) {
    content = content.replace(pattern, replacement);
  }

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('A4'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'A4\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'A4\')} className=\"gap-1.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('POS'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'POS\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'POS\')} className=\"gap-1.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('MOBILE'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'MOBILE\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'MOBILE\')} className=\"gap-1.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('REGISTRY'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'REGISTRY\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'REGISTRY\')} className=\"gap-1.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setIsEditorOpen\(true\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={() => setIsEditorOpen(true)} className=\"gap-1.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{handleExportPDF\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button size=\"sm\" onClick={handleExportPDF} disabled={isExportingPdf} className=\"gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{handleExportCSV\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={handleExportCSV} title=\"Export items to CSV\" className=\"gap-1 px-2.5\">$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{printDocument\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={printDocument} title=\"Print document directly\" className=\"gap-1 px-2.5\">$1</Button>');

  replaceBtn(/<button\s+key=\{d.metadata.id\}[^>]*?onClick=\{[\s\S]*?\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button key={d.metadata.id} variant={activeDoc.metadata.id === d.metadata.id ? \'default\' : \'outline\'} size=\"sm\" className=\"h-7 text-[11px] px-2.5\" onClick={() => { setActiveDoc(d); showToast(`Loaded ${d.seller.name}`); }}>$1</Button>');

  replaceBtn(/<button[^>]*?onClick=\{\(\) => setPosWidth\('80mm'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={posWidth === \'80mm\' ? \'secondary\' : \'ghost\'} size=\"sm\" className=\"h-6 text-[11px] px-2 py-0\" onClick={() => setPosWidth(\'80mm\')}>$1</Button>');
  replaceBtn(/<button[^>]*?onClick=\{\(\) => setPosWidth\('58mm'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={posWidth === \'58mm\' ? \'secondary\' : \'ghost\'} size=\"sm\" className=\"h-6 text-[11px] px-2 py-0\" onClick={() => setPosWidth(\'58mm\')}>$1</Button>');

  content = content.replace(/useState<'A4' \| 'POS' \| 'MOBILE' \| 'REGISTRY'>\('A4'\)/g, "useState<'A4' | 'POS' | 'MOBILE' | 'REGISTRY'>('REGISTRY')");

  if (!content.includes('export function DocumentGeneratorModal')) {
    content += '\n\nexport function DocumentGeneratorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {\n  return (\n    <CustomModal isOpen={isOpen} onClose={onClose} title=\"Generate Receipt or Invoice\" width=\"95vw\">\n      <div className=\"h-[85vh] overflow-y-auto rounded-xl border\">\n        <App />\n      </div>\n    </CustomModal>\n  );\n}\n';
  }
  
  return content;
});

// 2. TransactionRegistry.tsx
processFile('C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/components/TransactionRegistry.tsx', (content) => {
  if (!content.includes('import { Button }')) {
    content = content.replace("import React, { useState", "import { Button } from '@/components/ui/button';\nimport React, { useState");
  }

  function replaceBtn(pattern, replacement) { content = content.replace(pattern, replacement); }
  
  replaceBtn(/<button[^>]*?onClick=\{\(\) => setDatePreset[^>]*?>([\s\S]*?)<\/button>/g, '<Button key={preset.id} variant={datePreset === preset.id ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setDatePreset(preset.id as any)} className=\"px-3 py-1.5 whitespace-nowrap\">$1</Button>');
  replaceBtn(/<button[^>]*?onClick=\{handleExportCSV\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={handleExportCSV} className=\"gap-1.5\">$1</Button>');
  replaceBtn(/<button[^>]*?onClick=\{onNewDocument\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button size=\"sm\" onClick={onNewDocument} className=\"gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white\">$1</Button>');
  replaceBtn(/<button[^>]*?onClick=\{\(\) => onSelectDocument\(d\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={isSelected ? \'default\' : \'secondary\'} size=\"sm\" onClick={() => onSelectDocument(d)} className=\"gap-1 px-2.5 h-7 text-xs\">$1</Button>');
  
  content = content.replace(/placeholder="Search by customer, invoice #, PIN, item..."/g, "placeholder=\"Search by client name, contract #, or invoice #...\"");
  return content;
});

// 3. DocumentEditorModal.tsx
processFile('C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/components/DocumentEditorModal.tsx', (content) => {
  if (!content.includes('import { Button }')) {
    content = content.replace("import React, { useState", "import { Button } from '@/components/ui/button';\nimport React, { useState");
  }
  content = content.replace(/<button/g, '<Button');
  content = content.replace(/<\/button>/g, '</Button>');
  return content;
});

// 4. mockDocuments.ts
let mockFile = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/data/mockDocuments.ts';
let mockContent = fs.readFileSync(mockFile, 'utf8');
mockContent = mockContent.replace(/logoUrl: ''/g, "logoUrl: '/icons/logo.svg'");
mockContent = mockContent.replace(/logoUrl: '',/g, "logoUrl: '/icons/logo.svg',");
fs.writeFileSync(mockFile, mockContent);
console.log('Updated mock documents');
