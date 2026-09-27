import test from 'node:test';
import assert from 'node:assert/strict';

import {SOURCES,LAST_CHECKED} from '../src/data/sources.js';
import {BADGES} from '../src/data/badges.js';

const byId=new Map(SOURCES.map(s=>[s.id,s]));

test('catalog entries carry all required fields and honest types',()=>{
  assert.ok(SOURCES.length>=7,'catalog should not shrink without reason');
  for(const s of SOURCES){
    assert.ok(s.id&&s.title&&s.author&&s.url,`missing core fields on ${s.id}`);
    assert.ok(s.type==='official'||s.type==='community',`${s.id}: type must be official|community`);
    assert.ok(typeof s.usedFor==='string'&&s.usedFor.length>10,`${s.id}: usedFor must state its role`);
    assert.match(s.url,/^https:\/\//,`${s.id}: url must be https`);
    if(s.pub!==undefined)assert.match(s.pub,/^\d{4}-\d{2}-\d{2}$/,`${s.id}: pub must be YYYY-MM-DD`);
    if(s.upd!==undefined)assert.match(s.upd,/^\d{4}-\d{2}-\d{2}$/,`${s.id}: upd must be YYYY-MM-DD`);
  }
  assert.ok(SOURCES.some(s=>s.type==='official'),'at least one official AWS source is required');
});

test('LAST_CHECKED is a real ISO calendar date',()=>{
  assert.match(LAST_CHECKED,/^\d{4}-\d{2}-\d{2}$/);
  const d=new Date(LAST_CHECKED+'T00:00:00Z');
  assert.ok(!Number.isNaN(d.getTime()),'LAST_CHECKED must parse');
  assert.ok(d.toISOString().startsWith(LAST_CHECKED),'LAST_CHECKED must be a real day');
});

test('every badge cites at least one community source with a real id and a contribution note',()=>{
  assert.equal(BADGES.length,21);
  for(const b of BADGES){
    assert.ok(Array.isArray(b.sources)&&b.sources.length>=1,`${b.id}: no sources`);
    const seen=new Set();
    for(const e of b.sources){
      assert.ok(e.id,`${b.id}: source entry without id`);
      assert.ok(typeof e.part==='string'&&e.part.length>3,`${b.id}/${e.id}: missing synthesized-part note`);
      assert.ok(byId.has(e.id),`${b.id}: cites unknown source ${e.id}`);
      assert.equal(byId.get(e.id).type,'community',`${b.id}: synthesis layer may only cite community sources, not ${byId.get(e.id).type}`);
      assert.ok(!seen.has(e.id),`${b.id}: cites ${e.id} twice`);
      seen.add(e.id);
    }
  }
});

test('official layer: only the two AWS-confirmed badges state facts without verification caveats',()=>{
  const confirmed=BADGES.filter(b=>b.official&&!/Verification needed/.test(b.official));
  assert.deepEqual(confirmed.map(b=>b.id).sort(),['hello-world','photo-finisher']);
  for(const b of BADGES.filter(b=>b.official)){
    assert.ok(/Builder Center FAQ|Verification needed/.test(b.official),`${b.id}: official text must cite the FAQ or defer to Verification needed`);
  }
  for(const b of BADGES.filter(b=>!b.official)){
    assert.equal(b.official,undefined);
  }
});

test('community sources not used by any badge declare their non-badge role',()=>{
  const cited=new Set();
  BADGES.forEach(b=>b.sources.forEach(e=>cited.add(e.id)));
  for(const s of SOURCES.filter(s=>s.type==='community'&&!cited.has(s.id))){
    assert.ok(s.usedFor.length>10,`${s.id}: neither cited by a badge nor explained in usedFor`);
  }
  assert.match(byId.get('s4').usedFor,/redemption/i,'s4 is the redemption guide');
  assert.match(byId.get('s5').usedFor,/FAQ/i,'s5 is the community FAQ');
});
