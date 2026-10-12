// Cursor's shipped prompt names <system_reminder> as a user/tool-message
// envelope (cursor/outputs/source-records.md). Preserve exact ranges and leave
// inline quotations/code examples in their original layer.
import {addBlock} from '../model.js';
export const cursorReminderSpans=text=>reminderSpans(text,'system_reminder');
export function reminderSpans(text,tag='system-reminder') {
 const out=[];let last=0;
 const re=new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`,'g');
 for(const match of text.matchAll(re)){
  const before=text.slice(0,match.index),line=before.slice(before.lastIndexOf('\n')+1);
  if(line.trim() || (before.match(/^\s*```/gm)||[]).length%2)continue;
  if(last<match.index)out.push({start:last,end:match.index,reminder:false});
  out.push({start:match.index,end:match.index+match[0].length,reminder:true});last=match.index+match[0].length;
 }
 if(last<text.length)out.push({start:last,end:text.length,reminder:false});
 return out.filter(span=>text.slice(span.start,span.end).trim());
}

export function addEnvelopeBlock(agent,options,tag='system-reminder'){
 if(!['you','outside'].includes(options.kind)||typeof options.text!=='string')return addBlock(agent,options);
 const spans=reminderSpans(options.text,tag);
 if(!spans.some(s=>s.reminder))return addBlock(agent,options);
 const blocks=spans.map(span=>addBlock(agent,{...options,
  kind:span.reminder?'injected':options.kind,label:span.reminder?`recorded ${tag}`:options.label,
  text:options.text.slice(span.start,span.end),ref:{...options.ref,range:[span.start,span.end]}}));
 // Action readers keep the complete field; layer blocks retain exact subranges.
 return {...(blocks.find(b=>b.kind===options.kind)||blocks[0]),ref:options.ref};
}
