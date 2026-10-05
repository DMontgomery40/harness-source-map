#!/usr/bin/env node
// Broad Claude Code discovery is checked against the records the site actually indexes.
// Exact text is deterministic; non-exact matches use exhaustive Choice windows and absolute
// Noul/Score verification. Gaps are local review items, never absence claims.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { categories } from '../../site/src/claude-code/catalog.mjs';
import { auditCoverage, publishedCoverageRecords } from '../../codex/extract/codex/coverage-audit.mjs';
import { decisionConfig, openCache, JEV_TEMPFAIL_EXIT } from '../../codex/extract/codex/lib/jev-provider.mjs';
import { BINARY_SHA256 } from './lib.mjs';

const root=path.resolve(import.meta.dirname,'..');
const ledger=JSON.parse(readFileSync(path.join(root,'work/jev-discovery-cc.json'),'utf8'));
if(ledger.source?.binary_sha256!==BINARY_SHA256) throw new Error('Claude Code discovery coverage has a stale binary ledger');
const modelRoles=new Set(['tool','parameter','instructions','context','user_template']);
const sources=ledger.records.filter(r=>r.status==='classified'&&r.model_facing.noul>=.8&&modelRoles.has(r.role?.choice));
const records=await publishedCoverageRecords(root,categories);
const config=decisionConfig();
const cache=openCache(path.join(root,'work/jev-discovery-cc-coverage-cache.json'),{config});
const result=await auditCoverage(config,sources,records,{cache});
const summaryFile=path.join(root,'work/jev-discovery-cc-coverage-pending.json');
let previous={pending:[]};try{previous=JSON.parse(readFileSync(summaryFile,'utf8'));}catch{}
const key=r=>`${r.source_sha256}:${r.expected_kind}`;
const old=new Set(previous.pending.filter(r=>r.status==='unverified-gap').map(key));
const gaps=result.results.filter(r=>r.status==='unverified-gap');
const covered=new Set(result.results.filter(r=>r.status==='covered').map(key));
const report={source:ledger.source,...result,new_gaps:gaps.filter(r=>!old.has(key(r))).length,resolved_gaps:[...old].filter(k=>covered.has(k)).length};
const reportText=JSON.stringify(report,null,1)+'\n';
const pendingText=JSON.stringify({source:ledger.source,pending:result.results.filter(r=>r.status!=='covered'),new_gaps:report.new_gaps,resolved_gaps:report.resolved_gaps},null,1)+'\n';
writeFileSync(path.join(root,'work/jev-discovery-cc-coverage.json'),reportText);
writeFileSync(path.join(root,`work/jev-discovery-cc-coverage-${ledger.source.binary_sha256}.json`),reportText);
writeFileSync(summaryFile,pendingText);
console.log(JSON.stringify({sources:result.sources,covered:result.covered,unverified_gaps:result.gaps,unanswered:result.unanswered,new_gaps:report.new_gaps}));
if(result.unanswered) process.exitCode=JEV_TEMPFAIL_EXIT;
