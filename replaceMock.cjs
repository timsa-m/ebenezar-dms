const fs = require('fs');
const file = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/data/mockDocuments.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/logoUrl: ''/g, "logoUrl: '/icons/logo.svg'");
content = content.replace(/logoUrl: '',/g, "logoUrl: '/icons/logo.svg',");
fs.writeFileSync(file, content);
