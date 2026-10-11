#!/usr/bin/env node
// Builds claude-code/outputs/local-sources.json: every local source Claude Code writes or reads that relates
// to a session, each with evidence from the extracted build (claude-code/work/extracted) and, for the desktop
// app's stores, from Claude.app's app.asar. Every evidence literal is looked up again on each run and its
// offset recomputed, so a new build that moves or drops one is reported (exit 1) instead of going stale.
// Trace's Sources lens reads this list (tools/sources).
//
//   node claude-code/extract/local-sources.cjs            write it
//   node claude-code/extract/local-sources.cjs --check    check it (npm run check runs this through the tests)
const fs=require('fs');const path=require('path');const ROOT=path.join(__dirname,'..','..');
const D=path.join(ROOT,'claude-code','work','extracted')+'/';
const OUT=path.join(ROOT,'claude-code','outputs','local-sources.json');
const VERSION=(()=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,'claude-code','work','current.json'),'utf8')).version;}catch{return null;}})();
// Evidence is found by content, so renamed chunks and minified identifiers move it instead of breaking it
// (evidence-match.cjs); only a literal gone from the whole build is reported.
const {evidenceFinder}=require('./evidence-match.cjs');const find=evidenceFinder(D);
const missing=[];
function ev(f,lit,hint){if(lit.length>=120)throw Error('literal too long '+lit);const e=find(f,lit,hint);if(!e)missing.push(f+' :: '+lit);return e;}
const S=[];
function add(o){o.evidence=(o.evidence||[]).map(e=>ev(...e)).filter(Boolean);
 if(o.evidence.length===0&&!(o.notes||'').startsWith('found on disk'))missing.push('NO EVIDENCE '+o.id);
 S.push({id:'claude-code.'+o.id,path:o.path,env:o.env||[],kind:o.kind,what:o.what,fields:o.fields||[],join:o.join,joinKey:o.joinKey||'',retention:o.retention||'',writer:o.writer||'',evidence:o.evidence,credential:!!o.credential,enabledBy:o.enabledBy||'always',notes:o.notes||''});}
const CFG=['CLAUDE_CONFIG_DIR'];
const CLEAN='Deleted by startup cleanup after cleanupPeriodDays (default 30 days)';const SIDE='Not stated separately; likely removed with the session folder by the project cleanup (cleanupPeriodDays, default 30)';const NS='not stated in code';
const DEL=['chunk-e4fkgvnr.js'];
// ---------- session folder in projects/ ----------
add({id:'transcript',path:'~/.claude/projects/<project>/<session id>.jsonl',env:CFG.concat(['cleanupPeriodDays']),kind:'jsonl',
 what:'The main session transcript: every user, assistant, tool-use/tool-result, system, attachment, summary and title record the harness keeps for the session, which is what it replays on resume.',
 fields:['type','uuid','parentUuid','sessionId','timestamp','cwd','gitBranch','version','isSidechain','message','toolUseResult','attachment','subtype'],
 join:'exact',joinKey:'file name is the session id; <project> is the cwd with non-alphanumerics replaced by "-"',retention:CLEAN,
 writer:'session storage (transcript namespace); read by --resume/--continue, /export, forks',
 evidence:[['chunk-w4t9a3px.js','namespace:"transcript",projectKey:e,sessionId:n'],['chunk-e4fkgvnr.js','project transcripts (.jsonl) and memory/'],['chunk-e4fkgvnr.js','.map((c)=>`${c}.jsonl`)'],['chunk-zfxvkdxa.js','!P.name.endsWith(".cast")&&!P.name.endsWith(".ccr-tip.json")']],
 notes:'Primary record of what was sent and received. Format changes between builds (record types, attachment kinds). The cleanup pass also recognizes a ".desktop-released…" sibling name that was not traced.'});
add({id:'subagent-transcript',path:'~/.claude/projects/<project>/<session id>/subagents/agent-<agent id>.jsonl',env:CFG,kind:'jsonl',
 what:'One transcript per subagent (Task/Agent tool, teammates) spawned in the session, with the subagent prompt, its tool calls and results.',
 fields:['agentId','sessionId','isSidechain','message','uuid','parentUuid'],join:'exact',joinKey:'parent folder is the session id; agent id matches the agentId in the parent transcript tool result',retention:SIDE,
 writer:'transcript namespace with agentId/agentRelPath',
 evidence:[['chunk-68gmwmt6.js','["agentId",e.agentId,"optional"],["agentRelPath",e.agentRelPath,"optional"]'],['chunk-6ggjj4mg.js','"subagents","workflows"']],
 notes:'Older builds wrote subagent turns into the main transcript as sidechain records instead of a separate folder.'});
add({id:'subagent-meta',path:'~/.claude/projects/<project>/<session id>/subagents/agent-<agent id>.meta.json',env:CFG,kind:'json',
 what:'Launch metadata for each subagent: its type, description, model, permission mode and team.',
 fields:['agentType','description','name','spawnDepth','model','taskKind','teamName','color','planModeRequired','permissionMode'],join:'exact',joinKey:'same folder and agent id as the subagent transcript',retention:SIDE,
 writer:'subagent launcher',evidence:[['chunk-6ggjj4mg.js','"subagents","workflows"']],
 notes:'The .meta.json file name and fields were confirmed on disk; the evidence item is the subagents folder, the exact writer literal was not isolated.'});
add({id:'workflow-run',path:'~/.claude/projects/<project>/<session id>/subagents/workflows/<run id>/{agent-<agent id>.jsonl,agent-<agent id>.meta.json,journal.jsonl}',env:CFG,kind:'dir',
 what:'Per-run folder for a Workflow script: each workflow agent transcript and the run journal the workflow engine replays on resume.',
 fields:['journal lines','agent transcripts'],join:'exact',joinKey:'under the session folder; run id wf_<id>',retention:SIDE,writer:'Workflow tool runtime',
 evidence:[['chunk-6ggjj4mg.js','p(a,q(),"subagents","workflows",r)'],['chunk-dnv148zc.js','this.path=Sr(I0(e),"journal.jsonl")']]});
add({id:'workflow-state',path:'~/.claude/projects/<project>/<session id>/workflows/{<run id>.json,scripts/<name>}',env:CFG,kind:'dir',
 what:'Workflow run status records and the workflow scripts the session ran.',fields:['runId','timestamp','status'],join:'exact',joinKey:'session folder',retention:SIDE,writer:'Workflow tool (sidecar namespace)',
 evidence:[['chunk-6ggjj4mg.js','xe.sidecar(r,a,["workflows",`${n}.json`])'],['chunk-6ggjj4mg.js','runId:r,timestamp:new Date().toI']]});
add({id:'world-journal',path:'~/.claude/projects/<project>/<session id>/world.jsonl',env:CFG,kind:'jsonl',
 what:'The session journal named "world": settled and retracted rows of the session evaluation state that the rule/eval engine appends and replays.',
 fields:['k (settled|retracted)','addr','status','value','error'],join:'exact',joinKey:'session folder',retention:SIDE,writer:'session journal (xe.sessionJournal(..., "world"))',
 evidence:[['chunk-01gsm8fb.js','Xr="world.jsonl"'],['chunk-01gsm8fb.js','xe.sessionJournal(n,Yr(r),"world")']],notes:'New store; the feature that drives it was not traced further. Size cap 4194304 bytes appears next to it.'});
add({id:'tool-results',path:'~/.claude/projects/<project>/<session id>/tool-results/<id>.{txt,json} and pdf-<uuid>/page-<nn>.jpg',env:CFG,kind:'dir',
 what:'Tool outputs too large to keep inline, saved to disk and referenced from the transcript; also PDF pages rendered to images for the model.',
 fields:['raw tool output'],join:'exact',joinKey:'session folder; file id appears in the transcript tool_result',retention:SIDE,writer:'tool result persistence',
 evidence:[['chunk-68gmwmt6.js','yue="tool-results"']]});
add({id:'mcp-tasks',path:'~/.claude/projects/<project>/<session id>/mcp-tasks/mcp-task-<task id>.meta.json',env:CFG,kind:'json',
 what:'Metadata for long-running MCP tasks started by the session.',join:'exact',joinKey:'session folder; task id',retention:SIDE,writer:'MCP task support (sidecar namespace)',
 evidence:[['chunk-3m1jf8km.js','["mcp-tasks",`mcp-task-${a}.meta.json`]']]});
add({id:'precompact',path:'~/.claude/projects/<project>/<session id>.precompact.json',env:CFG,kind:'json',
 what:'A project-level sibling file of the session, named for its pre-compaction state.',join:'exact',joinKey:'file name is the session id',retention:CLEAN,writer:'compaction (name reserved in the storage-key schema)',
 evidence:[['chunk-68gmwmt6.js','ft=[".ccr-tip.json",".precompact.json",ue]'],['chunk-68gmwmt6.js',"those name a session's project-level sibling files"]],notes:'Contents not traced; only the reserved name is certain. Not seen on this machine.'});
add({id:'ccr-tip',path:'~/.claude/projects/<project>/<session id>.ccr-tip.json',env:CFG,kind:'json',
 what:'A project-level sibling file for a cloud (CCR) session, apparently its latest synced position.',join:'exact',joinKey:'file name is the session id',retention:CLEAN,writer:'cloud session sync',
 evidence:[['chunk-68gmwmt6.js','ft=[".ccr-tip.json",".precompact.json",ue]']],notes:'Contents not traced. Not seen on this machine.'});
add({id:'terminal-recording',path:'~/.claude/projects/<project>/<session id>/<epoch ms>.cast',env:CFG.concat(['CLAUDE_PTY_RECORD']),kind:'text',
 what:"The session's terminal recording stream (asciicast), one file per recording, named by its start time in epoch milliseconds.",join:'exact',joinKey:'session folder; stamp = start time',retention:CLEAN,writer:'recording namespace',
 evidence:[['chunk-68gmwmt6.js',"inside a session's folder is that session's terminal recording stream"],['chunk-apqxkhrm.js','"CLAUDE_PTY_RECORD"']],enabledBy:'terminal recording (likely CLAUDE_PTY_RECORD; the link between the variable and this file is inferred)',notes:'Would show exactly what the terminal displayed. Not seen on this machine.'});
add({id:'dir-sync-record',path:'~/.claude/projects/<project>/<session id>.dir-sync.json',env:CFG,kind:'json',
 what:"A cloud session's directory-sync record at the project level.",join:'exact',joinKey:'projectKey + sessionId',retention:SIDE,writer:'cloud folder sync (dirSyncRecord namespace)',
 evidence:[['chunk-68gmwmt6.js','NXn=".dir-sync.json"'],['chunk-w4t9a3px.js','dirSyncRecord:(e,n)=>({namespace:"dirSyncRecord"']],notes:'Exact file placement inferred from the reserved suffix. Not seen on this machine.'});
add({id:'project-reserved',path:'~/.claude/projects/<project>/{bridge-pointer.json,.session-aliases,cloud-snapshots/,side.git,archive-sync,folder-sync,tiny_memory,bagel}',env:CFG,kind:'dir',
 what:'Project-level entries reserved beside session transcripts: the remote-control bridge pointer, session aliases, cloud snapshots and sync state, a side git store, and two unnamed memory stores.',
 join:'approximate',joinKey:'project folder; .session-aliases and bridge-pointer.json map to session ids',retention:'not stated in code',writer:'bridgePointer / sessionAliases namespaces; cloud sync',
 evidence:[['chunk-68gmwmt6.js','ct=new Set(["memory","tiny_memory","bagel",hue,"bridge-pointer.json",".session-aliases"])'],['chunk-68gmwmt6.js','var hue="cloud-snapshots",TXe="side.git",nWo="archive-sync",oSn="folder-sync"']],
 notes:'Names come from the storage-key schema; purposes of tiny_memory and bagel were not traced. None seen on this machine.'});
add({id:'session-log',path:'~/.claude/projects/<project>/<YYYY>/<MM>/<DD>/<session id first 8>[-<title slug>]',env:CFG,kind:'log',
 what:'A dated per-session log keyed by project, year, month, day and a log name made from the first 8 characters of the session id and a title slug.',join:'exact',joinKey:'logName starts with the first 8 characters of the session id',retention:'not stated in code',writer:'sessionLog namespace',
 evidence:[['chunk-68gmwmt6.js','must be the session-log stem <sessionId8>[-<title-slug>]'],['chunk-w4t9a3px.js','sessionLog:(e,n,a)=>({namespace:"sessionLog"']],notes:'Only the key schema was found; the on-disk path is an inference. Not seen on this machine; likely new or gated.'});
add({id:'auto-memory',path:'~/.claude/projects/<project>/memory/{MEMORY.md,<topic>.md,.consolidate-lock}',env:CFG.concat(['autoMemoryEnabled','autoMemoryDirectory']),kind:'dir',
 what:'Auto-memory files the harness loads into the prompt at session start and the model edits during sessions; the lock guards background consolidation ("auto dream").',
 join:'snapshot',joinKey:'project folder; the transcript shows which memory files were attached',retention:'kept; deleted with the project',writer:'auto memory; memory consolidation',
 evidence:[['chunk-02rxxxnf.js','auto memory files are allowed for reading'],['chunk-jyws720p.js','".consolidate-lock"'],['chunk-w4t9a3px.js','case"memory":return[e.namespace,e.projectKey,e.relPath]']],
 notes:'Current files, not the version the session saw; compare with memory attachments in the transcript.'});
add({id:'session-memory',path:'~/.claude/projects/<project>/<session id>/session-memory/<name>.md',env:CFG,kind:'text',
 what:'Per-session memory notes found inside session folders.',join:'exact',joinKey:'session folder',evidence:[],notes:'found on disk, origin not traced. In 2.1.284 the only related literal is the "session-memory-viewer" UI name; likely written by an earlier build or a gated feature. None of the surviving top-level transcripts on this machine has one; the 3 folders belong to sessions whose top-level transcript is gone. Version-dependent.'});
add({id:'sessions-index',path:'~/.claude/projects/<project>/sessions-index.json',env:CFG,kind:'json',
 what:'Per-project index of sessions with first prompt, summary, message count, branch and times.',fields:['version','originalPath','entries[].sessionId','fullPath','fileMtime','firstPrompt','summary','messageCount','created','modified','gitBranch','projectPath','isSidechain'],
 join:'exact',joinKey:'entries[].sessionId',evidence:[],notes:'found on disk, origin not traced. No "sessions-index" literal in 2.1.284, so an older build wrote it and it may be stale. On this machine it exists only in projects with 2.1.258 or 2.1.280 sessions, never 2.1.284, and every copy was last modified between January and February 2026. Version-dependent.'});
// ---------- config dir, per session ----------
add({id:'session-registry',path:'~/.claude/sessions/<pid>.json',env:CFG,kind:'json',
 what:'Live registry entry for each running Claude Code process: its session id, cwd, version, entrypoint, name, status and messaging socket.',
 fields:['pid','sessionId','cwd','startedAt','procStart','version','peerProtocol','peerFeatures','kind','entrypoint','hostSessionId','pidDomain','messagingSocketPath','name','nameSource','status','updatedAt','bridgeSessionId','logPath','agent','jobId'],
 join:'exact',joinKey:'sessionId field',retention:'while the process runs; stale files are swept',writer:'session registry; read by claude agents / peers / daemon',
 evidence:[['chunk-f5tnbmwk.js','messagingSocketPath:aE.CLAUDE_CODE_MESSAGING_SOCKET'],['chunk-f5tnbmwk.js','logPath:a.CLAUDE_CODE_SESSION_LOG']]});
add({id:'session-messaging-key',path:'~/.claude/sessions/<pid>.<hash>.key',env:CFG,kind:'binary',
 what:'Peer-messaging key for a running session (peer token), used to authenticate local session-to-session messages.',join:'credential',joinKey:'pid matches sessions/<pid>.json',writer:'uds-auth',credential:true,
 evidence:[['chunk-erx7m2ye.js','messaging key folder could not be made through storage']],notes:'Never read or print.'});
add({id:'shell-snapshot',path:'~/.claude/shell-snapshots/snapshot-<shell>-<epoch ms>-<random6>[-<tag>].sh',env:CFG,kind:'text',
 what:"Snapshot of the user's shell functions, aliases, options and PATH that the Bash tool sources before every command in the session.",
 join:'approximate',joinKey:'epoch ms in the name is close to session start',retention:CLEAN,writer:'Bash tool shell snapshot',
 evidence:[['chunk-ra61p37g.js','`snapshot-${r}-${b}-${w}${F!==void 0?`-${F}`:""}.sh`'],['chunk-e4fkgvnr.js','shell-snapshots/ are not project-scoped and will not be touched']],
 notes:'2.1.284 can add a session-derived suffix; files on disk from earlier builds lack it, so the join stays by time.'});
add({id:'session-env',path:'~/.claude/session-env/<session id>/',env:CFG.concat(['CLAUDE_ENV_FILE']),kind:'dir',
 what:'Per-session environment files that hooks write and the Bash tool sources, so hook-set variables reach commands.',join:'exact',joinKey:'folder name is the session id',retention:CLEAN,writer:'hooks (SessionStart etc.) via the env file; Bash tool reads',
 evidence:[['chunk-9gy1t01w.js','XS=["shell-snapshots","session-env","projects","file-history","backups"]'],['chunk-68gmwmt6.js','"rules","session-env","uploads"'],['chunk-zfxvkdxa.js','M("session-env")'],['chunk-k5bbc3f7.js','CLAUDE_ENV_FILE']]});
add({id:'file-history',path:'~/.claude/file-history/<session id>/<sha256(path) first 16 hex>@v<n>',env:CFG,kind:'dir',
 what:'Backups of every file the session edited, one version per edit, used by rewind/checkpoints.',join:'exact',joinKey:'folder name is the session id; the transcript file-history-snapshot records map paths to backup names',retention:CLEAN,writer:'file checkpointing',
 evidence:[['chunk-ra61p37g.js','.digest("hex").slice(0,16)}@v${n}`'],['chunk-e4fkgvnr.js','file edit history for session']]});
add({id:'todos',path:'~/.claude/todos/<session id>-agent-<agent id>.json',env:CFG,kind:'json',
 what:'TodoWrite list for the session (main agent id equals the session id) or a subagent.',fields:['content','status','activeForm'],join:'exact',joinKey:'file name starts with the session id',retention:'Swept as a legacy folder (with statsig, logs, access-audit)',writer:'TodoWrite (older task tracking)',
 evidence:[['chunk-zzv0mx12.js','"projects","sessions","todos","shell-snapshots"'],['chunk-yafdqrx7.js','_6n=["todos","statsig","logs","access-audit"]']],
 notes:'Version-dependent: 2.1.284 tracks tasks in tasks/ and treats todos/ as legacy to sweep; the file name pattern comes from disk. On this machine only 2.1.41 sessions have todos files.'});
add({id:'tasks',path:'~/.claude/tasks/<list id>/<task id>.json (+ list meta and high-water mark)',env:CFG.concat(['CLAUDE_CODE_TASK_LIST_ID']),kind:'dir',
 what:'The task list the model manages with the Task tools during the session, one JSON file per task.',fields:['id','subject','description','status','owner','blocks','blockedBy'],
 join:'exact',joinKey:'list id derives from the session (on disk: session-<first 8 of session id>) or a team name',retention:CLEAN,writer:'Task tools; read by teammates',
 evidence:[['chunk-e4fkgvnr.js','tasks for session'],['chunk-02rxxxnf.js','Task files are allowed for reading'],['chunk-68gmwmt6.js','a task key names an item, the list metadata or the list high-water mark'],['chunk-6bdxb0yq.js','CLAUDE_CODE_TASK_LIST_ID']]});
add({id:'teams',path:'~/.claude/teams/<team>/{config.json,inboxes/<teammate>.json}',env:CFG,kind:'dir',
 what:'Agent-team config and each teammate mailbox of messages exchanged during the session.',join:'approximate',joinKey:'team name (on disk often session-<first 8 of session id>); lead session id in config',retention:NS,writer:'agent teams / TeammateMailbox',
 evidence:[['chunk-acfy6mvh.js','return F(v(e),"config.json")'],['chunk-sv69c8sw.js','[TeammateMailbox] getInboxPath'],['chunk-02rxxxnf.js','Team files are allowed for reading']]});
add({id:'plans',path:'~/.claude/plans/<slug>.md',env:CFG.concat(['plansDirectory']),kind:'text',
 what:'Plan-mode plans the model writes; the plan slug is recorded in the transcript.',join:'approximate',joinKey:'slug referenced by the transcript; file mtime',retention:CLEAN,writer:'plan mode',
 evidence:[['chunk-kf8pdq4s.js','return p(be(),"plans")']],notes:'A project-local plans/ folder also appeared under one project folder on disk.'});
add({id:'debug-log',path:'~/.claude/debug/<session id>.txt',env:CFG.concat(['CLAUDE_CODE_DEBUG_LOGS_DIR']),kind:'log',
 what:'Debug log for the session: API calls, hooks, MCP, permission decisions and errors, as the debug channel writes them.',join:'exact',joinKey:'file name is the session id',retention:CLEAN,writer:'debug channel (xe.log(id,"debug"))',
 evidence:[['chunk-e4fkgvnr.js','debug log for session'],['chunk-e4fkgvnr.js','k(o,"debug",`${h}.txt`)'],['chunk-apqxkhrm.js','"CLAUDE_CODE_DEBUG_LOGS_DIR"']],enabledBy:'debug logging (--debug, /debug) or CLAUDE_CODE_DEBUG_LOGS_DIR'});
add({id:'prompt-dump',path:'~/.claude/dump-prompts/<session id or agent id>.jsonl',env:CFG,kind:'jsonl',
 what:'The apiDump channel: API request bodies (and responses) as sent, one file per session and one per subagent.',join:'exact',joinKey:'file name is the session id (or the subagent agent id)',retention:CLEAN,writer:'prompt dump (apiDump channel)',
 evidence:[['chunk-jkvndy4p.js','"dump-prompts",`${e??q()}.jsonl`'],['chunk-68gmwmt6.js',"else the session's (today's dump-prompts/<id>.jsonl)"],['chunk-jkvndy4p.js','function V(e,r,i,n,o){try{return}catch{}finally{i.dumpInFlight=!1}}']],enabledBy:'nothing in the public build: the writer is compiled to an immediate return',
 notes:'The most direct record of what was put in front of the model, but in the public 2.1.284 build the function that writes each dump (V) is compiled to an immediate return, so no dump is written whatever is set; the path, the fetch hook and the apiDump storage channel remain. Not seen on this machine.'});
add({id:'api-dumps',path:'~/.claude/api-dumps/',env:CFG,kind:'dir',what:'A reserved config-dir folder named for API dumps.',join:'approximate',joinKey:'not traced',writer:'not traced',
 evidence:[['chunk-ra61p37g.js','"agent-memory-project","api-dumps","backups"']],enabledBy:'not traced',notes:'Only appears in the sync and host-snapshot exclusion sets. Not seen on this machine.'});
add({id:'telemetry-failed-events',path:'~/.claude/telemetry/1p_failed_events.<session id>.<batch uuid>.json',env:CFG.concat(['DISABLE_TELEMETRY','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC']),kind:'json',
 what:'First-party analytics events that failed to send, queued on disk for retry, including session, model and prompt ids.',fields:['event_name','session_id','model','cc_prompt_id','parent_agent_id','subscription_type'],
 join:'exact',joinKey:'session id in the file name',retention:CLEAN,writer:'1P event logger (telemetry channel)',
 evidence:[['chunk-f5tnbmwk.js','Ad="1p_failed_events."'],['chunk-f5tnbmwk.js','`${Ad}${q()}.${Ao}.json`']]});
add({id:'statsig',path:'~/.claude/statsig/',env:CFG,kind:'dir',what:'Legacy feature-gate cache from the Statsig client.',join:'snapshot',joinKey:'none; values current when written',retention:'swept as a legacy folder',writer:'older builds',
 evidence:[['chunk-yafdqrx7.js','_6n=["todos","statsig","logs","access-audit"]']],notes:'Version-dependent: replaced by cachedGrowthBookFeatures in ~/.claude.json.'});
add({id:'traces',path:'~/.claude/traces/',env:CFG.concat(['CLAUDE_CODE_PERFETTO_TRACE']),kind:'dir',what:'Local trace files, cleaned by the cleanup pass.',join:'approximate',joinKey:'file time',retention:CLEAN,writer:'not traced (possibly Perfetto tracing)',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"traces")']],enabledBy:'not traced'});
add({id:'startup-perf',path:'~/.claude/startup-perf/<session id>.{txt,json}',env:CFG,kind:'json',what:'Startup profiling report for the session: timing marks through the first turn.',join:'exact',joinKey:'file name is the session id',retention:CLEAN,writer:'startup profiler',
 evidence:[['chunk-pz5v8y6d.js','G(be(),"startup-perf",`${q()}.json`)']],enabledBy:'startup profiling (switch not traced)'});
add({id:'usage-data',path:'~/.claude/usage-data/{session-meta,facets}/<session id>.json',env:CFG,kind:'json',
 what:'Per-session metadata and model-extracted facets (goals, outcome, helpfulness) that /insights builds from transcripts.',join:'exact',joinKey:'file name is the session id',retention:CLEAN,writer:'/insights',
 evidence:[['chunk-50qtypn7.js','xe.userConfigDir("usage-data",["session-meta",`${e}.json`])'],['chunk-50qtypn7.js','xe.userConfigDir("usage-data",["facets",`${e}.json`])']],enabledBy:'running /insights'});
add({id:'prompt-history',path:'~/.claude/history.jsonl',env:CFG,kind:'jsonl',
 what:'Every prompt typed at the input box across projects, with pasted content references, used for up-arrow history.',fields:['display','pastedContents','timestamp','project','sessionId'],
 join:'exact',joinKey:'sessionId field (older lines may lack it: then project + timestamp)',retention:'Pruned line by line by history retention (cleanupPeriodDays, default 30)',writer:'prompt input history',
 evidence:[['chunk-9gy1t01w.js','MA(be(),"history.jsonl")'],['chunk-e4fkgvnr.js','prompt history across all projects'],['chunk-zfxvkdxa.js','History retention prune skipped']]});
add({id:'paste-cache',path:'~/.claude/paste-cache/<sha256 first 16 hex>.txt',env:CFG,kind:'text',what:'Full text of large pastes, stored by content hash and referenced from history.jsonl.',
 join:'approximate',joinKey:'contentHash in this session\'s history.jsonl pastedContents',retention:NS,writer:'prompt input paste store',
 evidence:[['chunk-9gy1t01w.js','var SW="paste-cache"'],['chunk-9gy1t01w.js','invalid paste-content hash']]});
add({id:'image-cache',path:'~/.claude/image-cache/<session id>/',env:CFG,kind:'dir',what:'Images pasted or attached in the session, cached on disk.',join:'exact',joinKey:'folder name is the session id',retention:'other sessions\' folders swept by cleanup',writer:'image paste handling',
 evidence:[['chunk-zfxvkdxa.js','De="image-cache"']]});
add({id:'file-transfers',path:'~/.claude/file-transfers/',env:CFG,kind:'dir',what:'Attachments received from peer sessions.',join:'approximate',joinKey:'file time; sanitized original name',retention:'deleted after a fixed number of days',writer:'peer file transfer',
 evidence:[['chunk-e915stm6.js','H="file-transfers"'],['chunk-e915stm6.js','[peer-file-transfer]']]});
add({id:'uploads',path:'~/.claude/uploads/',env:CFG,kind:'dir',what:'Uploaded files kept in the config dir.',join:'approximate',joinKey:'file time',retention:CLEAN,writer:'not traced',
 evidence:[['chunk-68gmwmt6.js','"rules","session-env","uploads"'],['chunk-zfxvkdxa.js','M("uploads")']]});
add({id:'shares',path:'~/.claude/shares/<name>.zip',env:CFG,kind:'binary',what:'Zip bundles made to share a session or report.',join:'approximate',joinKey:'file time',retention:CLEAN,writer:'share / export',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"shares")']]});
add({id:'feedback-drafts',path:'~/.claude/feedback/drafts/<draft id>.json',env:CFG,kind:'json',what:'Unsent /bug feedback drafts.',join:'approximate',joinKey:'file time',retention:CLEAN,writer:'/bug',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"feedback","drafts")']]});
add({id:'feedback-bundles',path:'~/.claude/feedback-bundles/',env:CFG,kind:'binary',what:'Local /bug bundles holding transcript.json, subagent transcripts, the last API request and the raw transcript JSONL.',
 fields:['transcript','subagentTranscripts','lastApiRequest','rawTranscriptJsonl'],join:'approximate',joinKey:'bundle time; transcript inside carries the session id',retention:CLEAN,writer:'/bug',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"feedback-bundles")'],['chunk-6bdxb0yq.js','subagentTranscripts:pt,lastApiRequest:ht,rawTranscriptJsonl:ft']],enabledBy:'running /bug'});
add({id:'claude-json-backups',path:'~/.claude/backups/.claude.json.backup.<epoch ms>',env:CFG,kind:'json',what:'Rotating copies of ~/.claude.json, including per-project last-session keys as they were then.',
 join:'snapshot',joinKey:'epoch ms in the name',retention:'at most 5 kept; rotate out automatically',writer:'global config save',
 evidence:[['chunk-f5tnbmwk.js','`${g}.backup.${Date.now()}`'],['chunk-e4fkgvnr.js','at most 5 are kept and they rotate out automatically']]});
// ---------- ~/.claude.json keys ----------
add({id:'claude-json-last-session',path:'~/.claude.json#projects.<project path>.{lastSessionId,lastCost,lastModelUsage,...}',env:CFG,kind:'json-key',
 what:'Per-project stats of the last session that ended in that folder: id, cost, durations, token totals, model usage, lines changed.',
 fields:['lastSessionId','lastCost','lastAPIDuration','lastDuration','lastTotalInputTokens','lastTotalOutputTokens','lastTotalCacheCreationInputTokens','lastTotalCacheReadInputTokens','lastTotalWebSearchRequests','lastModelUsage','lastSessionMetrics','lastLinesAdded','lastLinesRemoved','lastGracefulShutdown','lastVersionBase','lastFpsAverage'],
 join:'exact',joinKey:'lastSessionId equals the session id (only for the most recent session per project)',retention:'overwritten by the next session in that project',writer:'session exit',
 evidence:[['chunk-f5tnbmwk.js','"lastFpsLow1Pct","lastSessionId","lastGracefulShutdown"'],['chunk-ra61p37g.js','costUSD:r.costUSD})),lastSessionId:q()}']]});
add({id:'claude-json-project',path:'~/.claude.json#projects.<project path>.{allowedTools,mcpServers,hasTrustDialogAccepted,exampleFiles,...}',env:CFG,kind:'json-key',
 what:'Per-project config the session started with: trust, allowed tools, project MCP servers and approvals, example files.',fields:['allowedTools','mcpServers','enabledMcpjsonServers','disabledMcpjsonServers','hasTrustDialogAccepted','hasClaudeMdExternalIncludesApproved','exampleFiles'],
 join:'snapshot',joinKey:'project path',retention:'kept until the project entry is removed',writer:'global config',
 evidence:[['chunk-e4fkgvnr.js','project entry in ~/.claude.json (trust, history, MCP servers)']]});
add({id:'claude-json-caches',path:'~/.claude.json#{cachedGrowthBookFeatures,cachedExperimentData,clientDataCacheSlots,additionalModelOptionsCache,modelAccessCache,orgModelDefaultCache,autoCompactWindowsCache,...}',env:CFG,kind:'json-key',
 what:'Cached server responses that shape a session: feature flags and experiments, client data, model options and access, org defaults, auto-compact windows.',
 fields:['cachedGrowthBookFeatures','cachedGrowthBookFeaturesAt','cachedExperimentFeatures','cachedExperimentData','cachedDynamicConfigs','cachedStatsigGates','clientDataCacheSlots','additionalModelOptionsCache','modelAccessCache','orgModelDefaultCache','autoCompactWindowsCache','metricsStatusCache','passesEligibilityCache','groveConfigCache'],
 join:'snapshot',joinKey:'none; cachedGrowthBookFeaturesAt gives the fetch time',retention:'overwritten on each refresh',writer:'feature-flag client; account/model fetches',
 evidence:[['chunk-f5tnbmwk.js','cachedGrowthBookFeatures:n,cachedExperimentFeatures'],['chunk-9rz2hpfp.js','i.clientDataCacheSlots=void 0']],notes:'Flag values the session ran with are not kept; only the latest cache.'});
add({id:'claude-json-identity',path:'~/.claude.json#{userID,anonymousId,machineID,oauthAccount,skillUsage,pluginUsage,tipsHistory}',env:CFG,kind:'json-key',
 what:'Ids attached to telemetry for every session, the account the session used, and usage counters bumped by sessions.',join:'snapshot',joinKey:'none',writer:'global config',
 evidence:[['chunk-f5tnbmwk.js','"lastFpsLow1Pct","lastSessionId","lastGracefulShutdown"']],notes:'Evidence is the global-config key list; values not read.'});
// ---------- caches and state ----------
add({id:'model-catalog',path:'~/.claude/cache/model-catalog/<id>.json',env:CFG,kind:'json',what:'Cached model catalog that decides which models and options the session can pick.',join:'snapshot',joinKey:'none',retention:'refreshed',writer:'model catalog fetch',
 evidence:[['chunk-f5tnbmwk.js','"model-catalog"']]});
add({id:'cache-dir',path:'~/.claude/cache/{changelog.md,my-closed-issues.json,team-discovery.json,org-memory-discovery.json}',env:CFG,kind:'dir',what:'Other cached server responses, including org memory-store discovery that can add memory to the session.',join:'snapshot',joinKey:'none',retention:'refreshed; some swept by cleanup',writer:'various fetchers',
 evidence:[['chunk-02rxxxnf.js','as="org-memory-discovery.json"'],['chunk-zfxvkdxa.js','m(be(),"cache","team-discovery.json")']]});
add({id:'mcp-auth-cache',path:'~/.claude/mcp-needs-auth-cache.json',env:CFG,kind:'json',what:'Which MCP servers need authentication, which decides whether their tools reach the session.',join:'snapshot',joinKey:'none',retention:CLEAN,writer:'MCP client',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"mcp-needs-auth-cache.json")']]});
add({id:'mcp-discovery',path:'~/.claude/{mcp-discovery-cache/,state/mcp-discover-verdicts.json}',env:CFG,kind:'dir',what:'MCP discovery results and verdicts that affect which servers are offered.',join:'snapshot',joinKey:'none',retention:CLEAN,writer:'MCP discovery',
 evidence:[['chunk-zfxvkdxa.js','m(be(),"mcp-discovery-cache")'],['chunk-zfxvkdxa.js','m(be(),"state","mcp-discover-verdicts.json")']]});
add({id:'mcp-logs',path:'<user cache dir>/claude-cli-nodejs/<sanitized cwd>/{mcp-logs-<server>,errors}/<timestamp>.jsonl',env:[],kind:'jsonl',
 what:'Per-server MCP logs and error logs for runs started in that folder (macOS: ~/Library/Caches/claude-cli-nodejs).',join:'approximate',joinKey:'cwd folder + file timestamp',retention:'not stated in code',writer:'MCP client logging',
 evidence:[['chunk-c44rdggd.js','mcpLogs:(e)=>T(f(),`mcp-logs-${_(e)}`)'],['chunk-1xs7prve.js','g(WXe.mcpLogs(e),a()+".jsonl")']],notes:'Outside the config dir; CLAUDE_CONFIG_DIR does not move it.'});
add({id:'state-dir',path:'~/.claude/state/ and ~/.claude/{.last-cleanup,.last-update-result.json,active-time.json,gh-pr-status-cache.json,loop.md}',env:CFG,kind:'dir',
 what:'Small state records: active-time windows, PR status cache, loop task file, scheduled-task status, keybindings, cleanup and update markers.',join:'approximate',joinKey:'active-time windows by time; others none',retention:'active-time keeps a year of windows',writer:'various (state namespace)',
 evidence:[['chunk-4y8fw9xy.js','var w="active-time.json"'],['chunk-9gy1t01w.js','Qq(be(),"gh-pr-status-cache.json")'],['chunk-s3c3fm9y.js','return b(be(),"loop.md")']],
 notes:'loop.md (also <project>/.claude/loop.md) is read into /loop prompts. With the storage-v5 backend these become state keys such as active-time-ledger and loop-file.'});
add({id:'stats-cache',path:'~/.claude/stats-cache.json',env:CFG,kind:'json',what:'Aggregated daily usage stats computed from transcripts for /stats.',join:'approximate',joinKey:'per-day buckets',retention:'recomputed',writer:'/stats',
 evidence:[['chunk-79xjf52g.js','Mm="stats-cache.json"']]});
add({id:'managed-policy',path:'~/.claude/{policy-limits.json,remote-settings.json,remote-settings-consent.json,remote-settings-helper-consent}',env:CFG,kind:'json',
 what:'Server-delivered policy limits and managed settings (and consent records) that constrain the session.',join:'snapshot',joinKey:'none',retention:'refreshed',writer:'policy and remote-settings fetchers',
 evidence:[['chunk-tweqa2pw.js','bqn="policy-limits.json"'],['chunk-dq5fzxjx.js','ggt="remote-settings.json"'],['chunk-9gy1t01w.js','Tsn="remote-settings-consent.json"']]});
add({id:'computer-use-lock',path:'~/.claude/computer-use.lock',env:CFG,kind:'json',what:'Lock naming the session that holds computer use.',fields:['sessionId','pid'],join:'exact',joinKey:'sessionId field',retention:'removed on release',writer:'computer use',
 evidence:[['chunk-enj3b7xa.js','I="computer-use.lock"'],['chunk-enj3b7xa.js','"sessionId"in e&&typeof e.sessionId==="string"']]});
add({id:'jobs',path:'~/.claude/jobs/<job id>/{state.json,timeline.jsonl,recap.trigger,tmp/} and ~/.claude/jobs/pins.json',env:CFG.concat(['CLAUDE_JOB_DIR']),kind:'dir',
 what:'Background jobs: state, a timeline stream of what the job did, a recap trigger and scratch files; pins list.',join:'approximate',joinKey:'job id; sessions/<pid>.json jobId links a job to its session',retention:'not stated in code',writer:'background jobs / daemon',
 evidence:[['chunk-68gmwmt6.js',"is the job's timeline stream"],['chunk-5yt83nd2.js','cSt="recap.trigger"']]});
add({id:'daemon',path:'~/.claude/daemon/{roster.json,attach-journal/,dispatch/} and ~/.claude/daemon.log',env:CFG,kind:'dir',what:'The background daemon roster of managed sessions and jobs, its attach journal, dispatch queue and log.',
 join:'approximate',joinKey:'roster entries carry session/job ids; log by time',retention:'not stated in code',writer:'claude daemon',
 evidence:[['chunk-vevdyzq4.js','"attach-journal"'],['chunk-zfxvkdxa.js','"roster.json"'],['chunk-zfxvkdxa.js','"daemon.log"']]});
add({id:'daemon-control-key',path:'~/.claude/daemon/control.key',env:CFG,kind:'binary',what:'Key that authenticates control of the daemon.',join:'credential',joinKey:'none',writer:'claude daemon',credential:true,
 evidence:[['chunk-vevdyzq4.js','"control.key"']],notes:'Never read or print.'});
add({id:'ide-lock',path:'~/.claude/ide/<port>.lock',env:CFG,kind:'json',what:'Lockfiles that IDE extensions write so the CLI can find and connect to the IDE MCP server.',fields:['pid','workspaceFolders','ideName','transport','authToken'],
 join:'snapshot',joinKey:'workspaceFolders vs session cwd',retention:'removed when the IDE exits; stale ones cleaned',writer:'IDE extension writes; CLI reads',credential:true,
 evidence:[['chunk-07xvx33k.js','ideName:k.name,authToken:k.authToken'],['chunk-1a7xf92b.js','le(tn.workspaceFolders)']],notes:'Holds an auth token; never print values.'});
add({id:'agent-memory',path:'~/.claude/agent-memory/<agent type>/, <project>/.claude/agent-memory/<agent type>/, <project>/.claude/agent-memory-local/<agent type>/',env:CFG,kind:'dir',
 what:'Memory folders for custom subagents, loaded into that subagent prompt.',join:'snapshot',joinKey:'agent type',retention:'kept',writer:'subagent memory',
 evidence:[['chunk-02rxxxnf.js','Ue(oe(),".claude","agent-memory",r)']]});
add({id:'memory-files',path:'~/.claude/CLAUDE.md, ~/.claude/rules/, <project>/CLAUDE.md, <project>/CLAUDE.local.md, <project>/.claude/rules/',env:CFG,kind:'text',
 what:'Instruction files read into the prompt at session start.',join:'snapshot',joinKey:'the transcript and system prompt show what was loaded',retention:'user-owned',writer:'read by the memory loader',
 evidence:[['chunk-02rxxxnf.js','The user memory file is allowed for']],notes:'Current files, not the version the session saw.'});
add({id:'settings-files',path:'~/.claude/settings.json, ~/.claude/settings.local.json, <project>/.claude/settings.json, <project>/.claude/settings.local.json, <project>/.mcp.json, managed settings',env:CFG,kind:'json',
 what:'Settings, permissions, hooks and MCP config read at session start; permission approvals are written back to settings.local.json.',join:'snapshot',joinKey:'none',retention:'user-owned',writer:'settings loader; permission prompts write',
 evidence:[['chunk-zzv0mx12.js','pu=new Set(["settings.json","settings.local.json","claude.md"])']],notes:'See settings.json and hooks.json in outputs.'});
add({id:'user-config-dirs',path:'~/.claude/{commands,agents,output-styles,skills,workflows,routines,themes,rules}/ and ~/.claude/plugins/{installed_plugins.json,known_marketplaces.json,cache/,data/}',env:CFG,kind:'dir',
 what:'User and plugin definitions whose text (skills, agents, commands, output styles, hooks) the harness loads into a session.',join:'snapshot',joinKey:'none',retention:'user-owned',writer:'plugin manager; read by loaders',
 evidence:[['chunk-68gmwmt6.js','Je=["commands","agents","output-styles","skills","workflows","routines","themes","rules"'],['chunk-qptxy51r.js','"installed_plugins.json"']]});
add({id:'bridge-and-server',path:'~/.claude/{bridge-spawn/,remote-control/fork-seeds/,server-sessions.json,server.lock}',env:CFG,kind:'dir',
 what:'Remote-control and claude server bookkeeping: spawned session dirs, fork seeds and the server session list.',join:'approximate',joinKey:'entries carry session ids (not traced in detail)',retention:'fork seeds swept by cleanup',writer:'remote control / claude server',
 evidence:[['chunk-yafdqrx7.js','h6n="bridge-spawn"'],['chunk-zfxvkdxa.js','m(be(),"remote-control","fork-seeds")'],['chunk-zzv0mx12.js','"server-sessions.json"']]});
add({id:'storage-v2',path:'~/.claude/storage-v2/',env:CFG,kind:'dir',what:'Folder reserved for the newer storage backend that can hold the namespaced stores (transcripts, tasks, state) instead of the classic paths.',
 join:'approximate',joinKey:'storage keys (namespace, projectKey, sessionId)',retention:'not traced',writer:'storage-v5 backend (gated)',
 evidence:[['chunk-ra61p37g.js','"statsig","storage-v2","systemd"'],['chunk-9gy1t01w.js','throw Error("history readRecords failed"']],enabledBy:'an internal gate (checked as N() before every storageV5 write); not traced',
 notes:'Version-dependent: when on, every namespace-keyed store in this list may live here, not at the classic paths. Not seen on this machine.'});
add({id:'reserved-untraced',path:'~/.claude/{local,local-settings,project-settings,remote,scratch,seed-admin,systemd,logs,access-audit,cowork_plugins,mcp-skill-archives,chrome,downloads,antproto.json,hfi-auth.json,.cc-writes}',env:CFG,kind:'dir',
 what:'Other config-dir entries the harness treats as its own state (excluded from sync and host snapshots); their session relevance was not traced.',join:'none',joinKey:'not traced',writer:'various',
 evidence:[['chunk-zzv0mx12.js','"local","antproto.json","ccr","session-env","bridge-spawn"'],['chunk-7q0xh79w.js','aM=".cc-writes"']],notes:'hfi-auth.json is an auth file (credential; never read).'});
add({id:'credentials-file',path:'~/.claude/.credentials.json',env:CFG.concat(['CLAUDE_SECURESTORAGE_CONFIG_DIR']),kind:'json',what:'OAuth credentials on platforms without a keychain.',join:'credential',writer:'login',credential:true,
 evidence:[['chunk-1pjbcr84.js','".credentials.json"']],notes:'Never read or print.'});
add({id:'keychain',path:'macOS keychain generic password, service "Claude Code-credentials" (suffix may vary with config dir)',env:['CLAUDE_SECURESTORAGE_CONFIG_DIR'],kind:'keychain',what:'OAuth credentials used by every session on macOS.',join:'credential',writer:'login',credential:true,
 evidence:[['chunk-1pjbcr84.js','security find-generic-password -a'],['chunk-xfdxjhkk.js','mue="-credentials"']],notes:'Never read or print.'});
add({id:'token-files',path:'~/.claude/{.oauth_token,.api_key,.session_ingress_token}',env:CFG,kind:'text',what:'File-based tokens, including the session-ingress token remote sessions use.',join:'credential',writer:'remote / CCR setup',credential:true,
 evidence:[['chunk-7z7dpds1.js','[".oauth_token",".api_key",".session_ingress_token"]']],notes:'Never read or print.'});
add({id:'tmp-session-dir',path:'<tmpdir>/claude-<uid>/<project>/<session id>/{scratchpad/,tasks/<task id>.output}',env:['CLAUDE_CODE_TMPDIR','CLAUDE_TMPDIR'],kind:'dir',
 what:'Per-session temp folder: the scratchpad the model is told to use and output files of background Bash commands and agents.',join:'exact',joinKey:'folder name is the session id',retention:'temp; removed by the OS or cleanup',writer:'scratchpad; background tasks',
 evidence:[['chunk-02rxxxnf.js','_e(hA(),e,"scratchpad")'],['chunk-5z3sh1vh.js','n=".output"']],notes:'Sandboxed commands get TMPDIR=/tmp/claude unless CLAUDE_CODE_TMPDIR is set. On disk these folders also hold images/ and git-style objects/refs/info folders whose writer was not traced.'});
add({id:'env-selected-logs',path:'<path from CLAUDE_CODE_SESSION_LOG | CLAUDE_CODE_DIAGNOSTICS_FILE | CLAUDE_CODE_FRAME_TIMING_LOG | CLAUDE_CODE_PERFETTO_TRACE | AUTOMODE_DECISION_LOG>',env:['CLAUDE_CODE_SESSION_LOG','CLAUDE_CODE_DIAGNOSTICS_FILE','CLAUDE_CODE_FRAME_TIMING_LOG','CLAUDE_CODE_PERFETTO_TRACE','AUTOMODE_DECISION_LOG'],kind:'log',
 what:'Optional logs written to a path named by an environment variable: a session log (recorded as logPath in sessions/<pid>.json), diagnostics, frame timing, a Perfetto trace and auto-mode permission decisions.',join:'approximate',joinKey:'path from the variable; logPath in sessions/<pid>.json',retention:'user-managed',writer:'various',
 evidence:[['chunk-apqxkhrm.js','"CLAUDE_CODE_DIAGNOSTICS_FILE","CLAUDE_CODE_PERFETTO_TRACE","CLAUDE_CODE_FRAME_TIMING_LOG"'],['chunk-f5tnbmwk.js','logPath:a.CLAUDE_CODE_SESSION_LOG']],enabledBy:'setting the variable'});
add({id:'worktrees',path:'<repo>/.claude/worktrees/<name>/',env:[],kind:'dir',what:'Git worktrees the harness creates for a session or subagent (worktree isolation).',join:'approximate',joinKey:'worktree name; cwd in the transcript',retention:'removed when unchanged',writer:'worktree isolation',
 evidence:[['chunk-ra61p37g.js','function Zg(e){return Lmt(e,".claude","worktrees")}']]});
// ---------- remote ----------
add({id:'remote-otel',path:'remote: OTLP collector (OTEL_EXPORTER_OTLP_ENDPOINT) or console',env:['CLAUDE_CODE_ENABLE_TELEMETRY','OTEL_METRICS_EXPORTER','OTEL_LOGS_EXPORTER','OTEL_TRACES_EXPORTER','OTEL_LOG_USER_PROMPTS','OTEL_LOG_ASSISTANT_RESPONSES','OTEL_LOG_TOOL_CONTENT','OTEL_LOG_TOOL_DETAILS','OTEL_LOG_RAW_API_BODIES'],kind:'remote',
 what:'OpenTelemetry metrics, events and traces for the session; with the content switches on, prompts, responses, tool content and raw API bodies.',join:'exact',joinKey:'session.id attribute',retention:'collector-defined',writer:'OTel exporters',
 evidence:[['chunk-dq5fzxjx.js','["OTEL_LOG_RAW_API_BODIES","OTEL_LOG_USER_PROMPTS","OTEL_LOG_ASSISTANT_RESPONSES"'],['chunk-nxw00mr3.js','OTEL_EXPORTER_OTLP_TRACES_PROTOCOL']],enabledBy:'CLAUDE_CODE_ENABLE_TELEMETRY and exporter variables'});
add({id:'remote-beta-tracing',path:'remote: BETA_TRACING_ENDPOINT',env:['ENABLE_BETA_TRACING_DETAILED','BETA_TRACING_ENDPOINT'],kind:'remote',what:'Detailed beta tracing of the session sent to a tracing endpoint.',join:'approximate',joinKey:'not traced',writer:'beta tracing',
 evidence:[['chunk-apqxkhrm.js','"ENABLE_BETA_TRACING_DETAILED","BETA_TRACING_ENDPOINT"']],enabledBy:'ENABLE_BETA_TRACING_DETAILED + BETA_TRACING_ENDPOINT'});
add({id:'remote-1p-events',path:'remote: Anthropic first-party event logging',env:['DISABLE_TELEMETRY','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'],kind:'remote',what:'Analytics events for the session (the failed ones are the local telemetry/ files).',join:'exact',joinKey:'session id',writer:'1P event logger',
 evidence:[['chunk-f5tnbmwk.js','Ad="1p_failed_events."']],enabledBy:'on unless telemetry is disabled'});
add({id:'remote-sessions',path:'remote: /v1/sessions API (cloud sessions, teleport, remote control)',env:[],kind:'remote',what:'Cloud copies of a session: teleport to and from claude.ai sessions and the session events stream.',join:'exact',joinKey:'remote session id; bridgeSessionId in sessions/<pid>.json',writer:'teleport / remote control',
 evidence:[['chunk-1pjbcr84.js','/v1/sessions/${e}/events?beta=true'],['chunk-0axah9dy.js','teleportFromSessionsAPI']],enabledBy:'teleport, --remote, remote control'});
add({id:'remote-folder-sync',path:'remote: cloud session folder sync',env:[],kind:'remote',what:'Sync of working-folder files to cloud sessions; config-dir state is excluded.',join:'approximate',joinKey:'cloud session id',writer:'cloud sync',
 evidence:[['chunk-ra61p37g.js','kind:"inside_home",home:']]});
add({id:'remote-feedback',path:'remote: /bug feedback upload',env:[],kind:'remote',what:'A /bug report upload with the transcript, subagent transcripts and last API request.',join:'approximate',joinKey:'report id',writer:'/bug',
 evidence:[['chunk-6bdxb0yq.js','_("feedback_transcript_share")']],enabledBy:'running /bug and agreeing to share the transcript'});

const ASAR='/Applications/Claude.app/Contents/Resources/app.asar';let asar='';try{asar=fs.readFileSync(ASAR,'latin1');}catch{console.error('Claude.app not found: desktop evidence is not re-checked');}
function aev(lit){const i=asar.indexOf(lit);if(i<0){missing.push('ASAR :: '+lit);return null;}return {file:'Claude.app/Contents/Resources/app.asar',offset:i,literal:lit};}
function addD(o){const e=o.aevidence.map(aev).filter(Boolean);delete o.aevidence;add({...o,evidence:[]});S[S.length-1].evidence=e;const k=missing.indexOf('NO EVIDENCE '+o.id);if(e.length&&k>=0)missing.splice(k,1);}
const DS='~/Library/Application Support/Claude';
addD({id:'desktop-code-session',path:DS+'/claude-code-sessions/<account id>/<org id>/local_<desktop session id>.json',kind:'json',
 what:'Claude desktop app record of a Claude Code session it launched: the CLI session id, folder, model, title, permission mode, plan path and enabled MCP tools.',
 fields:['sessionId','cliSessionId','cwd','originCwd','createdAt','lastActivityAt','model','isArchived','title','permissionMode','planPath','enabledMcpTools','remoteMcpServersConfig'],
 join:'exact',joinKey:'cliSessionId equals the CLI session id. Unverified: for none of the 10 records on this machine was a matching transcript found under ~/.claude/projects (cleaned up, or kept elsewhere)',retention:'desktopSessionCleanupPeriodDays (setting in the CLI schema); desktop policy not traced',writer:'Claude desktop app',
 aevidence:['lb="claude-code-sessions",ub="local_"'],notes:'Desktop app store (evidence from app.asar, not the CLI bundle).'});
addD({id:'desktop-agent-session',path:DS+'/local-agent-mode-sessions/<account id>/<org id>/local_<id>.json',kind:'json',
 what:'Desktop local agent-mode session record, including the system prompt, first message, slash commands, approved tools, egress and Chrome permissions it ran with.',
 fields:['sessionId','processName','cliSessionId','cwd','userSelectedFolders','createdAt','lastActivityAt','model','title','vmProcessName','initialMessage','slashCommands','enabledMcpTools','remoteMcpServersConfig','chromePermissionMode','chromeAllowedDomains','approvedToolNames','egressAllowedDomains','systemPrompt','accountName','emailAddress'],
 join:'exact',joinKey:'cliSessionId; verified: all 16 records on this machine have that transcript in their own .claude/projects',retention:'not traced',writer:'Claude desktop app',aevidence:['uC="local-agent-mode-sessions"'],notes:'Holds the systemPrompt the desktop passed in; account fields are personal data.'});
addD({id:'desktop-agent-audit',path:DS+'/local-agent-mode-sessions/<account id>/<org id>/local_<id>/audit.jsonl',kind:'jsonl',
 what:'Signed audit log of every SDK message in a desktop agent-mode session.',fields:['type','uuid','session_id','parent_tool_use_id','message','_audit_timestamp'],
 join:'exact',joinKey:'session_id field',retention:'not traced',writer:'Claude desktop app (optionally signs each line)',aevidence:['let i=r.default.join(e,"audit.jsonl")']});
addD({id:'desktop-agent-config-dir',path:DS+'/local-agent-mode-sessions/<account id>/<org id>/local_<id>/{.claude/,uploads/,outputs/}',kind:'dir',
 what:'Per-session config dir for desktop agent-mode sessions, holding the session\'s own projects/<project>/<session id>.jsonl transcript, memory, session-env, shell-snapshots, plans and backups, plus uploaded and output files.',
 join:'exact',joinKey:'transcript file name is the CLI session id',retention:'not traced',writer:'Claude Code run by the desktop app',aevidence:['uC="local-agent-mode-sessions"'],
 notes:'Found on disk: these sessions do not write to ~/.claude, so a ~/.claude-only scan misses them. How the app points CLAUDE_CONFIG_DIR here was not traced.'});
addD({id:'desktop-bundled-cli',path:DS+'/{claude-code/<version>/claude.app,claude-code-vm/<version>/claude}',kind:'binary',
 what:'Claude Code builds the desktop app ships and runs its sessions with (host and VM).',join:'snapshot',joinKey:'version folder; the transcript version field',retention:'replaced on update',writer:'Claude desktop app',
 aevidence:['this.vmStorageDir=n.default.join(a.app.getPath("userData"),"claude-code-vm")'],notes:'Version-dependent: desktop sessions may run a different Claude Code version than the terminal CLI.'});

// --check: write nothing; fail when evidence is gone from the build, or when the committed list differs from what
// the build it names gives. work/extracted can hold a newer build than the committed list (a Claude Code refresh
// that has not published yet); then the entries are compared without their evidence locations, which that
// refresh regenerates.
const newer=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++)if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0);return false;};
const sansLocations=list=>JSON.stringify(list.map(({evidence,...entry})=>entry));
if(process.argv.includes('--check')){
 let had=null;try{had=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch{}
 const ahead=had&&VERSION&&had.extractedVersion!==VERSION&&newer(VERSION,had.extractedVersion);
 if(ahead)console.log(`local-sources.json describes ${had.extractedVersion}; work/extracted holds the newer ${VERSION}, so evidence locations were not compared`);
 if(!had||(ahead?sansLocations(had.sources)!==sansLocations(S):(had.extractedVersion!==VERSION||JSON.stringify(had.sources)!==JSON.stringify(S)))){console.error('claude-code/outputs/local-sources.json is out of date for this build: run node claude-code/extract/local-sources.cjs');process.exitCode=1;}
}else fs.writeFileSync(OUT,JSON.stringify({product:'claude-code',extractedVersion:VERSION,generated:new Date().toISOString().slice(0,10),sources:S},null,2)+'\n');
const c={};for(const s of S)c[s.join]=(c[s.join]||0)+1;console.log('sources',S.length,JSON.stringify(c));if(missing.length){console.error('Evidence not found in this build (update the entries):\n'+missing.join('\n'));process.exitCode=1;}
