import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LevelResults } from '../src/core/LevelResults.ts';

test('level-clear details reveal automatically before Continue becomes available',()=>{
  const results=new LevelResults();
  for(const [phase,duration] of [[1,41],[2,41],[3,41],[4,11],[5,11]]){
    for(let i=0;i<duration-1;i++)results.step(0);
    assert.equal(results.phase,phase-1);
    results.step(0);
    assert.equal(results.phase,phase);
  }
  assert.equal(results.press(),true);
});

test('diamond count extends its own reveal and a press skips the whole sequence',()=>{
  const results=new LevelResults();
  for(let i=0;i<41;i++)results.step(100);
  assert.equal(results.phase,1);
  for(let i=0;i<200;i++)results.step(100);
  assert.equal(results.phase,1);
  assert.equal(results.press(),false);
  assert.equal(results.phase,5);
  assert.equal(results.press(),true);
  results.reset();
  assert.equal(results.phase,0);
  assert.equal(results.ticks,0);
});
