/** The S700 archive supplies English only. These PT-BR/ES tables are web-port translations. */
export type GameLocale='en'|'pt-BR'|'es';
export const LANGUAGE_KEY='diamond-rush:language:v1';
export function validLocale(value:string|null):GameLocale{return value==='pt-BR'||value==='es'?value:'en';}

const pt:Record<number,string>={
  0:'NOVO JOGO',1:'CONTINUAR',2:'OPÇÕES',3:'MAIS JOGOS!',4:'AJUDA',5:'SOBRE',6:'SAIR',
  7:'FASE DE TESTE',8:'FASE 1',9:'FASE 2',10:'FASE 3',11:'FASE 4',12:'FASE 5',13:'FASE 5 (MM)',14:'FASE 6',15:'FASE 7',16:'FASE 8',17:'FASE 9',18:'FASE 10',19:'FASE 11',
  20:'FASE SECRETA 1',21:'FASE SECRETA 2',22:'FASE SECRETA 3',23:'FASE SECRETA 4',
  24:'VOLTAR',25:'RETOMAR',26:'RECOMEÇAR',27:'MENU PRINCIPAL',28:'ANGKOR WAT',29:'BAVÁRIA',30:'TIBETE',31:'LOJA',
  32:'SOM LIGADO',33:'SOM DESLIGADO',34:'Cadeado mágico aberto!\nSaída liberada!',35:'FIM DE JOGO',36:'CHECKPOINT',37:'CARREGANDO',38:'OBJETIVO:',39:'DIAMANTES!!',40:'PARABÉNS!',41:'CONCLUÍDA!',42:'diamantes',43:'Golpes',44:'Tentativas',45:'(não usado)',46:'MELHORIAS DE ARMA',47:'INTRODUÇÃO',48:'PARABÉNS! VOCÊ ABRIU UM CAMINHO SECRETO!!',49:'IR AO MAPA',50:'VIB. LIGADA',51:'VIB. DESLIGADA',52:'APERTE 5 PARA INICIAR',53:'Pular',54:'para abrir',55:'o baú',56:'a porta',57:'DERROTE TODOS!',58:'ACENDA A TOCHA!',59:'USE O INTERRUPTOR!',60:'Adicionar diamantes',61:'Adicionar diamantes vermelhos',62:'Armas disponíveis',63:'Liberar todas as fases',64:'Liberar fases secretas',65:'Aperte',66:'Ligado',67:'Desligado',68:'UM NOVO JOGO APAGARÁ SEU PROGRESSO. TEM CERTEZA?',69:'QUER COMEÇAR UM NOVO JOGO?',70:'Dica:',71:'NÍVEL',72:'LOJA',73:'EXPANSÃO',74:'Preço:',75:'COMPRAR',76:'ENERGIA MÁXIMA',77:'BLOCOS',78:'Você precisa de',79:'para ir a',80:'para comprar este item.',81:'Já comprado.',82:'Aperte 5',83:'LIBERADO!',84:'DIAMANTE ELEMENTAL ADICIONADO!',85:'Colete de malha',86:'Traje mágico',87:'Colete de mithril',88:'Jaqueta de cristal',89:'Diamantes insuficientes.',90:'Aperte 5 para comprar.',91:'Item comprado.',92:'Mundo liberado:',93:'Derrote a Grande Anaconda!',94:'Derrote o Cavaleiro Teutônico!',95:'Derrote o Yeti!',96:'Selo/Loja',97:'Você revelou o segredo do Selo! Diamantes estão por toda parte agora... Mas a aventura nunca termina! Continua...',98:'Continuar',99:'Liberado',100:'SIM',101:'NÃO',102:'SAIR DO JOGO?',103:'Como se mover:',104:'4 e 6: esquerda ou direita.',105:'2 e 8: subir ou descer.',106:'Aperte 5 para usar uma arma.',107:'Aperte 5 num checkpoint para reiniciar a sala.',108:'Aperte * para reiniciar e perder uma vida.',109:'Diamantes',110:'Você tem',111:'Você perdeu',112:'Aperte 4 ou 6 para|ir à esquerda ou direita.||Aperte 2 ou 8 para|subir ou descer.',113:'TEM CERTEZA?',114:'Diamantes vermelhos'
};
const es:Record<number,string>={
  0:'NUEVA PARTIDA',1:'CONTINUAR',2:'OPCIONES',3:'¡MÁS JUEGOS!',4:'AYUDA',5:'ACERCA DE',6:'SALIR',
  7:'NIVEL DE PRUEBA',8:'NIVEL 1',9:'NIVEL 2',10:'NIVEL 3',11:'NIVEL 4',12:'NIVEL 5',13:'NIVEL 5 (MM)',14:'NIVEL 6',15:'NIVEL 7',16:'NIVEL 8',17:'NIVEL 9',18:'NIVEL 10',19:'NIVEL 11',
  20:'NIVEL SECRETO 1',21:'NIVEL SECRETO 2',22:'NIVEL SECRETO 3',23:'NIVEL SECRETO 4',
  24:'VOLVER',25:'REANUDAR',26:'REINICIAR',27:'MENÚ PRINCIPAL',28:'ANGKOR WAT',29:'BAVIERA',30:'TÍBET',31:'TIENDA',
  32:'SONIDO SÍ',33:'SONIDO NO',34:'¡Candado mágico abierto!\n¡Salida libre!',35:'FIN DEL JUEGO',36:'CHECKPOINT',37:'CARGANDO',38:'OBJETIVO:',39:'¡¡DIAMANTES!!',40:'¡FELICIDADES!',41:'¡COMPLETADO!',42:'diamantes',43:'Golpes',44:'Intentos',45:'(sin uso)',46:'MEJORAS DE ARMAS',47:'INTRODUCCIÓN',48:'¡FELICIDADES! ¡HAS ABIERTO UNA RUTA SECRETA!',49:'IR AL MAPA',50:'VIB. SÍ',51:'VIB. NO',52:'PULSA 5 PARA EMPEZAR',53:'Saltar',54:'para abrir',55:'el cofre',56:'la puerta',57:'¡DERROTA A TODOS!',58:'¡ENCIENDE LA ANTORCHA!',59:'¡USA EL INTERRUPTOR!',60:'Añadir diamantes',61:'Añadir diamantes rojos',62:'Armas disponibles',63:'Abrir todos los niveles',64:'Abrir niveles secretos',65:'Pulsa',66:'Sí',67:'No',68:'UNA NUEVA PARTIDA BORRARÁ TU PROGRESO. ¿SEGURO?',69:'¿QUIERES EMPEZAR UNA NUEVA PARTIDA?',70:'Pista:',71:'NIVEL',72:'TIENDA',73:'EXPANSIÓN',74:'Precio:',75:'COMPRAR',76:'ENERGÍA MÁXIMA',77:'BLOQUES',78:'Necesitas',79:'para ir a',80:'para comprar este objeto.',81:'Ya comprado.',82:'Pulsa 5',83:'¡ABIERTO!',84:'¡DIAMANTE ELEMENTAL OBTENIDO!',85:'Chaleco de malla',86:'Traje mágico',87:'Chaleco de mithril',88:'Chaqueta de cristal',89:'Faltan diamantes.',90:'Pulsa 5 para comprar.',91:'Objeto comprado.',92:'Mundo abierto:',93:'¡Derrota a la Gran Anaconda!',94:'¡Derrota al Caballero Teutón!',95:'¡Derrota al Yeti!',96:'Sello/Tienda',97:'¡Descubriste el secreto del Sello! Ahora hay diamantes por todas partes... ¡Pero la aventura nunca termina! Continuará...',98:'Continuar',99:'Abierto',100:'SÍ',101:'NO',102:'¿SALIR DEL JUEGO?',103:'Cómo moverse:',104:'4 y 6: izquierda o derecha.',105:'2 y 8: subir o bajar.',106:'Pulsa 5 para usar un arma.',107:'Pulsa 5 en un checkpoint para reiniciar la sala.',108:'Pulsa * para reiniciar y perder una vida.',109:'Diamantes',110:'Tienes',111:'Perdiste',112:'Pulsa 4 o 6 para|ir a izquierda o derecha.||Pulsa 2 u 8 para|subir o bajar.',113:'¿ESTÁS SEGURO?',114:'Diamantes rojos'
};
export function languageStrings(locale:GameLocale,original:readonly string[]):string[]{
  const translated=locale==='pt-BR'?pt:locale==='es'?es:null;
  return original.map((line,index)=>translated?.[index]??line);
}

const demoEnglish=[
  'The Great Temple Of Angkor Wat... ',"I'm finally in!","Let's go!",'I should check that chest first.',
  'You found a compass! It will help you find your way out.','Avoid blocking your own path','when pushing rocks.',
  'You can return all elements to their original positions','by going back to the last circle and pressing 5.',
  'and your way is blocked,','but it will cost you a life.','Is this a kind of seal?','Ah! The seal is reacting!',
  "Let's see what happens if I step on it...",'Look at the Magic Padlock in front of you!',
  'Collect the indicated number of gems to open it.','Oh! This door is locked!',"I'm sure the key must be nearby...",
  'You found the mystic mallet!','Press 5 to use it.','Great! Now I can crush those weak walls.',
  'You found the mystic hook!','Press 5 from a distance to drag things towards you!',
  'Interesting... Maybe with this...','You found the mystic potion!','Now you can breathe underwater.',
  'You found the freeze mallet!','Press 5 to freeze objects!','Freeze things?',"Let's try it out!",
  'The final chamber in Angkor Wat! The Fire Crystal is supposed to be hidden here...',
  'But I have a bad feeling about this...','The Silver Diamond is here... I\'m sure of it!',
  'Hmm... I feel a dark force nearby...',"Let's rock!",'The Ice Diamond must be in the final chamber in Tibet!',"It's now or never!",
  "If you can't reach the circle",'you can press * at any time to go back to the last circle,'
] as const;
const demoPt=[
  'O Grande Templo de Angkor Wat...', 'Finalmente entrei!', 'Vamos lá!', 'Devo olhar aquele baú primeiro.',
  'Você achou uma bússola! Ela vai ajudar a encontrar a saída.', 'Não bloqueie seu próprio caminho', 'ao empurrar pedras.',
  'Você pode devolver tudo às posições originais', 'voltando ao último círculo e apertando 5.',
  'e o caminho estiver bloqueado,', 'mas isso custará uma vida.', 'Será algum tipo de selo?', 'Ah! O selo está reagindo!',
  'Vamos ver o que acontece se eu pisar nele...', 'Olhe o Cadeado Mágico à sua frente!',
  'Pegue o número indicado de joias para abri-lo.', 'Ah! Esta porta está trancada!', 'A chave deve estar por perto...',
  'Você achou o martelo místico!', 'Aperte 5 para usá-lo.', 'Ótimo! Agora posso quebrar essas paredes fracas.',
  'Você achou o gancho místico!', 'Aperte 5 de longe para puxar objetos!',
  'Interessante... Talvez com isto...', 'Você achou a poção mística!', "Agora você pode respirar debaixo d'água.",
  'Você achou o martelo de gelo!', 'Aperte 5 para congelar objetos!', 'Congelar objetos?', 'Vamos testar!',
  'A câmara final de Angkor Wat! O Cristal de Fogo deve estar escondido aqui...',
  'Mas tenho um mau pressentimento...', 'O Diamante de Prata está aqui... Tenho certeza!',
  'Hmm... Sinto uma força sombria por perto...', 'Vamos nessa!',
  'O Diamante de Gelo deve estar na câmara final do Tibete!', 'É agora ou nunca!',
  'Se você não conseguir chegar ao círculo', 'pode apertar * a qualquer momento para voltar ao último círculo,'
] as const;
const demoEs=[
  'El Gran Templo de Angkor Wat...', '¡Por fin entré!', '¡Vamos!', 'Primero debo mirar ese cofre.',
  '¡Hallaste una brújula! Te ayudará a encontrar la salida.', 'No bloquees tu propio camino', 'al empujar rocas.',
  'Puedes devolver todo a su posición original', 'regresando al último círculo y pulsando 5.',
  'y el camino esté bloqueado,', 'pero te costará una vida.', '¿Es algún tipo de sello?', '¡Ah! ¡El sello reacciona!',
  'Veamos qué pasa si lo piso...', '¡Mira el Candado Mágico frente a ti!',
  'Recoge el número indicado de gemas para abrirlo.', '¡Oh! ¡Esta puerta está cerrada!', 'La llave debe estar cerca...',
  '¡Hallaste el mazo místico!', 'Pulsa 5 para usarlo.', '¡Genial! Ahora puedo romper esas paredes débiles.',
  '¡Hallaste el gancho místico!', '¡Pulsa 5 de lejos para atraer objetos!',
  'Interesante... Tal vez con esto...', '¡Hallaste la poción mística!', 'Ahora puedes respirar bajo el agua.',
  '¡Hallaste el mazo de hielo!', '¡Pulsa 5 para congelar objetos!', '¿Congelar objetos?', '¡Probémoslo!',
  '¡La cámara final de Angkor Wat! El Cristal de Fuego debe estar escondido aquí...',
  'Pero tengo un mal presentimiento...', 'El Diamante de Plata está aquí... ¡Estoy seguro!',
  'Hmm... Siento una fuerza oscura cerca...', '¡A luchar!',
  '¡El Diamante de Hielo debe estar en la cámara final del Tíbet!', '¡Ahora o nunca!',
  'Si no puedes llegar al círculo', 'puedes pulsar * en cualquier momento para volver al último círculo,'
] as const;
export function localizeDemoText(locale:GameLocale,value:string):string {
  if(locale==='en')return value;
  const index=demoEnglish.indexOf(value as typeof demoEnglish[number]);
  return index<0?value:(locale==='pt-BR'?demoPt:demoEs)[index];
}
