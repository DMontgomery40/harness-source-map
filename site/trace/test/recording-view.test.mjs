import {test} from 'node:test';import assert from 'node:assert/strict';import {openRecordingView,recordingSummary} from '../recording-view.js';
test('a private network-only recording renders without a session or voice call and hides identity',async t=>{
 const root={children:[],prepend(...xs){this.children.unshift(...xs);}};
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 globalThis.document={createElement:()=>({children:[],textContent:'',append(...xs){this.children.push(...xs);}}),querySelector:()=>root};
 globalThis.fetch=async()=>({ok:true,json:async()=>({log:{entries:[{request:{method:'GET',url:'https://chatgpt.com/metadata',headers:[{name:'chatgpt-account-id',value:'private-account-identity'}]},response:{status:200,headers:[],content:{text:'{"email":"private@example.com"}'}}}]}})});
 t.after(()=>{globalThis.document=originalDocument;globalThis.fetch=originalFetch;});
 await openRecordingView('run-111111111111111111111111');
 const text=node=>node.textContent+' '+(node.children||[]).map(text).join(' '),output=text(root);
 assert.match(output,/1 flow · 0 WebSocket frames/);assert.match(output,/no voice call · audio not recorded/);assert.match(output,/GET chatgpt\.com\/metadata · 200/);assert.doesNotMatch(output,/private-account-identity|private@example.com/);
 assert.equal(recordingSummary({log:{entries:[]}}).voiceMessages,0);
});
