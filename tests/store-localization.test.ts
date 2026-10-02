import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newCampaign, unlockedWorld } from '../src/core/Campaign.ts';
import { ARMOR_PRICES, nextSealItem, purchaseArmor, storeStatus } from '../src/core/Store.ts';
import { campaignFromRecord, campaignRecord, campaignStageStart } from '../src/platform/CanonicalCampaign.ts';
import { CanonicalSave } from '../src/platform/CanonicalSave.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { languageStrings, localizeDemoText } from '../src/core/Localization.ts';
import { parseDemoScripts } from '../src/core/DemoScript.ts';
import type { DemoCommand } from '../src/core/DemoScript.ts';
import { loadRouteResources } from '../tools/routes/loadResources.ts';

test('S700 seal unlocks worlds at red-diamond thresholds without spending them',()=>{
  const {maps}=loadRouteResources(),c=newCampaign();
  assert.deepEqual([1,2,3,4].map(dir=>nextSealItem(0,dir as 1|2|3|4)),[-1,1,2,-1]);
  assert.equal(nextSealItem(2,2),3);
  assert.equal(nextSealItem(3,4),2);
  c.completed[0].push(8);assert.equal(unlockedWorld(c,1,maps),false);
  c.resources.redDiamonds=10;assert.equal(unlockedWorld(c,1,maps),true);
  assert.equal(unlockedWorld(c,2,maps),false);
  c.resources.redDiamonds=25;assert.equal(unlockedWorld(c,2,maps),true);
  assert.equal(c.resources.redDiamonds,25);
});

test('four armor tiers use original prices, persist in RMS and raise healing cap',()=>{
  const {worlds,maps}=loadRouteResources();
  for(let item=0;item<4;item++){
    let c=newCampaign();c.resources.diamonds=ARMOR_PRICES[item]-1;
    assert.equal(storeStatus(c,item),'short');
    assert.equal(purchaseArmor(c,item).campaign,c);
    c.resources.diamonds=ARMOR_PRICES[item];
    const result=purchaseArmor(c,item);assert.equal(result.result,'bought');c=result.campaign;
    assert.equal(c.resources.diamonds,0);assert.equal(c.resources.health,5+item);
    assert.equal(c.resources.maxHealth,5+item);
    assert.equal(storeStatus(c,item),'owned');
    assert.equal(storeStatus(c,0),'owned');
    const save=campaignRecord(c,worlds,maps);
    assert.equal(save.maxHealth,5+item);
    const restored=campaignFromRecord(new CanonicalSave(save.export()),worlds,maps);
    assert.equal(restored.resources.maxHealth,5+item);
    const initial=campaignStageStart(restored,worlds,maps,0,0);
    const sim=new Simulation(worlds[0].levels[0],initial);
    sim.health=1;sim.restoreCheckpoint(true);
    assert.equal(sim.health,5+item);
  }
});

test('web translations cover every original menu entry and demo dialogue',()=>{
  const original=JSON.parse(readFileSync(new URL('../public/assets/lang-0.json',import.meta.url),'utf8')) as string[];
  const scripts=parseDemoScripts(readFileSync(new URL('../public/assets/demo-0.bin',import.meta.url)));
  const texts=(commands:DemoCommand[]):string[]=>commands.flatMap(command=>[...(command.text?[command.text]:[]),...texts(command.children??[])]);
  const dialogue=[...new Set([...scripts.values()].flatMap(script=>texts(script.commands)))];
  for(const locale of ['pt-BR','es'] as const){
    const strings=languageStrings(locale,original);
    assert.equal(strings.length,115);
    for(const index of [0,2,3,31,68,72,85,88,89,90,91,103,108])assert.notEqual(strings[index],original[index],`${locale} string ${index}`);
    for(const line of dialogue)assert.notEqual(localizeDemoText(locale,line),line,`${locale} demo: ${line}`);
  }
  assert.deepEqual(languageStrings('en',original),original);
});
