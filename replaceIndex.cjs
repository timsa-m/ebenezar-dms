const fs = require('fs');
const file = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/index.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { Button }')) {
  content = content.replace('import React, { useState } from \'react\';', 'import React, { useState } from \'react\';\nimport { Button } from \'@/components/ui/button\';\nimport CustomModal from \'@/components/ui/CustomModal\';');
}

function replaceBtn(pattern, replacement) {
  content = content.replace(pattern, replacement);
}

replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('A4'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'A4\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'A4\')} className=\"gap-1.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('POS'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'POS\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'POS\')} className=\"gap-1.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('MOBILE'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'MOBILE\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'MOBILE\')} className=\"gap-1.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{\(\) => setActiveLayout\('REGISTRY'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={activeLayout === \'REGISTRY\' ? \'default\' : \'ghost\'} size=\"sm\" onClick={() => setActiveLayout(\'REGISTRY\')} className=\"gap-1.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{\(\) => setIsEditorOpen\(true\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={() => setIsEditorOpen(true)} className=\"gap-1.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{handleExportPDF\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button size=\"sm\" onClick={handleExportPDF} disabled={isExportingPdf} className=\"gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{handleExportCSV\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={handleExportCSV} title=\"Export items to CSV\" className=\"gap-1 px-2.5\"></Button>');

replaceBtn(/<button[^>]*?onClick=\{printDocument\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant=\"outline\" size=\"sm\" onClick={printDocument} title=\"Print document directly\" className=\"gap-1 px-2.5\"></Button>');

replaceBtn(/<button\s+key=\{d.metadata.id\}[^>]*?onClick=\{[\s\S]*?\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button key={d.metadata.id} variant={activeDoc.metadata.id === d.metadata.id ? \'default\' : \'outline\'} size=\"sm\" className=\"h-7 text-[11px] px-2.5\" onClick={() => { setActiveDoc(d); showToast(\Loaded \\); }}></Button>');

replaceBtn(/<button[^>]*?onClick=\{\(\) => setPosWidth\('80mm'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={posWidth === \'80mm\' ? \'secondary\' : \'ghost\'} size=\"sm\" className=\"h-6 text-[11px] px-2 py-0\" onClick={() => setPosWidth(\'80mm\')}></Button>');
replaceBtn(/<button[^>]*?onClick=\{\(\) => setPosWidth\('58mm'\)\}[^>]*?>([\s\S]*?)<\/button>/g, '<Button variant={posWidth === \'58mm\' ? \'secondary\' : \'ghost\'} size=\"sm\" className=\"h-6 text-[11px] px-2 py-0\" onClick={() => setPosWidth(\'58mm\')}></Button>');

content = content.replace(/useState<'A4' \| 'POS' \| 'MOBILE' \| 'REGISTRY'>\('A4'\)/g, "useState<'A4' | 'POS' | 'MOBILE' | 'REGISTRY'>('REGISTRY')");

if (!content.includes('export function DocumentGeneratorModal')) {
  content += '\n\nexport function DocumentGeneratorModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {\n  return (\n    <CustomModal isOpen={isOpen} onClose={onClose} title=\"Generate Receipt or Invoice\" width=\"95vw\">\n      <div className=\"h-[85vh] overflow-y-auto rounded-xl border\">\n        <App />\n      </div>\n    </CustomModal>\n  );\n}\n';
}

fs.writeFileSync(file, content);
console.log('Done index.tsx');
