import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTouchSettings, validateTouchSettings } from '../src/platform/MobileControls.ts';

test('touch layout settings clamp corrupt values and preserve custom positions',()=>{
  const defaults=defaultTouchSettings();
  assert.deepEqual(validateTouchSettings(null),defaults);
  const settings=validateTouchSettings({version:2,mode:'stick',scale:2,opacity:-1,deadzone:.35,haptics:false,
    positions:{pad:{x:.34,y:.68},action:{x:2,y:-2},utility:{x:Infinity,y:NaN}}});
  assert.equal(settings.mode,'stick');assert.equal(settings.scale,1.5);assert.equal(settings.opacity,.2);
  assert.deepEqual(settings.positions.pad,{x:.34,y:.68});assert.deepEqual(settings.positions.action,{x:1,y:0});
  assert.deepEqual(settings.positions.utility,defaults.positions.utility);
});

test('touch layouts of the old page (relative to its control box) are replaced by the window defaults',()=>{
  assert.deepEqual(validateTouchSettings({version:1,mode:'stick',scale:1,opacity:.9,deadzone:.25,haptics:true,positions:{pad:{x:0,y:.49}}}),defaultTouchSettings());
});
