// archivo: estado.js, carpeta interfaz.
// qué hace: guarda las variables globales que comparte toda la interfaz: el catálogo, el día y el estado
// que se muestran en el mapa, el modo de uso, la parada siguiente, la animación en curso, el periodo y el
// estado de la nube de pensamientos con su propio generador.
// se relaciona con: todos los archivos de la interfaz, que leen y cambian estas variables, con
// pensamientos.js y animacion viaje.js del mapa, y con principal.js, que las llena al arrancar.
// responsable: yasmin akemi haji taira.
"use strict";

// atajo para buscar un elemento de la página por su identificador.
const $ = id => document.getElementById(id);
let CATALOGO = null;           // catálogo leído de la base de datos al arrancar
let dia = null, est = null;    // calendario y estado del día que se ve en el mapa
let modo = "jugar";            // modo de uso: jugar, agente o comparar
let siguiente = 1;            // índice de la siguiente parada pendiente
let panelAbierto = false;      // verdadero mientras el panel de una parada está abierto
let enParada = false;          // verdadero mientras se resuelven los eventos de una parada
let teclas = {}, objetivo = null;   // teclas apretadas y punto al que se tocó en el mapa
let agenteActivo = null, agenteCorriendo = false, rutaAgente = [], esperaAgente = null;   // estado del modo agente
let toastReloj = null;         // reloj del aviso corto que aparece arriba del mapa
let ultimoLote = null;         // último experimento corrido en el modo comparar
let anim = null;               // animación de un viaje en curso: bus, mototaxi, taxi o caminata
let PERIODO = null;            // periodo en curso del motor: días vividos, saldo y quiebre
let evMostrado = null;         // evento que el panel está mostrando, para el botón de resolver el día rápido
let diaDelegado = false;       // verdadero si el día en el mapa lo terminó el agente de ayuda
// nube de pensamientos, solo de presentación. usa su propio generador con su propia semilla:
// nunca toca el generador del día, así que no puede cambiar eventos ni resultados.
let PENSAMIENTOS = [];
let rngPensar = mulberry32(1);
const nube = { texto: null, inicio: 0, libreDesde: 0, pendiente: null, hoy: new Set(), dia: 0 };
// cuánto dura cada pensamiento, cuánto tarda en aparecer y desaparecer y cuánto se espera entre uno y otro,
// en milisegundos.
const NUBE_MS = 3000, NUBE_FUNDIDO = 300, NUBE_ESPERA = 7000;

// escribe una hora en minutos como horas y minutos, por ejemplo 390 como las seis y media.
const hhmm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(Math.round(m % 60)).padStart(2, "0");
