import fs from 'node:fs';
import path from 'node:path';

const pattern = /(?:const|static)\s+([A-Z0-9_]+)\s*:\s*&(?:'static\s+)?str\s*=\s*(?:r(#*)"([\s\S]*?)"\2|"((?:[^"\\]|\\[\s\S])*)")\s*;/g;
const unescape = text => text.replace(/\\(u\{[0-9a-fA-F]+\}|x[0-9a-fA-F]{2}|[ntr0\\"']|\n\s*)/g, (match, code) =>
  code[0] === 'u' ? String.fromCodePoint(parseInt(code.slice(2,-1),16))
    : code[0] === 'x' ? String.fromCharCode(parseInt(code.slice(1),16))
      : {n:'\n',t:'\t',r:'\r',0:'\0','\\':'\\','"':'"',"'":"'"}[code] ?? '');

// Search every production crate. The caller verifies executable bytes and reviews roles;
// discovery does not treat a crate's directory name as a completeness boundary.
export function discoverRustPrompts(root) {
  const found=[];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) {
        if(!/^(?:target|node_modules|vendor|snapshots|tests?|docs|\.git)$/.test(entry.name)) walk(file);
      } else if(entry.name.endsWith('.rs') && !/_tests?\.rs$/.test(entry.name)) {
        const code=fs.readFileSync(file,'utf8');
        for(const match of code.matchAll(pattern)) {
          const name=match[1], text=match[3] ?? unescape(match[4]);
          if(/(?:SCHEMA|GRAMMAR)$/.test(name)) continue;
          if(text.length<150 && !(text.length>=24 && /PROMPT|INSTRUCTIONS|DESCRIPTION|GUIDANCE|POLICY/.test(name))) continue;
          const relative=path.relative(root,file).split(path.sep).join('/');
          found.push({file,name,text,source:`${relative}::${name}`,line:code.slice(0,match.index).split('\n').length,
            source_context:`${code.slice(Math.max(0,match.index-400),match.index)}<candidate declaration>${code.slice(match.index+match[0].length,match.index+match[0].length+400)}`});
        }
      }
    }
  }
  walk(root);
  return found;
}
