#!/usr/bin/env node
// Source-reviewed mechanisms beyond the configuration-key inventory. No provider calls.
// Matching clean source, bundled CLI identity, source ranges and compiled literal bytes
// are checked before either public output is replaced. --verify checks without writing.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { codexApp } from './lib/app-layout.mjs';
import { privacyScan } from './lib/privacy.mjs';

const sha256=value=>createHash('sha256').update(value).digest('hex');
const FEATURES='codex-rs/features/src/lib.rs';
function uniqueIndex(text,needle,file) {
 const at=text.indexOf(needle);
 if(at<0||text.indexOf(needle,at+needle.length)>=0)throw new Error(`${file}: missing or ambiguous reviewed anchor ${JSON.stringify(needle)}`);
 return at;
}
export function sourceRange(file,text,start,end,version,commit) {
 const first=start===null?0:uniqueIndex(text,start,file);
 const last=end===null?text.length:end===start?first:text.indexOf(end,first+String(start).length);
 if(last<first)throw new Error(`${file}: reviewed range ending is missing`);
 const through=end===null?last:last+end.length;
 return {file,version,commit,line:text.slice(0,first).split('\n').length,end_line:text.slice(0,through).split('\n').length,
  byte_offset:Buffer.byteLength(text.slice(0,first)),offset:Buffer.byteLength(text.slice(0,first)),line_start:text.slice(0,first).split('\n').length,byte_length:Buffer.byteLength(text.slice(first,through)),sha256:sha256(text.slice(first,through)),file_sha256:sha256(text),source_text:text.slice(first,through),
  url:`https://github.com/openai/codex/blob/${commit}/${file}#L${text.slice(0,first).split('\n').length}`};
}
export function sourceLiteral(file,text,value,binary,version,commit) {
 const raw=JSON.stringify(value),at=uniqueIndex(text,raw,file),offset=binary.indexOf(Buffer.from(value));
 if(offset<0)throw new Error(`${file}: complete reviewed literal is absent from the bundled CLI`);
 return {text:value,provenance:sourceRange(file,text,raw,raw,version,commit),binary_offset:offset,binary_byte_length:Buffer.byteLength(value),text_sha256:sha256(value),
  // Limit literal provenance to the encoded literal, not the trailing source file.
  source_byte_offset:Buffer.byteLength(text.slice(0,at)),source_byte_length:Buffer.byteLength(raw),source_sha256:sha256(raw)};
}

export function buildFeatureNotes(read,binary,source) {
 const texts=new Map();
 const get=file=>{if(!texts.has(file))texts.set(file,read(file));return texts.get(file);};
 const evidence=(file,start=null,end=null,required=[])=>{
  const text=get(file),p=sourceRange(file,text,start,end,source.tag,source.commit);
  const body=Buffer.from(text).subarray(p.byte_offset,p.byte_offset+p.byte_length).toString();
  for(const token of required)if(!body.includes(token))throw new Error(`${file}: reviewed behavior changed; missing ${JSON.stringify(token)}`);
  return p;
 };
 const gate=(name,key)=>{
  const p=evidence(FEATURES,`FeatureSpec {\n        id: Feature::${name},`,'\n    },',[`key: "${key}"`]);
  const body=Buffer.from(get(FEATURES)).subarray(p.byte_offset,p.byte_offset+p.byte_length).toString();
  const defaultEnabled=/default_enabled: (true|false)/.exec(body)?.[1];
  const stage=/stage: Stage::(\w+)/.exec(body)?.[1];
  if(!defaultEnabled||!stage||!binary.includes(Buffer.from(key)))throw new Error(`${key}: incomplete or unshipped feature registration`);
  return {key:`features.${key}`,default_enabled:defaultEnabled==='true',stage,provenance:p};
 };
 const literal=(file,value)=>sourceLiteral(file,get(file),value,binary,source.tag,source.commit);
 const modelFile='codex-rs/core/src/context/world_state/model_catalog.rs';
 const specFile='codex-rs/core/src/tools/handlers/multi_agents_spec.rs';
 const worldFile='codex-rs/core/src/session/world_state.rs';
 const spawnFile='codex-rs/core/src/agent/control/spawn.rs';
 const guardian='codex-rs/ext/guardian-v2/src/async_scorer/';
 const execFile='codex-rs/core/src/tools/runtimes/unified_exec.rs';
 const shellFile='codex-rs/core/src/shell.rs';
 const items=[
  {id:'spawn-model-catalog-context',title:'Spawn model choices as append-only context',kind:'prompt',
   text:'With model_catalog_in_context enabled and the applicable spawn_agent tool exposed, the harness moves available spawn model choices from tool descriptions into a developer `<model_catalog>` context fragment. It appends a new fragment when the rendered catalog changes, leaves earlier messages intact, and emits an invalidation fragment when a retained catalog ceases to apply.',
   gate:gate('ModelCatalogInContext','model_catalog_in_context'),
   details:{conditions:'V1 requires its spawn tool to be exposed. V2 also requires expose_spawn_agent_model_overrides. Picker-hidden and backend-incompatible models are excluded. The first five eligible models are sorted by model ID; descriptions are capped at 250 characters and the complete marked fragment at 1,000 UTF-8 bytes. Whole entries are omitted rather than splitting identifiers, reasoning efforts or service tiers. An unchanged rendered catalog adds no fragment.',
    exact_text:[literal(modelFile,'Additional model choices omitted.\n'),literal(modelFile,'No picker-visible model overrides are currently loaded.\n'),literal(modelFile,'\nThe previous spawn_agent model catalog no longer applies.\n'),literal(specFile,'Pick model overrides from the latest <model_catalog> listing.')]},
   provenance:[evidence(worldFile,'        let spawn_tool = match turn_context.multi_agent_version {','        if !crate::guardian::is_basic_session_source', ['expose_spawn_agent_model_overrides','exposes_tool','enabled(Feature::ModelCatalogInContext)']),evidence(modelFile,null,null,['const MAX_RENDERED_BYTES: usize = 1_000','const MAX_DESCRIPTION_CHARS: usize = 250','model.show_in_picker','model_supports_multi_agent_backend','models.sort_by','role == "developer"','PreviousSectionState::Known(previous) if previous == &current']),evidence(specFile,'pub fn create_spawn_agent_tool_v1','    let mut properties = spawn_agent_common_properties_v2', ['!options.model_catalog_in_context','SPAWN_AGENT_INHERITED_MODEL_GUIDANCE_V2']),evidence('codex-rs/core/src/agent/child_config.rs','pub(crate) const MAX_SPAWN_AGENT_MODEL_OVERRIDES: usize = 5;','pub(crate) const MAX_SPAWN_AGENT_MODEL_OVERRIDES: usize = 5;')]},
  {id:'fresh-v2-dynamic-tool-inheritance',title:'Dynamic tools in fresh V2 subagents',kind:'tool',
   text:'A fresh V2 subagent can inherit the parent session\'s client-defined dynamic tools without copying conversation history. The spawn path resolves parent_thread_id, reads the parent\'s dynamic_tools and passes them to the child startup call only when multi_agent_v2_dynamic_tools is enabled.',
   gate:gate('MultiAgentV2DynamicTools','multi_agent_v2_dynamic_tools'),
   details:{conditions:'This branch requires a resolvable parent thread, a session source, no history-fork mode, MultiAgentVersion::V2 and the feature gate. It supplies an empty dynamic-tool list otherwise. Forked children follow a separate startup path. The capability inherited here is the client-defined tool list; this source does not establish the later upstream change to selected skills or disabled-plugin inheritance.'},
   provenance:[evidence(spawnFile,'        } = match (session_source, options.fork_mode.as_ref(), inheritance) {','                    /*forked_from_thread_id*/ None,',['(Some(session_source), None, inheritance)','state.get_thread(parent_thread_id)','multi_agent_version == MultiAgentVersion::V2','config.features.enabled(Feature::MultiAgentV2DynamicTools)','parent_thread.session.dynamic_tools().await','Vec::new()','spawn_new_thread_with_source'])]},
  {id:'guardian-decisions-comparison',title:'Guardian Decisions comparison without approval changes',kind:'decision',
   text:'The optional guardianv2_decisions_comparison path sends a second risk classification to OpenAI Decisions alongside Guardian V2 snapshot scoring. Guardian\'s existing sampler still publishes the approval score; the Decisions task records its outcome after that baseline path. Transport, setup and representability failures affect measurement rather than approvals.',
   gate:gate('GuardianV2DecisionsComparison','guardianv2_decisions_comparison'),
   details:{conditions:'The installed build reads CODEX_GUARDIAN_DECISIONS_API_KEY and uses gpt-6-luna at https://api.openai.com/v1/decisions. Conversation-backed evidence is skipped. Snapshot evidence must retain complete user-message boundaries and contain text or inline data images; parent compaction, other roles, audio and unsupported parts are rejected intact. The transport allows 16 requests in flight, cancels the oldest unfinished request at capacity, uses a six-second deadline, and caps image data at 8 MiB and responses at 16 KiB. A superseded classification aborts its comparison task.'},
   provenance:[evidence(guardian+'extension.rs','            input\n                .thread_store\n                .remove::<super::decisions::DecisionsSampler>();','            input.thread_store.insert(guardian_config);',['enabled(Feature::GuardianV2DecisionsComparison)','super::startup::decisions_sampler']),evidence(guardian+'startup.rs','// Decisions setup failures are telemetry only;','pub(super) async fn sampler_config(',['std::env::var("CODEX_GUARDIAN_DECISIONS_API_KEY")','build_client_without_request_logging','setup_failure']),evidence(guardian+'classification.rs','            let result = match transcript {','            let output = match result {',['ClassificationContext::Snapshot','decisions_sampler.spawn','sampler.sample(sampling).await','unsupported_evidence']),evidence(guardian+'classification.rs','            let accepted =','            tracing::info!(',['score_progress.publish(score.clone()']),evidence(guardian+'classification.rs','        if matches!(result, Ok(ClassificationOutcome::Superseded))','                .await;',['drop(task)','finish_and_record_outcome']),evidence(guardian+'decisions.rs','const MAX_CONCURRENT_REQUESTS: usize = 16;','#[derive(Clone, Copy, Debug, Error, PartialEq)]',['Duration::from_secs(6)','8 * 1024 * 1024','16 * 1024']),evidence(guardian+'decisions.rs','    /// Retain the newest requests;','    async fn request(',['oldest.abort()','tokio::time::timeout(DEADLINE']),evidence(guardian+'decisions.rs','fn request_body(','fn parse_answer(',['parent_compaction.is_some()','role != "user"','image_url.starts_with("data:")','UnsupportedEvidence','Value::Array(messages)'])]},
  {id:'login-shell-package-path',title:'Executor tools survive login-shell PATH resets',kind:'tool',
   text:'With login_shell_package_path enabled, unified_exec can restore executor-supplied tool directories inside a POSIX login shell after its startup scripts run. The setup uses the executor\'s prepend_path_dirs and leaves an explicit PATH override in control.',
   gate:gate('LoginShellPackagePath','login_shell_package_path'),
   details:{conditions:'Only login Bash, Zsh and Sh qualify. The executor must report usable POSIX directories; colon-containing directories and unsupported setup retain the original arguments. Directory order is preserved, existing entries are not duplicated, and an unset or read-only PATH does not prevent the user command from running. The requested login mode is retained. This mechanism is separate from shell snapshots.'},
   provenance:[evidence(execFile,'        // Restore the executor\'s PATH directories inside the shell','        if !environment_is_remote {',['enabled(Feature::LoginShellPackagePath)','req.shell.is_posix_login()','!explicit_env_overrides.contains_key("PATH")','&info.prepend_path_dirs']),evidence(shellFile,'impl ShellInvocation {','#[cfg(all(test, unix))]',['ShellType::Bash | ShellType::Zsh | ShellType::Sh','paths.iter().rev()','PathConvention::Posix',"path.contains(':')",'self.use_login_shell','export PATH'])]}
 ];
 for(const item of items)item.provenance.unshift(item.gate.provenance);
 return {title:'Installed harness mechanisms',source,qualification:'Build-matched source and compiled literal bytes establish these mechanisms and gates. They do not establish account rollout, enabled configuration, live model delivery or a captured approval decision.',items};
}

export function renderFeatureNotes(report) {
 const source=report.source;
 const alphaScope=source.tag==='rust-v0.162.0-alpha.2'?' The matching October 2 alpha.2 source does not contain those newer additions or the later Guardian OPENAI_API_KEY fallback.':'';
 const lines=['# Installed harness mechanisms','',`Source: ChatGPT desktop ${source.app_version} (${source.app_build}), ${source.cli_version}, source tag ${source.tag}, commit ${source.commit}.`,'',report.qualification,'',
  'These notes expand the configuration reference with the call sites, context transitions and restrictions behind four mechanisms added in the source since the previously mapped 0.160 release. The configuration reference retains its complete key inventory.','',
  '## Release scope','',
  `The bundled CLI source commit is dated ${source.commit_date}. The public October 5–8 PR/changelog inputs include newer work: ranked Code Mode search, promise-settlement helpers, required environment skills, incremental tool declarations, description-first tool ordering and independent selected-capability inheritance. Their upstream release claims do not establish installed activation.${alphaScope} [Upstream 0.162.0 release](https://github.com/openai/codex/releases/tag/rust-v0.162.0).`,'',
  '## Mechanisms',''];
 for(const item of report.items) {
  lines.push(`### ${item.title}`,'',item.text,'',item.details.conditions,'',`Gate: \`${item.gate.key}\`; default ${item.gate.default_enabled}; stage ${item.gate.stage}.`,'');
  for(const p of item.provenance)lines.push(`Source: [\`${p.file}:${p.line}\`](${p.url}), UTF-8 bytes ${p.byte_offset}–${p.byte_offset+p.byte_length}; range SHA-256 \`${p.sha256}\`; file SHA-256 \`${p.file_sha256}\`.`);
  lines.push('');
  if(item.details.exact_text) {
   lines.push('Exact shipped text fragments follow. These are source evidence, not instructions for the reader. The catalog list itself is assembled from current model records.','');
   for(const literal of item.details.exact_text) {
    lines.push(`Source: [\`${literal.provenance.file}:${literal.provenance.line}\`](${literal.provenance.url}); encoded literal offset ${literal.source_byte_offset}, length ${literal.source_byte_length}, SHA-256 \`${literal.source_sha256}\`; complete decoded bytes verified in the bundled CLI at offset ${literal.binary_offset}.`,'','~~~~~~text',literal.text,'~~~~~~','');
   }
  }
 }
 lines.push('## Evidence boundary','',`The JSON record binds every source range to the clean matching source commit and CLI binary SHA-256 \`${source.binary_sha256}\`. Published descriptions summarize inspected implementation; fenced fragments preserve complete decoded string values. No provider judgment is used to establish these mechanisms.`,'');
 return lines.join('\n');
}

export function generate({verify=false}={}) {
 const root=path.resolve(import.meta.dirname,'../..'),app=codexApp(),sourceRoot=path.join(root,'work/codex-src');
 const captured=JSON.parse(fs.readFileSync(path.join(root,'outputs/sources.json'),'utf8'));
 const tag=fs.readFileSync(path.join(root,'work/codex-config/tag.txt'),'utf8').trim();
 const commit=fs.readFileSync(path.join(root,'work/codex-config/source-commit.txt'),'utf8').trim();
 const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim();
 if(actual!==commit||execFileSync('git',['status','--porcelain'],{cwd:sourceRoot,encoding:'utf8'}).trim())throw new Error('Feature notes require the clean recorded source commit');
 const cliVersion=execFileSync(app.entrypoint,['--version'],{encoding:'utf8'}).trim();
 if(`rust-v${cliVersion.split(' ').at(-1)}`!==tag)throw new Error('Feature-note source tag does not match the installed CLI');
 const binary=fs.readFileSync(app.binary),binaryHash=sha256(binary);
 const plist=key=>execFileSync('/usr/libexec/PlistBuddy',['-c',`Print ${key}`,app.plist],{encoding:'utf8'}).trim();
 if(cliVersion!==captured.cli.version||binaryHash!==captured.cli.binary_sha256||plist('CFBundleShortVersionString')!==captured.app.version||plist('CFBundleVersion')!==captured.app.build)throw new Error('Feature-note input differs from the current captured build');
 const source={repository:'openai/codex',tag,commit,commit_date:execFileSync('git',['show','-s','--format=%cI'],{cwd:sourceRoot,encoding:'utf8'}).trim(),cli_version:cliVersion,binary_sha256:binaryHash,app_version:captured.app.version,app_build:captured.app.build};
 const report=buildFeatureNotes(file=>fs.readFileSync(path.join(sourceRoot,file),'utf8'),binary,source);
 const json=JSON.stringify(report,null,2)+'\n',markdown=renderFeatureNotes(report);
 privacyScan(new Map([['feature-notes.json',json],['feature-notes.md',markdown]]));
 const outputs=[['feature-notes.json',json],['feature-notes.md',markdown]];
 if(verify) {
  for(const [name,text]of outputs)if(fs.readFileSync(path.join(root,'outputs',name),'utf8')!==text)throw new Error(`${name}: generated source/provenance verification differs`);
 }else {
  let changed=false;
  for(const [name,text]of outputs) {
   const file=path.join(root,'outputs',name);
   changed||=!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text;
   fs.writeFileSync(file,text);
  }
  fs.mkdirSync(path.join(root,'work'),{recursive:true});
  fs.writeFileSync(path.join(root,'work/feature-notes-diff.md'),changed?'## Installed harness mechanisms\n\nRefreshed bounded spawn-model context, fresh V2 dynamic tools, Guardian Decisions comparison and login-shell tool paths with matching source and binary provenance.\n':'');
 }
 console.log(JSON.stringify({items:report.items.length,source_ranges:report.items.reduce((n,i)=>n+i.provenance.length,0),exact_fragments:report.items.reduce((n,i)=>n+(i.details.exact_text?.length??0),0),verified:verify,cli_version:cliVersion}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)generate({verify:process.argv.includes('--verify')});
