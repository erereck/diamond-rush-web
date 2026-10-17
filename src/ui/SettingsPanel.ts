import type { GameLocale } from '../core/Localization.ts';
import { SPEEDS } from '../platform/Settings.ts';
import type { PortSettings, SettingsStore } from '../platform/Settings.ts';
import { applyUiLanguage, ui } from './copy.ts';
import type { UiKey } from './copy.ts';

type Choice={value:string|number;label:(locale:GameLocale)=>string};
const valueChoices=(key:string,values:readonly string[]):Choice[]=>values.map(value=>({value,label:locale=>ui(locale,`${key}.${value}` as UiKey)}));
const CHOICES:Partial<Record<keyof PortSettings,Choice[]>>={
  speed:SPEEDS.map(value=>({value,label:locale=>`${value.toLocaleString(locale)}×`})),
  scaling:valueChoices('scaling',['integer','fit','stretch']),
  filter:valueChoices('filter',['sharp','smooth','crt']),
  surround:valueChoices('surround',['black','backdrop','stage','stage-objects']),
  hud:valueChoices('hud',['wide','original']),
  synth:valueChoices('synth',['samples','synth']),
  touch:valueChoices('touch',['auto','always','never']),
};

/** The port's settings panel: tabs, and controls bound to the stored settings. */
export class SettingsPanel {
  readonly element=document.getElementById('panel')!;
  private readonly button=document.getElementById('menu-button') as HTMLButtonElement;
  private locale:GameLocale='en';
  onToggle:(open:boolean)=>void=()=>{};
  constructor(private readonly store:SettingsStore){
    this.button.onclick=()=>this.toggle();
    document.getElementById('panel-close')!.onclick=()=>this.close();
    for(const tab of this.element.querySelectorAll<HTMLButtonElement>('[data-tab]'))tab.onclick=()=>this.showTab(tab.dataset.tab!);
    for(const input of this.element.querySelectorAll<HTMLInputElement>('input[data-setting]')){
      const key=input.dataset.setting as keyof PortSettings;
      input.oninput=()=>this.store.update({[key]:input.type==='checkbox'?input.checked:Number(input.value)/100} as Partial<PortSettings>);
    }
    for(const group of this.element.querySelectorAll<HTMLElement>('.segmented[data-setting]')){
      const key=group.dataset.setting as keyof PortSettings;
      group.replaceChildren(...(CHOICES[key]??[]).map(choice=>{
        const b=document.createElement('button');b.type='button';b.dataset.value=String(choice.value);
        b.onclick=()=>this.store.update({[key]:choice.value} as Partial<PortSettings>);return b;
      }));
    }
    document.getElementById('settings-reset')!.onclick=()=>this.store.reset();
    store.subscribe(s=>this.render(s));
  }
  get open(){return !this.element.hidden;}
  toggle(force=!this.open){
    this.element.hidden=!force;this.button.setAttribute('aria-expanded',String(force));
    if(force)(this.element.querySelector<HTMLElement>('.tabs .selected')??this.element).focus();
    this.onToggle(force);
  }
  close(){if(this.open)this.toggle(false);}
  showTab(name:string){
    for(const tab of this.element.querySelectorAll<HTMLButtonElement>('[data-tab]'))tab.classList.toggle('selected',tab.dataset.tab===name);
    for(const section of this.element.querySelectorAll<HTMLElement>('[data-section]'))section.hidden=section.dataset.section!==name;
  }
  setLanguage(locale:GameLocale){this.locale=locale;applyUiLanguage(locale);this.render(this.store.value);}
  private render(s:PortSettings){
    for(const input of this.element.querySelectorAll<HTMLInputElement>('input[data-setting]')){
      const value=s[input.dataset.setting as keyof PortSettings];
      if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(Math.round(Number(value)*100));
    }
    for(const group of this.element.querySelectorAll<HTMLElement>('.segmented[data-setting]')){
      const key=group.dataset.setting as keyof PortSettings,choices=CHOICES[key]??[];
      group.querySelectorAll('button').forEach((b,i)=>{b.textContent=choices[i].label(this.locale);b.classList.toggle('selected',String(s[key])===b.dataset.value);});
    }
  }
}
