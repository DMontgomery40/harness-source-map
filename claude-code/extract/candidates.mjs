// Inventory strings in the embedded JavaScript. The scheduled classifier retains the
// historical 200-character candidate set; explicit broad discovery also admits short prose
// and records every exclusion before any external classification is considered.
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as walk from "acorn-walk";
import { files, parse, source, VERSION, BINARY_SHA256 } from "./lib.mjs";

const root = new URL("../work/", import.meta.url).pathname;
const keyOf = node => node?.key?.name ?? (typeof node?.key?.value === 'string' ? node.key.value : null);
const MODEL_ROLE_KEY=/^(?:description|prompt|systemPrompt|instructions|message|userPrompt|startingMessage|whenToUse|toolDescription|summary)$/i;

export function candidatesOf(src, file, { broad = false } = {}) {
  const ast=parse(src), out=[],stats={literals:0,selected:0,skipped:{}};
  const skip=reason=>stats.skipped[reason]=(stats.skipped[reason]??0)+1;
  const take=(node,text,parent)=>{
    stats.literals++;
    if(typeof text!=='string') {skip('undecodable');return;}
    const words=text.match(/[A-Za-z][A-Za-z'’-]*/g)??[];
    const legacyWords=text.split(/\s+/).filter(Boolean).length;
    const role=parent?.type==='Property'&&parent.value===node ? {kind:keyOf(parent)??'literal'} : {kind:'literal'};
    // The old broad floor discarded short instructions such as "Plan mode" and one-word
    // descriptions in prompt-bearing fields before Jev could consider their source role.
    const broadCandidate=(words.length>=2&&/\s/.test(text))||(words.length>=1&&MODEL_ROLE_KEY.test(role.kind));
    if(broad ? !broadCandidate : text.length<200 || legacyWords<30 || !/[a-z]{3,} [a-z]{3,} [a-z]{3,}/.test(text)) {skip('non-prose-or-short');return;}
    out.push({file,start:node.start,end:node.end,byte_start:Buffer.byteLength(src.slice(0,node.start)),words:broad?words.length:legacyWords,text,
      ...(broad?{role,source_context:`${src.slice(Math.max(0,node.start-300),node.start)}<candidate literal>${src.slice(node.end,node.end+300)}`}:{})});
  };
  walk.fullAncestor(ast,(node,_state,ancestors)=>{
    const parent=ancestors.at(-2);
    if(node.type==='Literal'&&typeof node.value==='string') take(node,node.value,parent);
    if(node.type==='TemplateLiteral') take(node,node.quasis.map((q,i)=>`${q.value.cooked??q.value.raw}${i<node.expressions.length?`\${${src.slice(node.expressions[i].start,node.expressions[i].end).slice(0,broad?undefined:60)}}`:''}`).join(''),parent);
  });
  stats.selected=out.length;
  return {candidates:out,stats};
}

// Embedded Markdown and text assets are source material too. Keep exact, contiguous
// spans so large files fit a complete Jev request without discarding their endings.
export function assetCandidatesOf(src, file, { maxChars = 8000, references = [] } = {}) {
  const out=[];
  for(let start=0;start<src.length;) {
    let end=Math.min(start+maxChars,src.length);
    if(end<src.length) {
      const line=src.lastIndexOf('\n',end);
      if(line>start+maxChars/2) end=line+1;
      if(end<src.length && /[\uD800-\uDBFF]/.test(src[end-1])) end--;
    }
    if(end<=start) end=Math.min(start+maxChars,src.length);
    const text=src.slice(start,end);
    if(/\S/.test(text)) out.push({file,start,end,words:(text.match(/[A-Za-z][A-Za-z'’-]*/g)??[]).length,text,
      role:{kind:file.includes('.md')?'embedded-markdown':'embedded-text'},
      source_context:`Exact embedded asset span ${start}-${end} of ${src.length} characters in ${file}. Code references: ${references.join(' | ')||'none found'}. Previous: ${src.slice(Math.max(0,start-160),start)} Next: ${src.slice(end,end+160)}`});
    start=end;
  }
  return out;
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const prepare=process.env.CC_DISCOVERY_PREPARE==='1';
  const broad=prepare||process.env.JEV_BROAD_EXPORT==='1';
  const out=[],stats={scripts:0,parse_failed:0,parse_failed_files:[],literals:0,assets:0,asset_segments:0,selected:0,skipped:{}};
  const aliases=new Map();
  if(broad) for(const [file,entry] of files) if(/\.(md|txt)(\.zst)?$/.test(file)) {
    aliases.set(file,file);
    if(entry.decompressed) aliases.set(entry.decompressed,file);
  }
  const escaped=[...aliases.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const assetRefPattern=broad?new RegExp(escaped.join('|'),'g'):null;
  const references=new Map();
  for(const file of readdirSync(`${root}extracted`).filter(f=>/\.(js|mjs)$/.test(f)||f==='cli')) {
    stats.scripts++;
    try {
      const src=source(file);
      if(broad) for(const match of src.matchAll(assetRefPattern)) {
        const asset=aliases.get(match[0]),list=references.get(asset)??[];
        if(list.length<2) { list.push(`${file}: ${src.slice(Math.max(0,match.index-120),match.index+match[0].length+120)}`); references.set(asset,list); }
      }
      const found=candidatesOf(src,file,{broad});
      out.push(...found.candidates);
      stats.literals+=found.stats.literals;
      stats.selected+=found.stats.selected;
      for(const [reason,n] of Object.entries(found.stats.skipped)) stats.skipped[reason]=(stats.skipped[reason]??0)+n;
    } catch {stats.parse_failed++;stats.parse_failed_files.push(file);}
  }
  if(broad) for(const [file] of files) {
    if(!/\.(md|txt)(\.zst)?$/.test(file)) continue;
    const asset=assetCandidatesOf(source(file),file,{references:references.get(file)??[]});
    stats.assets++;
    stats.asset_segments+=asset.length;
    stats.selected+=asset.length;
    out.push(...asset);
  }
  const file=`${root}${prepare?'candidates-broad-prepared.json':'candidates.json'}`;
  writeFileSync(file,JSON.stringify(out));
  writeFileSync(`${root}${prepare?'candidates-broad-prepared.stats.json':'candidates.stats.json'}`,JSON.stringify({source:{mode:broad?'broad':'legacy',version:VERSION,binary_sha256:BINARY_SHA256},stats},null,1)+'\n');
  console.log(JSON.stringify(stats));
}
