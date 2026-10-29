const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        if (file.includes('node_modules') || file.includes('.next') || file.includes('.git')) return;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('./');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // We only want to replace `import { toast } from 'sonner'` or `import { toast } from "sonner"`
    // We don't want to replace `import { Toaster, toast } from 'sonner'` if we aren't careful, but 
    // `layout.tsx` only has `import { Toaster } from "sonner"`. Let's do a strict replace.
    if (content.includes('import { toast } from \'sonner\'') || content.includes('import { toast } from "sonner"')) {
        content = content.replace(/import\s*{\s*toast\s*}\s*from\s*['"]sonner['"]/g, "import { toast } from '@/lib/toast'");
        fs.writeFileSync(file, content, 'utf8');
        count++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Replaced toast imports in ${count} files.`);
