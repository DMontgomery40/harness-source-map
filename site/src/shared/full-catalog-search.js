// Full-text archive search is explicit and incremental; the normal palette stays small.
const form = document.querySelector('[data-catalog-search]');
if (form) {
  const query = form.querySelector('input'), status = form.querySelector('[role=status]'), results = form.querySelector('ol'), stop = form.querySelector('[data-stop]');
  let active, generation=0;
  stop.addEventListener('click',()=>active?.abort());
  const readGzip=async (file,signal)=> {
    const response=await fetch(file,{signal});
    if(!response.ok) throw new Error('Archive download failed');
    const text=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
    signal.throwIfAborted();return text;
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const needle=query.value.trim().toLocaleLowerCase();
    if(!needle) return;
    active?.abort(); active=new AbortController();
    const signal=active.signal, run=++generation;
    results.replaceChildren(); stop.hidden=false;
    let matches=0, visited=0;
    try {
      const manifest=await fetch('../full-catalog/manifest.json',{signal}).then(r=>r.json());
      signal.throwIfAborted();
      for(const part of manifest.parts) {
        signal.throwIfAborted();
        status.textContent=`Searching part ${++visited} of ${manifest.parts.length} · ${matches.toLocaleString()} matches`;
        const text=await readGzip(`../full-catalog/${part.file}`,signal);
        const lines=text.trimEnd().split('\n');let locations;
        for(let i=0;i<lines.length;i++) {
          signal.throwIfAborted();
          const record=JSON.parse(lines[i]);
          if(!record.text.toLocaleLowerCase().includes(needle)) continue;
          matches++;
          if(matches>100) continue;
          if(!locations) locations=JSON.parse(await readGzip(`../full-catalog/${part.file.replace('.jsonl.gz','.locations.json.gz')}`,signal));
          signal.throwIfAborted();
          const [slug,anchor]=locations[i];
          const item=document.createElement('li'), link=document.createElement('a'), excerpt=document.createElement('p');
          link.href=`../${slug}/#${anchor}`; link.textContent=record.text.replace(/\s+/g,' ').slice(0,100)||'Empty string';
          excerpt.textContent=`${record.file} · ${record.status} · ${record.text.replace(/\s+/g,' ').slice(0,240)}`;
          item.append(link,excerpt); results.append(item);
        }
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      status.textContent=`${matches.toLocaleString()} matches across all ${manifest.total.toLocaleString()} occurrences${matches>100?' · showing the first 100':''}.`;
    } catch(error) { if(run===generation) status.textContent=error.name==='AbortError'?`Search stopped · ${matches.toLocaleString()} matches so far.`:`Search failed: ${error.message}`; }
    finally { if(run===generation) stop.hidden=true; }
  });
}
