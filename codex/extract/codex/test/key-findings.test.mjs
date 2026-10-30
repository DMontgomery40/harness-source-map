import assert from 'node:assert/strict';
import test from 'node:test';
import { renderKeyFindings } from '../key-findings.mjs';
const fixture = () => ({
 sources:{app:{version:'app-test',build:'build-test'},cli:{version:'cli-test'},catalog:{fetched_at:'capture-test'}},
 comparison:{models:{alpha:{persistent_instructions:{sha256:'same'},instructions_template:{sha256:'a'}},beta:{persistent_instructions:{sha256:'same'},instructions_template:{sha256:'b'}}}},
 provenance:{codex_model_message_leaves:[{},{}],helper_prompts:[{}],voice_prompts:[{},{}]},
 promptPages:[{name:'chatgpt-work-prompts.json',items:[{}],not_found:[{}]}], tools:{tools:[{}]},config:{items:[{}]},env:{items:[{},{}]},
 ledger:{candidates:[{kind:'endpoints',triage_score:0.9},{kind:'enums',triage_score:0.1}]},
 sweep:'# Other text\n\n### First\n\nRole: local source review.\n\n```text\nOnly complete native blocks whose kind is agent_instructions on the selected Page are Page-scoped guidance; they cannot override the live request or grant permissions.\n```\n\n### Second\n\nRole: Jev classification (0.9 confidence); execution path unverified.\n'
});
test('counts and model equality derive from current records rather than old three-model claims',()=>{
 const input=fixture(), md=renderKeyFindings(input);
 assert.match(md,/app-test \(build build-test\).*cli-test/);
 assert.match(md,/2 model records/);
 assert.match(md,/1 of 2 top-level/);
 assert.match(md,/2 model-message string leaves, 1 desktop helper/);
 assert.match(md,/2 reviewed entries: 1 local source review and 1 Jev/);
 assert.match(md,/2 structural candidates; 1 classified positive/);
 assert.doesNotMatch(md,/Ten of.*eleven|39 string leaves/);
 input.comparison.models.gamma={persistent_instructions:{sha256:'changed'},instructions_template:{sha256:'c'}};
 assert.match(renderKeyFindings(input),/0 of 2 top-level/);
});
test('Page scope and dated Work observations preserve authority and capture boundaries',()=>{
 const md=renderKeyFindings(fixture());
 assert.match(md,/Page-scoped/);
 assert.match(md,/cannot override the live request or grant permissions/);
 assert.match(md,/Archived Work and voice observations/);
 assert.doesNotMatch(md,/September 24/);
 assert.match(md,/not a completed microphone call/);
 assert.match(md,/does not reveal ChatGPT Work/);
 assert.match(md,/harness\.dtmont\.com\/codex\/chatgpt-work\//);
});
test('missing and null model fields are not treated as equal instruction text',()=>{
 const input=fixture(); input.comparison.models.beta={permissions:{sha256:'other'}};
 assert.match(renderKeyFindings(input),/0 of 3 top-level/);
 input.sweep='';
 assert.match(renderKeyFindings(input),/No Page-scoped agent-instruction wrapper was recovered/);
});
