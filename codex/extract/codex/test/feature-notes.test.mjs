import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourceLiteral, sourceRange } from '../feature-notes.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
test('complete context fragments bind exact UTF-8 source literals and compiled bytes',()=>{
 const value='\nA bounded catalog with its final restriction.\n';
 const raw=JSON.stringify(value),source=`// é\nconst NOTICE: &str = ${raw};\n`;
 const binary=Buffer.concat([Buffer.from('compiled-prefix'),Buffer.from(value),Buffer.from('suffix')]);
 const record=sourceLiteral('codex-rs/example.rs',source,value,binary,'rust-vfixture','fixture-commit');
 assert.equal(record.text,value);
 assert.equal(record.binary_offset,Buffer.byteLength('compiled-prefix'));
 assert.equal(binary.subarray(record.binary_offset,record.binary_offset+record.binary_byte_length).toString(),value);
 assert.equal(Buffer.from(source).subarray(record.provenance.byte_offset,record.provenance.byte_offset+record.provenance.byte_length).toString(),raw);
 assert.equal(record.provenance.sha256,hash(raw));
 assert.equal(record.provenance.source_text,raw);
 assert.equal(Buffer.byteLength(record.provenance.source_text),record.provenance.byte_length);
 assert.equal(record.source_sha256,hash(raw));
 assert.equal(record.provenance.file_sha256,hash(source));
 assert.equal(record.provenance.line,2);
 assert.equal(record.provenance.version,'rust-vfixture');
});
test('missing or ambiguous source and absent compiled fragments fail closed',()=>{
 const value='Complete fragment.',raw=JSON.stringify(value),binary=Buffer.from(value);
 assert.throws(()=>sourceLiteral('source.rs',raw,value,Buffer.from('different'),'v','c'),/absent from the bundled CLI/);
 assert.throws(()=>sourceLiteral('source.rs',raw+' '+raw,value,binary,'v','c'),/ambiguous/);
 assert.throws(()=>sourceRange('source.rs','begin incomplete','begin','missing ending','v','c'),/ending is missing/);
});
