const fs = require('fs');
const file = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/components/DocumentEditorModal.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('import { Button }')) {
  content = content.replace('import React, { useState, useEffect } from \'react\';', 'import React, { useState, useEffect } from \'react\';\nimport { Button } from \'@/components/ui/button\';');
}
content = content.replace(/<button/g, '<Button');
content = content.replace(/<\/button>/g, '</Button>');
fs.writeFileSync(file, content);
