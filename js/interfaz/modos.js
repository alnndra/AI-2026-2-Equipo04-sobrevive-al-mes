// archivo: modos.js, carpeta interfaz.
// qué hace: maneja los tres modos de uso: jugar yo, ver a un agente y comparar agentes. en el modo agente
// controla la velocidad, la pausa y el botón de iniciar, y hace caminar al agente hasta la siguiente parada.
// también reacciona cuando se cambia la semilla, el día o el agente.
// se relaciona con: periodo.js, que rehace el periodo al cambiar algo, con pensamientos.js del mapa, que
// anticipa la razón del agente, con movimiento.js, que arma su ruta, y con comparacion.js de la interfaz.
// responsable: yasmin akemi haji taira.
"use strict";

// modo agente.
// velocidad elegida con el deslizador, de 1 a 8 veces.
function velocidad() { return parseInt($("velocidad").value, 10); }
// espera un tiempo, más corto a mayor velocidad, y luego ejecuta la acción. si el agente está en pausa,
// la guarda para seguir al reanudar.
function esperar(fn, ms) {
  clearTimeout(esperaAgente);
  esperaAgente = setTimeout(() => { if (agenteCorriendo) fn(); else pendienteAgente = fn; }, ms / velocidad());
}
let pendienteAgente = null;   // acción que quedó guardada al pausar
// hace caminar al agente hasta la siguiente parada y prepara la razón que va a pensar en el camino.
function caminarAgente() {
  if (siguiente >= dia.paradas.length) return;
  rutaAgente = rutaHacia(LUGAR[dia.paradas[siguiente].lugar]);
  nube.pendiente = anticiparDecision();   // la razón se ve mientras camina hacia el lugar
}
// cambia el texto del botón del agente: pausar, otra vez o iniciar.
function actualizarBotonAgente() {
  $("btnAgente").textContent = agenteCorriendo ? "⏸ Pausar" : (PERIODO && PERIODO.terminado ? "↻ Otra vez" : "▶ Iniciar");
}
// botón del agente: lo inicia o lo pausa, y si el periodo ya terminó, empieza uno nuevo.
$("btnAgente").onclick = () => {
  if (PERIODO.terminado) { iniciarPeriodo(); }
  agenteCorriendo = !agenteCorriendo;
  agenteActivo = AGENTES[$("selAgente").value];
  if (agenteCorriendo) {
    if (pendienteAgente) { const f = pendienteAgente; pendienteAgente = null; f(); }
    else if (!enParada && !rutaAgente.length) { cerrarPanel(); caminarAgente(); }
  }
  actualizarBotonAgente();
};
$("velocidad").oninput = () => ($("velTxt").textContent = velocidad() + "x");

// modos de uso.
// cambia de modo: muestra u oculta las partes de la página, cambia la ayuda y rehace el periodo. el modo
// comparar no cambia el modo del mapa, solo muestra la sección de comparación.
function cambiarModo(m) {
  modo = m === "comparar" ? modo : m;
  ["jugar", "agente", "comparar"].forEach(k => $("m" + k[0].toUpperCase() + k.slice(1)).setAttribute("aria-pressed", k === m));
  $("vistaJuego").hidden = m === "comparar";
  $("vistaComparar").hidden = m !== "comparar";
  $("ctrlAgente").hidden = m !== "agente";
  $("ctrlJugar").hidden = m !== "jugar";
  $("ayuda").textContent = m === "agente"
    ? "Elige un agente y presiona Iniciar. Los días anteriores al elegido en \"Día en el mapa\" se resuelven sin gráficos; ese día Camila camina sola y el panel muestra qué decide y por qué."
    : "Camina con W A S D, las flechas o arrastrando sobre el mapa. En la puerta de tu siguiente parada presiona E o Enter. Los días que no juegas los resuelve el agente de ayuda.";
  if (m !== "comparar") { modo = m; iniciarPeriodo(); }
  else { $("nivelesTxt").textContent = textoNiveles(); pintarTuPresupuesto(); }
}
$("mJugar").onclick = () => cambiarModo("jugar");
$("mAgente").onclick = () => cambiarModo("agente");
$("mComparar").onclick = () => cambiarModo("comparar");
// la semilla base y el día del mapa se pueden cambiar en cualquier momento: el periodo se rehace.
$("semilla").onchange = () => {
  CONFIG.semillaBase = Math.max(1, parseInt($("semilla").value, 10) || 1);
  if (modo === "comparar") pintarTuPresupuesto(); else iniciarPeriodo();
};
$("selDia").onchange = () => { if (modo !== "comparar") iniciarPeriodo(); };
$("selAyuda").onchange = () => { if (modo === "jugar") iniciarPeriodo(); };
$("selAgente").onchange = () => { if (modo === "agente") iniciarPeriodo(); };
