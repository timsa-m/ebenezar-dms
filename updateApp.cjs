const fs = require('fs');
const file = 'C:/Users/-/Music/backedupfiles/elelyon/ebenezar/components/documents/index.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('getDocumentTransactions')) {
  content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { getDocumentTransactions } from './actions';");
}

if (!content.includes('const [isLoading, setIsLoading] = useState(true);')) {
  const stateHooks = `  const [documents, setDocuments] = useState<DocumentData[]>(INITIAL_DOCUMENTS);
  const [activeDoc, setActiveDoc] = useState<DocumentData>(ORIGINAL_EBENEZAR_INVOICE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const liveDocs = await getDocumentTransactions();
        if (liveDocs.length > 0) {
          setDocuments(liveDocs);
          setActiveDoc(liveDocs[0]);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);`;
  
  content = content.replace(/  const \[documents, setDocuments\] = useState<DocumentData\[\]>\(INITIAL_DOCUMENTS\);\s*const \[activeDoc, setActiveDoc\] = useState<DocumentData>\(ORIGINAL_EBENEZAR_INVOICE\);/, stateHooks);
}

// Add a loading spinner to the render if isLoading is true
if (!content.includes('if (isLoading)')) {
  content = content.replace('return (', `
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3 text-neutral-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium animate-pulse">Syncing live transactions from backend...</p>
      </div>
    );
  }

  return (`);
}

fs.writeFileSync(file, content);
console.log('Update complete.');
