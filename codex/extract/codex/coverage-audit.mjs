#!/usr/bin/env node
// Compare discovered source occurrences with the records actually declared in the site
// catalog. Routing is a search aid; an unverified gap never becomes a claim of absence.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { categories } from '../../../site/src/codex/catalog.mjs';
import { loadSearchRecords } from '../../../site/src/shared/search-index.mjs';
import { verifyCoverage } from './lib/jev-discovery.mjs';
import { decisionConfig, openCache, JevUnavailableError, JEV_TEMPFAIL_EXIT } from './lib/jev-provider.mjs';

// Complete fenced payloads, with the heading that search exposes. No summary/prefix slicing.
export function fencedRecords(markdown) {
  const records=[]; let title='',group='',fence=null,text=[],provenance={};
  for(const line of markdown.split('\n')) {
    if(fence) {
      if(new RegExp(`^${fence}\\s*$`).test(line)) {records.push({title,group,text:text.join('\n'),...provenance});fence=null;text=[];}
      else text.push(line);
    } else {
      const heading=/^(#{2,4})\s+(.+)$/.exec(line);
      if(heading) {if(heading[1].length===2) group=heading[2];title=heading[2];provenance={};}
      const origin=/^Source: `([^`]+)`, offset (\d+), SHA-256 `([a-f0-9]+)`/.exec(line);
      if(origin) provenance={source_file:origin[1],byte_offset:Number(origin[2]),sha256:origin[3]};
      const start=/^(`{3,}|~{3,})(?:text|markdown|md)?\s*$/.exec(line);
      if(start) fence=start[1];
    }
  }
  return records;
}

// Bootstrap older prose-only publications without fabricating typed classifier judgments.
// New sweeps write their role metadata directly; historical entries retain an unknown role.
export function historicalDesktopRecords(markdown) {
  const rows=fencedRecords(markdown);
  return {source:{derivation:'Previously published Markdown; mixed role judgments pending'},question_version:'historical-publication',items:rows.map((r,i)=>({id:`historical-desktop-${i}`,document:'desktop-model-facing-text.md',area:r.group,title:r.title,kind:'prompt',text:r.text,...(r.source_file?{provenance:[{file:r.source_file,binary_offset:r.byte_offset,version:''}],sha256:r.sha256}:{}),decision_origin:'previous-publication',role_status:'pending-mixed-role-review'}))};
}

export async function publishedCoverageRecords(sourceRoot,catalog=categories) {
  const records=[];
  for(const file of catalog.flatMap(c=>c.files)) {
    const normalized=await loadSearchRecords({sourceRoot,file});
    let fences=[];
    if(file.format==='markdown') fences=fencedRecords(fs.readFileSync(path.join(sourceRoot,file.path),'utf8'));
    for(const [i,r] of normalized.entries()) {
      const body=r.text??fences.find(f=>f.title===r.title&&(!r.group||f.group===r.group))?.text;
      if(body) records.push({id:`${file.slug}/${r.id??i}`,title:r.title,kind:r.kind,text:body,file:file.path});
    }
    // Pages without a record map can supply prompt text, but cannot supply a typed Tool.
    if(!normalized.length) for(const [i,r] of fences.entries()) records.push({id:`${file.slug}/fence-${i}`,title:r.title,kind:'prompt',text:r.text,file:file.path});
  }
  return records;
}

export async function auditCoverage(config,sources,records,options={}) {
  const results=[];
  let outage=null;
  for(const source of sources) {
    if(outage) {results.push({id:source.id,status:'unanswered',reason:outage});continue;}
    const role=source.role?.choice;
    const expectedKind=role==='tool'||role==='parameter'?'tool':'prompt';
    const candidates=records.filter(r=>r.kind===expectedKind);
    try {results.push({id:source.id,file:source.file,offset:source.offset,source_sha256:source.text_sha256,expected_kind:expectedKind,...await verifyCoverage(config,source,candidates,{...options,checkpoint:options})});}
    catch(error) {
      if(!(error instanceof JevUnavailableError)) throw error;
      outage=error.reason;
      results.push({id:source.id,status:'unanswered',reason:error.reason});
    }
  }
  options.cache?.save?.();
  return {sources:sources.length,covered:results.filter(r=>r.status==='covered').length,gaps:results.filter(r=>r.status==='unverified-gap').length,unanswered:results.filter(r=>r.status==='unanswered').length,results};
}

async function main() {
  const repo=path.resolve(import.meta.dirname,'../..');
  let sourceFile=process.argv[2];
  if(!sourceFile) {
    const latest=JSON.parse(fs.readFileSync(path.join(repo,'work/prompt-discovery-pending.json'),'utf8'));
    sourceFile=path.join(repo,`work/prompt-discovery-${latest.source.asar_sha256}.json`);
  }
  const ledger=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  const sources=ledger.records.filter(r=>r.status==='classified'&&r.model_facing.noul>=.8);
  const records=await publishedCoverageRecords(repo);
  const cache=openCache(path.join(repo,'work/discovery-coverage-verdicts.json'));
  const result=await auditCoverage(decisionConfig(),sources,records,{cache});
  const summaryFile=path.join(repo,'work/discovery-coverage-pending.json');
  const previous=(()=>{try{return JSON.parse(fs.readFileSync(summaryFile,'utf8'));}catch{return {pending:[]};}})();
  const key=r=>`${r.source_sha256}:${r.expected_kind}`;
  const gaps=result.results.filter(r=>r.status==='unverified-gap');
  const oldKeys=new Set(previous.pending.filter(r=>r.status==='unverified-gap').map(key));
  const newGaps=gaps.filter(r=>!oldKeys.has(key(r)));
  const coveredKeys=new Set(result.results.filter(r=>r.status==='covered').map(key));
  const resolved=[...oldKeys].filter(k=>coveredKeys.has(k));
  const report={source:ledger.source,...result,new_gaps:newGaps.length,resolved_gaps:resolved.length};
  fs.writeFileSync(path.join(repo,'work/discovery-coverage.json'),JSON.stringify(report,null,1)+'\n');
  const pending={source:ledger.source,pending:result.results.filter(r=>r.status!=='covered'),new_gaps:newGaps.length,resolved_gaps:resolved.length};
  fs.writeFileSync(summaryFile,JSON.stringify(pending,null,1)+'\n');
  fs.writeFileSync(path.join(repo,`work/discovery-coverage-${ledger.source.asar_sha256}.json`),JSON.stringify(pending,null,1)+'\n');
  console.log(JSON.stringify({sources:result.sources,covered:result.covered,unverified_gaps:result.gaps,unanswered:result.unanswered,new_gaps:newGaps.length,resolved_gaps:resolved.length}));
  if(result.unanswered) process.exitCode=JEV_TEMPFAIL_EXIT;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
