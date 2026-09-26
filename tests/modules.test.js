import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SRC=path.join(ROOT,'src');
const ENTRY=path.join(SRC,'app.js');

const files=fs.readdirSync(SRC,{recursive:true})
  .map(f=>path.join(SRC,String(f)))
  .filter(f=>f.endsWith('.js'))
  .sort();

test('every source module is discoverable',()=>{
  assert.ok(files.length>=15,`only found ${files.length} modules`);
  assert.ok(files.includes(ENTRY));
});

test('every module except the DOM entry point can be imported standalone',async()=>{
  const failures=[];
  for(const file of files){
    if(file===ENTRY)continue;
    try{
      await import(pathToFileURL(file).href);
    }catch(err){
      failures.push(`${path.relative(ROOT,file)}: ${err.message}`);
    }
  }
  assert.deepEqual(failures,[],'modules must import cleanly in a DOM-less runtime');
});
