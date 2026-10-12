import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cheating, defaultSettings, validateSettings } from '../src/platform/Settings.ts';

test('port settings default to the original game and reject unknown values',()=>{
  const d=defaultSettings();
  assert.equal(d.speed,1);assert.equal(cheating(d),false);assert.equal(d.sound,true);
  assert.deepEqual(validateSettings(null),d);
  assert.deepEqual(validateSettings({version:2,speed:2}),d);
  const v=validateSettings({version:1,scaling:'huge',filter:'crt',surround:'backdrop',speed:3,master:2,music:-1,infiniteLives:true,touch:'never'});
  assert.equal(v.scaling,d.scaling);assert.equal(v.filter,'crt');assert.equal(v.surround,'backdrop');
  assert.equal(v.speed,1,'only the listed speeds');assert.equal(v.master,1);assert.equal(v.music,0);
  assert.equal(v.touch,'never');assert.equal(cheating(v),true);
});
