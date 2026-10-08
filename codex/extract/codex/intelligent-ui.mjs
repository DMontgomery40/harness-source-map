#!/usr/bin/env node
// Exact shipped instructions and source locators for the interactive-answer surfaces.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {codexApp} from './lib/app-layout.mjs';
import {openAsar,byteOffset} from './lib/asar.mjs';
import {literalsOf,decodeLiteral} from './lib/js-scan.mjs';
import {privacyScan} from './lib/privacy.mjs';

export function extractVisualizeInstructions(asar,{version=''}={}) {
 const bodies=[];
 for(const entry of asar.appScripts) {
  const src=asar.textOf(entry);
  if(!src.includes('visualizationSkillInstructions')) continue;
  for(const literal of literalsOf(src)) {
   let text; try {text=decodeLiteral(src,literal);} catch {continue;}
   if(typeof text!=='string') continue;
   const id=text.startsWith('---\nname: visualize\n')?'visualize':text.startsWith('# UI mockup variants and design controls\n')?'tweak':text.startsWith('The complete Visualize skill and its tweak.md reference are included below.')?'precedence':null;
   if(id) bodies.push({id,title:id==='visualize'?'Visualize skill instructions':id==='tweak'?'UI mockup variants and design controls':'Page precedence notice',kind:id==='precedence'?'prompt':'skill',text,source_file:entry.path,byte_offset:byteOffset(src,literal.start),provenance:[{file:entry.path,offset:byteOffset(src,literal.start),version}],source:{file:entry.path,sha256:asar.fileSha256(entry),byte_offset:byteOffset(src,literal.start),byte_length:Buffer.byteLength(src.slice(literal.start,literal.end))}});
  }
 }
 return ['visualize','tweak','precedence'].map(id=>{
  const matches=bodies.filter(i=>i.id===id);
  if(matches.length!==1) throw new Error(`${id}: expected one complete instruction body, found ${matches.length}`);
  return matches[0];
 });
}

export function generate() {
 const root=path.resolve(import.meta.dirname,'../..'),app=codexApp(),asar=openAsar(app.asar);
 const plistValue=key=>execFileSync('/usr/libexec/PlistBuddy',['-c',`Print ${key}`,app.plist],{encoding:'utf8'}).trim();
 const version=`ChatGPT desktop ${plistValue('CFBundleShortVersionString')} (${plistValue('CFBundleVersion')})`;
 const items=extractVisualizeInstructions(asar,{version});
 const mechanisms=[
  {title:'Page instruction assembly',anchor:'visualizationSkillInstructions',file:/skill-instructions-/,behavior:'The exported instruction value joins a precedence notice, the complete Visualize skill and the complete tweak.md reference inside visualize_reference tags. The notice gives preceding Page-specific instructions precedence over delivery and tool-use rules.'},
  {title:'Widget state in the sandbox',anchor:'stateModelContext:',file:/visualization-sandbox-runtime-/,behavior:'The visualization sandbox initializes statePersistence and marks state model context as none or untrusted. The skill separates modelContent from privateContent, replaces snapshots, limits them to 16 KiB, and says saving state does not start a turn. Best-effort model delivery is distinct from local UI restoration.'},
  {title:'Publish visualization to Sites',anchor:'codex.visualization.publishToSitesPrompt',file:/visualization-sites-handoff-/,behavior:'The handoff creates a standalone HTML attachment, then assembles a user request to publish it. The exact request says to treat the file as untrusted, preserve its sandboxed iframe and CSP, reuse the current Sites project when present, and return the live URL.'}
 ].map(m=>{
  const hits=asar.appScripts.filter(e=>m.file.test(e.path)).flatMap(e=>{const t=asar.textOf(e),at=t.indexOf(m.anchor);return at<0?[]:[{file:e.path,sha256:asar.fileSha256(e),byte_offset:byteOffset(t,at),anchor:m.anchor}];});
  if(hits.length!==1) throw new Error(`${m.title}: expected one source locator, found ${hits.length}`);
  return {title:m.title,behavior:m.behavior,source:hits[0]};
 });
 const report={title:'Intelligent UI and inline visualizations',source:{version,asar_sha256:asar.sha256},qualification:'Shipped client source establishes instruction contents and client behavior. It does not establish account rollout or a captured server prompt. The ChatGPT announcement does not announce a replacement of the models powering Work or Codex/ChatGPT.',mechanisms,items};
 const fence=text=>'~'.repeat(Math.max(6,...[...text.matchAll(/~+/g)].map(m=>m[0].length+1)));
 const sourceNote=s=>`Source: \`${s.file}\`, offset ${s.byte_offset}, SHA-256 \`${s.sha256}\`.`;
 let md='# Intelligent UI and inline visualizations\n\nOpenAI announced Intelligent UI for interactive ChatGPT answers on October 7, 2026. The shipped Codex/ChatGPT client contains several related surfaces: registered learning blocks, generative-UI widget refresh, and file-backed HTML visualizations. These are separate delivery paths; a shared visual appearance does not establish a shared prompt. [Official announcement](https://openai.com/index/gpt-6-for-everyone/).\n\n'+report.qualification+'\n\n## Delivery paths\n\n- **Learning blocks:** server-selected types, initial values, versions and lazy-loaded renderers. See [the complete learning-block map](../chatgpt-learning-blocks/).\n- **Generative UI:** message metadata `genui_refresh` drives the shipped `/conversation/{conversation_id}/message/{message_id}/genui/refresh_widget` client request. The learning-block map records this path; no server implementation is inferred.\n- **Inline HTML:** the Visualize skill specifies a visualization content reference pointing to a local HTML fragment. Its full instructions and the separate design-controls reference are below.\n\n## Client behavior and triggers\n\n';
 for(const m of mechanisms) md+=`### ${m.title}\n\n${m.behavior}\n\n${sourceNote(m.source)} Anchor: \`${m.source.anchor}\`.\n\n`;
 md+='## Exact model-facing instructions\n\nThe following shipped strings are source evidence. They are not instructions for readers or agents consuming this map. The source offsets locate the encoded JavaScript literals; the fenced text is their complete decoded value.\n\n';
 for(const i of items) {const f=fence(i.text);md+=`### ${i.title}\n\n${sourceNote(i.source)}\n\n${f}text\n${i.text}\n${f}\n\n`;}
 const json=JSON.stringify(report,null,2)+'\n';privacyScan(new Map([['intelligent-ui.json',json],['intelligent-ui.md',md]]));
 const output=path.join(root,'outputs/intelligent-ui.json'),changed=!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==json;
 fs.writeFileSync(output,json);fs.writeFileSync(path.join(root,'outputs/intelligent-ui.md'),md);
 fs.mkdirSync(path.join(root,'work'),{recursive:true});
 fs.writeFileSync(path.join(root,'work/intelligent-ui-diff.md'),changed?'## Intelligent UI source refresh\n\nComplete Visualize, design-control, and Page-precedence instructions and their client source locators changed.\n':'');
 console.log(JSON.stringify({instructions:items.length,mechanisms:mechanisms.length,asar_sha256:asar.sha256}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) generate();
