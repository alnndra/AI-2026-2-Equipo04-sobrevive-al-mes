// archivo: pensamientos.js, carpeta mapa.
// qué hace: decide qué piensa camila y cuándo aparece la nube. elige el pensamiento de mayor prioridad
// que se cumple ahora, solo sobre la siguiente parada y solo si su evento existe en el calendario del día.
// en el modo agente, antes de entrar a una parada, muestra la razón de lo que el agente va a decidir.
// los pensamientos son solo de presentación: usan su propio generador y nunca cambian eventos ni resultados.
// este archivo está en la carpeta mapa pero se carga entre los archivos de la interfaz, en el mismo lugar
// donde estaba en el código original.
// se relaciona con: catalogos.js, donde están los pensamientos, con estado.js de la interfaz, que guarda la
// nube y su generador, con nube.js, que la dibuja, y con principal.js, que la actualiza en cada cuadro.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// qué piensa camila.
// resume el estado actual en un objeto con las claves que usan las condiciones de los pensamientos.
function contextoPensar() {
  const iAula = dia.paradas.findIndex(q => q.id === "aula");
  const cercano = LUGARES.filter(L => Math.abs(cam.x - L.sx) < 160 && Math.abs(cam.y - (L.base + 35)) < 70)
    .sort((a, b) => Math.abs(cam.x - a.sx) - Math.abs(cam.x - b.sx))[0];
  return {
    hambre: est.hambre, energia: est.energia, bateria: est.bateria, saldo: est.saldo,
    saldoDia: est.saldo / (est.diasRestantes + 1), gastoHoy: est.saldoInicial - est.saldo,
    lluvia: dia.cond.lluvia, paro: dia.cond.paro, examen: dia.cond.examen, impreso: dia.cond.entrega_impreso,
    carne: dia.cond.olvido_carne, comida: dia.cond.comida_en_casa,
    manana: est.hora < 780, tarde: est.hora >= 780 && est.hora < 1080, noche: est.hora >= 1080,
    retraso: est.retraso > 0 && est.paso <= iAula, dia: est.numero, diasRestantes: est.diasRestantes,
    cerca: cercano ? cercano.id : "", siguiente: siguiente < dia.paradas.length ? dia.paradas[siguiente].lugar : "",
    comioRecien: comioRecien(), sinfondos: est.sinFondos > 0,
    // fracción de la referencia de hoy que ya gastó: 0.5 es la mitad, más de 1 es pasada
    refUso: Motor.estadoReferencia(gastadoHoy(), est.referencia).fraccion,
  };
}

// lo que camila lleva gastado hoy: saldo con que empezó menos saldo actual.
const gastadoHoy = () => Math.max(0, redondear(est.saldoInicial - est.saldo));

// dice si comió en la parada actual o en la anterior, para que no piense que tiene hambre justo después de comer.
function comioRecien() {
  const recientes = new Set(dia.paradas.slice(Math.max(0, siguiente - 2), siguiente).map(q => q.id));
  if (recientes.has("cafeteria") && dia.cond.comida_en_casa) return true;   // almorzó su táper
  return est.log.some(l => recientes.has(l.parada) && l.acepta && l.resultado === "aceptado"
    && ((dia.catalogo.eventos.find(e => e.id === l.id) || dia.catalogo.fijos.find(f => f.id === l.id) || { efecto: {} }).efecto.hambre || 0) < 0);
}

// dice si se cumple la condición de un pensamiento. la condición junta varios términos y se tienen que
// cumplir todos, por ejemplo hambre de 7 o más y que sea de mañana, o que no llueva.
// los términos hizo y rechazo seguidos de un evento miran el historial de hoy, para los recuerdos en pasado.
function cumplePensamiento(condicion, c, parada) {
  if (!condicion) return true;
  return condicion.split("&").every(t => {
    // hay:evento: ese evento salió en el calendario de hoy, en la parada del pensamiento o en cualquiera
    const e = t.match(/^hay:(\w+)$/);
    if (e) return eventoEnCalendario(dia, e[1], parada);
    const h = t.match(/^(hizo|rechazo):(\w+)$/);
    if (h) return est.log.some(l => l.id === h[2] && (h[1] === "hizo" ? l.acepta : l.resultado === "rechazado"));
    const m = t.match(/^(!?)(\w+)(>=|<=|=|<|>)?(.*)$/);
    const [, no, clave, op, valor] = m, v = c[clave];
    if (!op) return no ? !v : !!v;
    const n = isNaN(+valor) ? valor : +valor;
    return op === ">=" ? v >= n : op === "<=" ? v <= n : op === "<" ? v < n : op === ">" ? v > n : v === n;
  });
}

// verdadero si el evento salió en el calendario ya sorteado del día, en esa parada o, sin parada, en cualquiera.
function eventoEnCalendario(d, idEvento, parada) {
  return (parada ? [parada] : Object.keys(d.eventos)).some(p => (d.eventos[p] || []).some(ev => ev.id === idEvento));
}

// un pensamiento ligado a una parada solo vale si esa parada es la siguiente pendiente y camila todavía
// no entra: nunca una parada más lejana ni una ya visitada.
function paradaPermitida(idParada) {
  return !enParada && siguiente < dia.paradas.length && dia.paradas[siguiente].id === idParada;
}

// elige el pensamiento de mayor prioridad que se cumple ahora, mirando solo hacia adelante.
// los ligados a una parada solo valen para la siguiente parada pendiente y suben 2 de prioridad.
// cada pensamiento sale una vez por día. entre empates decide su propio generador.
// en jugar yo no se usan los de tipo razon.
function elegirPensamiento() {
  const c = contextoPensar();
  if (nube.dia !== est.numero) { nube.dia = est.numero; nube.hoy = new Set(); }
  const validos = [];
  for (const t of PENSAMIENTOS) {
    if (nube.hoy.has(t.id) || (modo === "jugar" && t.tipo === "razon")) continue;
    let prioridad = t.prioridad;
    if (t.parada) {
      if (!paradaPermitida(t.parada)) continue;
      prioridad += 2;
    }
    if (cumplePensamiento(t.condicion, c, t.parada)) validos.push({ t, prioridad });
  }
  if (!validos.length) return null;
  const tope = Math.max(...validos.map(v => v.prioridad));
  const empate = validos.filter(v => v.prioridad === tope);
  const elegido = empate[Math.floor(rngPensar() * empate.length)].t;
  nube.hoy.add(elegido.id);
  nube.ultimo = elegido;
  return elegido.texto;
}

// modo agente: antes de entrar a la siguiente parada, el agente piensa la razón de lo que va a decidir en su
// primer evento. se calcula sobre una copia del estado, así que no cambia nada del juego, y no usa ningún
// generador, porque percibir y decidir solo leen datos.
function anticiparDecision() {
  if (!agenteActivo || siguiente >= dia.paradas.length || !$("chkPens").checked) return null;
  const copia = structuredClone(est);
  Motor.llegar(dia, copia, siguiente);
  let ev;
  while ((ev = Motor.siguienteEvento(dia, copia)) && ev.tipo === "fijo") Motor.aplicar(dia, copia, ev, true);
  if (!ev) return null;
  const d = agenteActivo.decidir(agenteActivo.percibir(dia, copia, ev));
  const tema = ev.tipo === "transporte" ? (ev.tramo === "ida" ? "Para ir" : "Para volver") : ev.titulo.length > 18 ? ev.titulo.slice(0, 17) + "…" : ev.titulo;
  return d.corta ? `${tema}: ${d.corta.charAt(0).toLowerCase() + d.corta.slice(1)}` : null;
}

// muestra un texto en la nube desde este momento.
function pensar(texto, ahora) { nube.texto = texto; nube.inicio = ahora; }

// en cada cuadro decide si aparece un pensamiento y dibuja la nube, que aparece y desaparece suave.
// no se dibuja con un panel abierto, mientras camila sube, viaja o baja, ni en el modo comparar.
// después de cada pensamiento espera unos segundos antes del siguiente.
function actualizarNube(ahora) {
  const oculta = !$("chkPens").checked || panelAbierto || $("vistaJuego").hidden || (est && est.terminado)
    || (anim && ["subir", "viaje", "bajar"].includes(anim.fase)) || cam.escala < 1;
  if (nube.texto && ahora - nube.inicio > NUBE_MS) { nube.texto = null; nube.libreDesde = ahora + NUBE_ESPERA; }
  if (oculta) { if (nube.texto) { nube.texto = null; nube.libreDesde = ahora + 1500; } return; }
  if (!nube.texto) {
    if (nube.pendiente) { pensar(nube.pendiente, ahora); nube.pendiente = null; }   // razón del agente
    // pensamientos nuevos solo mientras camina por su cuenta, no durante un viaje, porque ya eligió cómo ir
    else if (!anim && ahora >= nube.libreDesde && (modo === "jugar" || agenteCorriendo)) {
      const texto = elegirPensamiento();
      if (texto) pensar(texto, ahora); else nube.libreDesde = ahora + 2000;
    }
  }
  if (!nube.texto) return;
  const t = ahora - nube.inicio;
  dibujarNube(nube.texto, Math.min(1, t / NUBE_FUNDIDO, (NUBE_MS - t) / NUBE_FUNDIDO));
}
