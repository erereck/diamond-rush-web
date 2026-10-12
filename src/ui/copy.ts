import type { GameLocale } from '../core/Localization.ts';

/** The port's own interface text (the game's 115 strings come from lang.f and Localization.ts). */
const pt={
  tabGame:'Jogo',tabVideo:'Vídeo',tabAudio:'Áudio',tabControls:'Controles',tabLab:'Lab',tabAbout:'Sobre',
  language:'Idioma',speed:'Velocidade do jogo',turbo:'Avanço rápido',turboHint:'Segure Tab ou »',rewind:'Retroceder',rewindHint:'Segure Backspace ou « · últimos 30 s',
  states:'Estado salvo',statesHint:'F5 salva · F7 carrega',save:'Salvar',load:'Carregar',
  cheats:'Trapaças',cheatsNote:'Alteram o jogo original; o resultado entra no save da campanha.',infiniteLives:'Vidas infinitas',infiniteHealth:'Vida infinita',allEquipment:'Todos os equipamentos',
  session:'Sessão',gameMenu:'Menu do jogo',openMenu:'Abrir',
  fullscreen:'Tela cheia',toggle:'Alternar',scaling:'Escala',filter:'Filtro',surround:'Ao redor da tela original',
  surroundHint:'O que aparece quando a janela é mais larga ou mais alta que o celular.',stats:'Mostrar FPS e tick',
  sound:'Som',synth:'Sintetizador',master:'Volume geral',music:'Músicas',effects:'Efeitos',vibration:'Vibração do jogo',
  audioNote:'Como no aparelho, toca um som por vez, pelas prioridades do jogo original.',
  keyMove:'mover',keyAct:'agir',keyPause:'pausar / voltar',keyReset:'checkpoint',keyTurbo:'avanço rápido',keyRewind:'retroceder',keyStates:'estado salvo',keyOptions:'configurações',keyFullscreen:'tela cheia',
  touchControls:'Controles de toque',touchLayout:'Posição na tela',adjust:'Ajustar',done:'Concluir',presets:'Predefinições',right:'Destro',left:'Canhoto',compact:'Compacto',
  direction:'Direcional',pad:'Cruz',stick:'Analógico',size:'Tamanho',opacity:'Opacidade',deadzone:'Zona morta',haptics:'Vibração ao tocar',reset:'Restaurar padrão',
  labNote:'Ferramentas de preservação: mapas, sprites, faixas MIDI, replays e o save original.',levels:'Fases',sprites:'Sprites',tracks:'Áudio',
  world:'Mundo',stage:'Fase',testWeapon:'Equipamento de teste',inspect:'Ver mapa',testStage:'Jogar fase',grid:'Grade de inspeção',resource:'Recurso',palette:'Paleta',
  track:'Faixa',listen:'Ouvir',stop:'Parar',sessionTools:'Sessão e replays',step:'Avançar 1 tick',exportReplay:'Exportar replay',importReplay:'Abrir replay',
  exportSession:'Exportar sessão',importSession:'Importar sessão',audit:'Validar recursos',rms:'Save original (RMS)',rmsTemplate:'Modelo inicial',
  rmsExport:'Exportar campanha',rmsInspect:'Inspecionar arquivo',rmsLoad:'Usar na campanha',
  aboutText:'O jogo original roda no navegador: a decompilação da versão Sony Ericsson S700 é traduzida para TypeScript e comparada quadro a quadro com Java. As 41 fases têm percurso verificado.',
  linkRoutes:'Fases verificadas',linkCore:'Como funciona',legal:'Jogo, gráficos, textos e músicas © Gameloft. Projeto de preservação feito por fãs, sem afiliação com a Gameloft.',
  resetOptions:'Opções do port',
  // values
  'scaling.integer':'Pixels inteiros','scaling.fit':'Ajustar','scaling.stretch':'Esticar',
  'filter.sharp':'Nítido','filter.smooth':'Suave','filter.crt':'CRT',
  'surround.black':'Preto','surround.backdrop':'Fundo infinito','surround.stage':'Cenário','surround.stage-objects':'Cenário e objetos',
  'synth.samples':'Amostras GM','synth.synth':'Simples',
  'touch.auto':'Automático','touch.always':'Sempre','touch.never':'Nunca',
  // messages
  settings:'Configurações',close:'Fechar',loading:'Carregando',stateSaved:'Estado salvo',stateLoaded:'Estado carregado',stateMissing:'Nenhum estado salvo para esta fase',
  stateNeedsStage:'Disponível durante uma fase',rewinding:'Retrocedendo',fast:'Avanço rápido',
  synthLoading:'Carregando instrumentos…',synthReady:'Instrumentos GeneralUser GS carregados',synthFallback:'Instrumentos indisponíveis; usando o sintetizador simples',synthIdle:'Carrega no primeiro som',
  resources:(levels:number,sprites:number)=>`${levels} fases · ${sprites} sprites · 21 faixas MIDI originais`,
};
type Copy=typeof pt;
const en:Copy={
  tabGame:'Game',tabVideo:'Video',tabAudio:'Audio',tabControls:'Controls',tabLab:'Lab',tabAbout:'About',
  language:'Language',speed:'Game speed',turbo:'Fast forward',turboHint:'Hold Tab or »',rewind:'Rewind',rewindHint:'Hold Backspace or « · last 30 s',
  states:'Save state',statesHint:'F5 saves · F7 loads',save:'Save',load:'Load',
  cheats:'Cheats',cheatsNote:'They change the original game; the result goes into the campaign save.',infiniteLives:'Infinite lives',infiniteHealth:'Infinite health',allEquipment:'All equipment',
  session:'Session',gameMenu:'Game menu',openMenu:'Open',
  fullscreen:'Fullscreen',toggle:'Toggle',scaling:'Scaling',filter:'Filter',surround:'Around the original screen',
  surroundHint:'What appears when the window is wider or taller than the phone.',stats:'Show FPS and tick',
  sound:'Sound',synth:'Synthesizer',master:'Master volume',music:'Music',effects:'Effects',vibration:'Game vibration',
  audioNote:'Like the phone, one sound plays at a time, by the original game\'s priorities.',
  keyMove:'move',keyAct:'act',keyPause:'pause / back',keyReset:'checkpoint',keyTurbo:'fast forward',keyRewind:'rewind',keyStates:'save state',keyOptions:'settings',keyFullscreen:'fullscreen',
  touchControls:'Touch controls',touchLayout:'Position on screen',adjust:'Adjust',done:'Done',presets:'Presets',right:'Right-handed',left:'Left-handed',compact:'Compact',
  direction:'Directional',pad:'D-pad',stick:'Analog',size:'Size',opacity:'Opacity',deadzone:'Dead zone',haptics:'Vibrate on touch',reset:'Restore defaults',
  labNote:'Preservation tools: maps, sprites, MIDI tracks, replays and the original save.',levels:'Stages',sprites:'Sprites',tracks:'Audio',
  world:'World',stage:'Stage',testWeapon:'Test equipment',inspect:'View map',testStage:'Play stage',grid:'Inspection grid',resource:'Resource',palette:'Palette',
  track:'Track',listen:'Listen',stop:'Stop',sessionTools:'Session and replays',step:'Step 1 tick',exportReplay:'Export replay',importReplay:'Open replay',
  exportSession:'Export session',importSession:'Import session',audit:'Validate resources',rms:'Original save (RMS)',rmsTemplate:'Initial template',
  rmsExport:'Export campaign',rmsInspect:'Inspect file',rmsLoad:'Use in campaign',
  aboutText:'The original game runs in the browser: the decompiled Sony Ericsson S700 version is translated to TypeScript and checked frame by frame against Java. All 41 stages have a verified route.',
  linkRoutes:'Verified stages',linkCore:'How it works',legal:'Game, graphics, texts and music © Gameloft. A fan preservation project, not affiliated with Gameloft.',
  resetOptions:'Port options',
  'scaling.integer':'Integer','scaling.fit':'Fit','scaling.stretch':'Stretch',
  'filter.sharp':'Sharp','filter.smooth':'Smooth','filter.crt':'CRT',
  'surround.black':'Black','surround.backdrop':'Endless background','surround.stage':'Scenery','surround.stage-objects':'Scenery and objects',
  'synth.samples':'GM samples','synth.synth':'Simple',
  'touch.auto':'Automatic','touch.always':'Always','touch.never':'Never',
  settings:'Settings',close:'Close',loading:'Loading',stateSaved:'State saved',stateLoaded:'State loaded',stateMissing:'No saved state for this stage',
  stateNeedsStage:'Available during a stage',rewinding:'Rewinding',fast:'Fast forward',
  synthLoading:'Loading instruments…',synthReady:'GeneralUser GS instruments loaded',synthFallback:'Instruments unavailable; using the simple synthesizer',synthIdle:'Loads with the first sound',
  resources:(levels:number,sprites:number)=>`${levels} stages · ${sprites} sprites · 21 original MIDI tracks`,
};
const es:Copy={
  tabGame:'Juego',tabVideo:'Vídeo',tabAudio:'Audio',tabControls:'Controles',tabLab:'Lab',tabAbout:'Acerca',
  language:'Idioma',speed:'Velocidad del juego',turbo:'Avance rápido',turboHint:'Mantén Tab o »',rewind:'Retroceder',rewindHint:'Mantén Retroceso o « · últimos 30 s',
  states:'Estado guardado',statesHint:'F5 guarda · F7 carga',save:'Guardar',load:'Cargar',
  cheats:'Trucos',cheatsNote:'Cambian el juego original; el resultado entra en la partida guardada.',infiniteLives:'Vidas infinitas',infiniteHealth:'Salud infinita',allEquipment:'Todo el equipo',
  session:'Sesión',gameMenu:'Menú del juego',openMenu:'Abrir',
  fullscreen:'Pantalla completa',toggle:'Alternar',scaling:'Escala',filter:'Filtro',surround:'Alrededor de la pantalla original',
  surroundHint:'Lo que aparece cuando la ventana es más ancha o más alta que el teléfono.',stats:'Mostrar FPS y tick',
  sound:'Sonido',synth:'Sintetizador',master:'Volumen general',music:'Música',effects:'Efectos',vibration:'Vibración del juego',
  audioNote:'Como en el teléfono, suena un sonido a la vez, según las prioridades del juego original.',
  keyMove:'mover',keyAct:'actuar',keyPause:'pausa / volver',keyReset:'checkpoint',keyTurbo:'avance rápido',keyRewind:'retroceder',keyStates:'estado guardado',keyOptions:'ajustes',keyFullscreen:'pantalla completa',
  touchControls:'Controles táctiles',touchLayout:'Posición en pantalla',adjust:'Ajustar',done:'Listo',presets:'Predefinidos',right:'Diestro',left:'Zurdo',compact:'Compacto',
  direction:'Direccional',pad:'Cruceta',stick:'Analógico',size:'Tamaño',opacity:'Opacidad',deadzone:'Zona muerta',haptics:'Vibrar al tocar',reset:'Restaurar valores',
  labNote:'Herramientas de preservación: mapas, sprites, pistas MIDI, replays y la partida original.',levels:'Niveles',sprites:'Sprites',tracks:'Audio',
  world:'Mundo',stage:'Nivel',testWeapon:'Equipo de prueba',inspect:'Ver mapa',testStage:'Jugar nivel',grid:'Cuadrícula',resource:'Recurso',palette:'Paleta',
  track:'Pista',listen:'Escuchar',stop:'Parar',sessionTools:'Sesión y replays',step:'Avanzar 1 tick',exportReplay:'Exportar replay',importReplay:'Abrir replay',
  exportSession:'Exportar sesión',importSession:'Importar sesión',audit:'Validar recursos',rms:'Partida original (RMS)',rmsTemplate:'Plantilla inicial',
  rmsExport:'Exportar campaña',rmsInspect:'Inspeccionar archivo',rmsLoad:'Usar en la campaña',
  aboutText:'El juego original se ejecuta en el navegador: la decompilación de la versión Sony Ericsson S700 se traduce a TypeScript y se compara cuadro a cuadro con Java. Los 41 niveles tienen recorrido verificado.',
  linkRoutes:'Niveles verificados',linkCore:'Cómo funciona',legal:'Juego, gráficos, textos y música © Gameloft. Proyecto de preservación hecho por fans, sin afiliación con Gameloft.',
  resetOptions:'Opciones del port',
  'scaling.integer':'Píxeles enteros','scaling.fit':'Ajustar','scaling.stretch':'Estirar',
  'filter.sharp':'Nítido','filter.smooth':'Suave','filter.crt':'CRT',
  'surround.black':'Negro','surround.backdrop':'Fondo infinito','surround.stage':'Escenario','surround.stage-objects':'Escenario y objetos',
  'synth.samples':'Muestras GM','synth.synth':'Simple',
  'touch.auto':'Automático','touch.always':'Siempre','touch.never':'Nunca',
  settings:'Ajustes',close:'Cerrar',loading:'Cargando',stateSaved:'Estado guardado',stateLoaded:'Estado cargado',stateMissing:'No hay estado guardado para este nivel',
  stateNeedsStage:'Disponible durante un nivel',rewinding:'Retrocediendo',fast:'Avance rápido',
  synthLoading:'Cargando instrumentos…',synthReady:'Instrumentos GeneralUser GS cargados',synthFallback:'Instrumentos no disponibles; usando el sintetizador simple',synthIdle:'Se carga con el primer sonido',
  resources:(levels:number,sprites:number)=>`${levels} niveles · ${sprites} sprites · 21 pistas MIDI originales`,
};
export const uiCopy:Record<GameLocale,Copy>={'pt-BR':pt,en,es};
export type UiKey=Exclude<keyof Copy,'resources'>;
export function ui(locale:GameLocale,key:UiKey):string{return uiCopy[locale][key] as string;}
/** Fills every element marked data-i18n with the current language. */
export function applyUiLanguage(locale:GameLocale,root:ParentNode=document){
  for(const element of root.querySelectorAll<HTMLElement>('[data-i18n]')){
    const key=element.dataset.i18n as UiKey;const text=uiCopy[locale][key];if(typeof text==='string')element.textContent=text;
  }
  const set=(selector:string,key:UiKey)=>root.querySelector(selector)?.setAttribute('aria-label',ui(locale,key));
  set('#menu-button','settings');set('#panel','settings');set('#panel-close','close');set('#close-inspector','close');
  document.documentElement.lang=locale;
}
