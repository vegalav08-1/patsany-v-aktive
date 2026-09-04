import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Saves, cleanName } from '../src/ui/storage';
function storage(initial?: string) {
  let stored = initial ?? null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } });
}
test('personal best survives global top-ten eviction and reload', () => {
  storage(); const saves = new Saves();
  saves.record({heroId:'left',name:'Партнёр 1',capital:100,stage:0,seed:'a',date:'2026-09-05'});
  for(let i=0;i<12;i++) saves.record({heroId:'back',name:'Партнёр 2',capital:1000+i,stage:0,seed:'b',date:'2026-09-05'});
  assert.equal(saves.data.records.length,10); assert.equal(saves.data.records.some(r=>r.heroId==='left'),false);
  assert.equal(new Saves().best('left'),100);
});
test('denied storage falls back to working in-memory results', () => {
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Access denied')}});
  const saves=new Saves(); assert.equal(saves.unavailable,true);
  saves.record({heroId:'left',name:'Друг',capital:25,stage:0,seed:'c',date:'2026-09-05'});
  assert.equal(saves.best('left'),25); assert.equal(saves.data.records.length,1);
});
test('corrupt saved data and unsafe name control characters do not propagate', () => {
  storage('{broken'); assert.equal(new Saves().data.records.length,0);
  storage(JSON.stringify({records:[{heroId:'left',name:'bad',capital:-5,stage:7,seed:'s',date:'d'}],bests:{left:'NaN'},names:{left:'Имя\u0000'}}));
  const saves=new Saves(); assert.equal(saves.data.records.length,0); assert.equal(saves.best('left'),0); assert.equal(saves.data.names.left,'Имя');
  assert.equal(cleanName('a'.repeat(30)).length,20);
});
