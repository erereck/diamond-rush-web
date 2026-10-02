import type { GameLocale } from './Localization.ts';

/** Web wrapper copy; the 115 Canvas strings still come from lang.f/Localization. */
export const shellCopy={
  en:{
    badge:'IN DEVELOPMENT',eyebrow:'THE ORIGINAL ADVENTURE, ON THE WEB',title:'One more<br>rock in the way.',
    intro:'Exploration, diamonds and the paths of Angkor. A native implementation built from the original game data.',
    play:'Open game menu',language:'Game language',note:'Faithfulness work continues in later levels, transitions and sound.',resources:(levels:number,sprites:number)=>`${levels} LEVELS · ${sprites} SPRITES · 21 ORIGINAL MIDI TRACKS`,
    touch:'TOUCH CONTROLS',adjust:'⚙ Customize',done:'✓ Done',drag:'Drag the groups above to choose their positions.',
    right:'Right-handed',left:'Left-handed',compact:'Compact',direction:'Directional',pad:'Directional pad',stick:'Analog stick',size:'Size',opacity:'Opacity',deadzone:'Stick dead zone',haptics:'Short vibration on touch',reset:'Restore defaults',
    action:'ACT',back:'BACK',tools:'Preservation lab',footer:'Independent preservation project · local execution',
    game:'Game',controls:'Game controls',movement:'Movement',up:'Up',leftDirection:'Left',down:'Down',rightDirection:'Right',analog:'Analog movement stick',actions:'Actions',actSelect:'Act or select',confirm:'Confirm or continue',commands:'Commands',backLabel:'Back',pauseContinue:'Pause or continue',restartCheckpoint:'Restart at checkpoint; costs one life away from it',
    moveGuide:'move',spaceGuide:'Space',actGuide:'act',escGuide:'pause',restartGuide:'restart',
    next:'Next →',map:'Map →',skip:'Skip animation →',nextLabel:'Next level',nextTitle:'Follow the main route',
    menuStatus:'Original S700 menu',sealStatus:'World selection',introStatus:'Angkor introduction',demoStatus:'Level scene',pausedStatus:'paused',tapContinue:'tap to continue',explore:'explore freely',sceneStatus:'scene',conclusion:'results',gameOver:'GAME OVER · confirm to continue',weaponNone:'no equipment',weaponHammer:'hammer',weaponHook:'hook',weaponIce:'ice hammer',continueAction:'Continue',backCircle:'Return to the introduction circle',pause:'Pause',restart:'Restart level',fullscreen:'Full screen',canvas:'Diamond Rush. Use arrow keys or WASD to move, Escape to pause.'
  },
  'pt-BR':{
    badge:'EM DESENVOLVIMENTO',eyebrow:'A AVENTURA ORIGINAL, NA WEB',title:'Mais uma<br>pedra no caminho.',
    intro:'Exploração, diamantes e os caminhos de Angkor. Uma implementação nativa, construída a partir dos dados do jogo original.',
    play:'Abrir menu do jogo',language:'Idioma do jogo',note:'A fidelidade das fases posteriores, transições e áudio continua em desenvolvimento.',resources:(levels:number,sprites:number)=>`${levels} FASES · ${sprites} SPRITES · 21 MIDIS ORIGINAIS`,
    touch:'CONTROLES DE TOQUE',adjust:'⚙ Ajustar',done:'✓ Concluído',drag:'Arraste os grupos na área acima para escolher a posição.',
    right:'Destro',left:'Canhoto',compact:'Compacto',direction:'Direcional',pad:'Cruz direcional',stick:'Analógico',size:'Tamanho',opacity:'Opacidade',deadzone:'Zona morta do analógico',haptics:'Vibração curta ao tocar',reset:'Restaurar padrão',
    action:'AGIR',back:'VOLTAR',tools:'Laboratório de preservação',footer:'Projeto independente de preservação · execução local',
    game:'Jogo',controls:'Controles do jogo',movement:'Movimento',up:'Cima',leftDirection:'Esquerda',down:'Baixo',rightDirection:'Direita',analog:'Controle analógico de movimento',actions:'Ações',actSelect:'Agir ou selecionar',confirm:'Confirmar ou continuar',commands:'Comandos',backLabel:'Voltar',pauseContinue:'Pausar ou continuar',restartCheckpoint:'Reiniciar no checkpoint; custa uma vida fora dele',
    moveGuide:'mover',spaceGuide:'Espaço',actGuide:'agir',escGuide:'pausar',restartGuide:'reiniciar',
    next:'Próxima →',map:'Mapa →',skip:'Pular animação →',nextLabel:'Próxima fase',nextTitle:'Seguir a rota principal',
    menuStatus:'Menu original S700',sealStatus:'Seleção de mundos',introStatus:'Introdução de Angkor',demoStatus:'Cena da fase',pausedStatus:'pausada',tapContinue:'toque para continuar',explore:'explore livremente',sceneStatus:'cena',conclusion:'conclusão',gameOver:'GAME OVER · confirme para continuar',weaponNone:'sem equipamento',weaponHammer:'martelo',weaponHook:'gancho',weaponIce:'martelo de gelo',continueAction:'Continuar',backCircle:'Voltar ao círculo da introdução',pause:'Pausar',restart:'Reiniciar fase',fullscreen:'Tela cheia',canvas:'Diamond Rush. Use as setas ou WASD para mover, Escape para pausar.'
  },
  es:{
    badge:'EN DESARROLLO',eyebrow:'LA AVENTURA ORIGINAL, EN LA WEB',title:'Una roca más<br>en el camino.',
    intro:'Exploración, diamantes y los caminos de Angkor. Una implementación nativa construida con los datos del juego original.',
    play:'Abrir menú del juego',language:'Idioma del juego',note:'Seguimos ajustando la fidelidad de los niveles posteriores, las transiciones y el sonido.',resources:(levels:number,sprites:number)=>`${levels} NIVELES · ${sprites} SPRITES · 21 PISTAS MIDI ORIGINALES`,
    touch:'CONTROLES TÁCTILES',adjust:'⚙ Ajustar',done:'✓ Listo',drag:'Arrastra los grupos de arriba para elegir su posición.',
    right:'Diestro',left:'Zurdo',compact:'Compacto',direction:'Direccional',pad:'Cruceta',stick:'Palanca analógica',size:'Tamaño',opacity:'Opacidad',deadzone:'Zona muerta del mando',haptics:'Vibración breve al tocar',reset:'Restaurar valores',
    action:'ACTUAR',back:'VOLVER',tools:'Laboratorio de preservación',footer:'Proyecto independiente de preservación · ejecución local',
    game:'Juego',controls:'Controles del juego',movement:'Movimiento',up:'Arriba',leftDirection:'Izquierda',down:'Abajo',rightDirection:'Derecha',analog:'Control analógico de movimiento',actions:'Acciones',actSelect:'Actuar o seleccionar',confirm:'Confirmar o continuar',commands:'Comandos',backLabel:'Volver',pauseContinue:'Pausar o continuar',restartCheckpoint:'Reiniciar en el punto de control; cuesta una vida fuera de él',
    moveGuide:'mover',spaceGuide:'Espacio',actGuide:'actuar',escGuide:'pausar',restartGuide:'reiniciar',
    next:'Siguiente →',map:'Mapa →',skip:'Saltar animación →',nextLabel:'Siguiente nivel',nextTitle:'Seguir la ruta principal',
    menuStatus:'Menú original S700',sealStatus:'Selección de mundos',introStatus:'Introducción de Angkor',demoStatus:'Escena del nivel',pausedStatus:'en pausa',tapContinue:'toca para continuar',explore:'explora libremente',sceneStatus:'escena',conclusion:'resultados',gameOver:'GAME OVER · confirma para continuar',weaponNone:'sin equipo',weaponHammer:'martillo',weaponHook:'gancho',weaponIce:'martillo de hielo',continueAction:'Continuar',backCircle:'Volver al círculo de la introducción',pause:'Pausar',restart:'Reiniciar nivel',fullscreen:'Pantalla completa',canvas:'Diamond Rush. Usa las flechas o WASD para moverte, Escape para pausar.'
  },
} as const;

export function applyShellLanguage(locale:GameLocale){
  const copy=shellCopy[locale];
  const set=(selector:string,value:string)=>{const element=document.querySelector<HTMLElement>(selector);if(element)element.textContent=value;};
  const firstText=(selector:string,value:string)=>{const element=document.querySelector(selector),node=element&&[...element.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);if(node)node.textContent=value;};
  const lastText=(selector:string,value:string)=>{const element=document.querySelector(selector),node=element&&[...element.childNodes].reverse().find(child=>child.nodeType===Node.TEXT_NODE);if(node)node.textContent=value;};
  const aria=(selector:string,value:string)=>document.querySelector(selector)?.setAttribute('aria-label',value);
  firstText('.build-label',' '+copy.badge);set('.eyebrow',copy.eyebrow);
  const title=document.querySelector<HTMLElement>('aside h1');if(title)title.innerHTML=copy.title;
  set('aside .intro',copy.intro);set('.build-note',copy.note);
  firstText('.language-picker',copy.language);
  set('.touch-heading span',copy.touch);set('#touch-config',copy.adjust);
  set('.touch-settings p',copy.drag);
  set('[data-touch-preset="right"]',copy.right);set('[data-touch-preset="left"]',copy.left);set('[data-touch-preset="compact"]',copy.compact);
  firstText('label:has(#touch-mode)',copy.direction);
  set('#touch-mode option[value="pad"]',copy.pad);set('#touch-mode option[value="stick"]',copy.stick);
  firstText('label:has(#touch-size)',copy.size+' ');
  firstText('label:has(#touch-opacity)',copy.opacity+' ');
  firstText('label:has(#touch-deadzone)',copy.deadzone+' ');
  firstText('label:has(#touch-haptics)',copy.haptics);
  set('#touch-reset',copy.reset);set('.touch-action small',copy.action);set('[data-command="back"]',copy.back);
  aria('.player-panel',copy.game);aria('#touch-deck',copy.controls);aria('[data-control-group="pad"]',copy.movement);
  aria('[data-input="ArrowUp"]',copy.up);aria('[data-input="ArrowLeft"]',copy.leftDirection);
  aria('[data-input="ArrowDown"]',copy.down);aria('[data-input="ArrowRight"]',copy.rightDirection);
  aria('[data-stick]',copy.analog);aria('[data-control-group="action"]',copy.actions);
  aria('.touch-action',copy.actSelect);aria('.touch-confirm',copy.confirm);aria('[data-control-group="utility"]',copy.commands);
  aria('[data-command="back"]',copy.backLabel);aria('[data-command="pause"]',copy.pauseContinue);
  aria('[data-input="KeyR"]',copy.restartCheckpoint);aria('#language',copy.language);
  lastText('.control-guide span:nth-child(1)',' '+copy.moveGuide);
  set('.control-guide span:nth-child(2) kbd',copy.spaceGuide);lastText('.control-guide span:nth-child(2)',' '+copy.actGuide);
  lastText('.control-guide span:nth-child(3)',' '+copy.escGuide);lastText('.control-guide span:nth-child(4)',' '+copy.restartGuide);
  firstText('#tools > summary',copy.tools+' ');
  set('footer span:last-child',copy.footer);
  const play=document.getElementById('play');if(play)play.innerHTML=`${copy.play} <span>→</span>`;
  const game=document.getElementById('game');game?.setAttribute('aria-label',copy.canvas);
  aria('#next-level',copy.nextLabel);document.getElementById('next-level')?.setAttribute('title',copy.nextTitle);
  document.getElementById('pause')?.setAttribute('aria-label',copy.pause);
  document.getElementById('restart')?.setAttribute('aria-label',copy.restart);
  document.getElementById('fullscreen')?.setAttribute('aria-label',copy.fullscreen);
}
