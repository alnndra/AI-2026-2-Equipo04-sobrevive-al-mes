// archivo: periodo.js, carpeta interfaz.
// qué hace: maneja el periodo de varios días en pantalla. resuelve sin gráficos los días anteriores al día
// elegido, pone en el mapa el día que se juega o se mira, resuelve el resto del día con el botón rápido,
// muestra el resumen de fin de día con la referencia de gasto y el resumen del periodo completo, y guarda
// en la base de datos el periodo de la persona.
// se relaciona con: motor.js y metricas.js, que encadenan los días y calculan el puntaje, con corridas.js
// del simulador, que resuelve los días por detrás, con base de datos.js, donde se guarda el periodo, y con
// paneles.js, que muestra cada resumen.
// responsable: yasmin akemi haji taira.
"use strict";

// periodo de varios días.
// agente que resuelve los días por detrás: en el modo jugar, el elegido como ayuda, y en el modo ver a un
// agente, ese mismo agente.
function agenteDeAyuda() { return AGENTES[modo === "agente" ? $("selAgente").value : $("selAyuda").value]; }

// empieza el periodo con la configuración actual: resuelve sin gráficos los días anteriores al elegido en el
// selector y deja a camila en su casa el día elegido. si quiebra antes, muestra el resumen.
function iniciarPeriodo() {
  clearTimeout(esperaAgente); agenteCorriendo = false; rutaAgente = []; objetivo = null; anim = null; pendienteAgente = null;
  PERIODO = Motor.nuevoPeriodo(CONFIG.presupuesto, CONFIG.duracion, CONFIG.semillaBase);
  rngPensar = mulberry32((CONFIG.semillaBase ^ 0x5eed5eed) >>> 0);   // generador propio de la nube, aparte del de los eventos
  nube.texto = null; nube.pendiente = null; nube.hoy = new Set(); nube.libreDesde = 0;
  const elegido = Math.min(CONFIG.duracion, parseInt($("selDia").value, 10) || 1);
  while (!PERIODO.terminado && PERIODO.dias.length < elegido - 1) resolverDiaDetras();
  actualizarBotonAgente();
  if (PERIODO.terminado) return mostrarResumenPeriodo(`Se quedó sin dinero el día ${PERIODO.diaQuiebre}, antes del día ${elegido} que elegiste para el mapa.`);
  empezarDiaEnMapa(PERIODO.dias.length + 1);
}

// resuelve el siguiente día del periodo sin gráficos con el agente de ayuda y lo anota en el periodo.
function resolverDiaDetras() {
  const n = PERIODO.dias.length + 1;
  const d = Motor.diaDelPeriodo(PERIODO, n, CATALOGO);   // calendario completo antes de decidir
  const r = Simulador.resolverResto(agenteDeAyuda(), d, Motor.estadoInicial(d, PERIODO.saldo, { numero: n, duracion: PERIODO.duracion }));
  r.quien = "agente";
  Motor.registrarDia(PERIODO, r);
  return r;
}

// pone en el mapa un día del periodo: camila en la puerta de su casa con el saldo del día anterior, y el
// panel de la casa con las condiciones del día y los gastos fijos.
function empezarDiaEnMapa(n) {
  clearTimeout(esperaAgente); rutaAgente = []; objetivo = null; anim = null; diaDelegado = false; evMostrado = null;
  dia = Motor.diaDelPeriodo(PERIODO, n, CATALOGO);
  est = Motor.estadoInicial(dia, PERIODO.saldo, { numero: n, duracion: PERIODO.duracion });
  siguiente = 1; enParada = false;
  cam.x = LUGAR.casa.sx; cam.y = LUGAR.casa.base + 16; cam.dir = "down"; cam.t = 0; cam.escala = 1;
  pintarHUD(); actualizarBotonAgente();
  const c = dia.cond, fijo = Motor.gastoFijoDiario(CATALOGO);
  const lineas = [
    `Día <b>${n} de ${PERIODO.duracion}</b>. Camila tiene <b>${S(est.saldo)}</b>${n > 1 ? " (lo que le quedó ayer)" : " (su presupuesto)"}.`,
    c.comida_en_casa ? "Hay comida en casa: desayunó y lleva su táper." : "<b>No hay comida en casa</b>: tendrá que comprar desayuno y almuerzo.",
    c.lluvia ? "Está garuando." : "El día está despejado.",
    c.paro ? "<b>Hay paro de transporte.</b>" : "",
    c.entrega_impreso ? "Hoy debe entregar un trabajo impreso." : "",
    c.examen ? "Mañana tiene examen." : "",
    `Batería del celular: ${c.bateria_inicial}%.`,
  ].filter(Boolean);
  const faltan = PERIODO.duracion - n;
  // días anteriores resueltos sin mapa por el agente de ayuda: listado compacto con la referencia
  const previos = PERIODO.dias.filter(d => d.quien === "agente");
  const listaPrevios = previos.length ? `<details open><summary style="cursor:pointer">Días resueltos por ${agenteDeAyuda().nombre} antes de hoy (${previos.length})</summary>${listaDiasCompacta(previos)}</details>` : "";
  abrirPanel("Casa", `Semilla base ${PERIODO.semillaBase} · día ${n} · ${hhmm(est.hora)}`, `<p>${lineas.join(" ")}</p>
    ${listaPrevios}
    <p>Gastos fijos de hoy: pasajes ${S(fijo.pasajes)}${c.comida_en_casa ? "" : " y menú " + S(fijo.almuerzo)}.
    ${faltan ? `Después de hoy faltan <b>${faltan} días</b>: en fijos necesitará unos ${S(faltan * fijo.esperado)} (hasta ${S(faltan * fijo.maximo)}).` : "<b>Es el último día del periodo.</b>"}</p>
    <div class="acciones">${modo === "jugar" ? `<button class="btn primario" id="bSalir">Salir de casa</button><button class="btn" id="bRapido">⚡ Resolver el día rápido</button>` : ""}</div>`);
  if (modo === "jugar") { $("bSalir").onclick = cerrarPanel; $("bRapido").onclick = resolverDiaRapido; $("bSalir").focus(); }
}

// botón de resolver el día rápido: el agente de ayuda decide todo lo que queda de este día, desde donde va.
function resolverDiaRapido() {
  if (modo !== "jugar" || !est || est.terminado || anim) return;
  if (evMostrado) { est.cola.unshift(evMostrado); evMostrado = null; }   // el evento en pantalla vuelve a la cola
  diaDelegado = true; enParada = false;
  $("panel").hidden = true; panelAbierto = false;
  finDelDia(Simulador.resolverResto(agenteDeAyuda(), dia, est));
}

// fin del día en el mapa: se anota en el periodo y se muestra cómo le fue, con el resumen de la referencia
// de gasto. en el modo jugar también se muestra cómo habrían resuelto ese mismo día los agentes,
// empezando con el mismo saldo.
function finDelDia(r) {
  r = r || Motor.cerrarDia(dia, est);
  r.quien = modo === "jugar" && !diaDelegado ? "persona" : "agente";
  Motor.registrarDia(PERIODO, r);
  let comp = "";
  if (modo === "jugar") {
    const filas = Object.values(AGENTES).map(a => {
      const d = Motor.diaDelPeriodo(PERIODO, r.numero, CATALOGO);
      return { n: a.nombre, ...Simulador.resolverResto(a, d, Motor.estadoInicial(d, r.saldoInicial, { numero: r.numero, duracion: PERIODO.duracion })) };
    });
    filas.unshift({ n: r.quien === "persona" ? "Tú" : `Tú (resuelto por ${agenteDeAyuda().nombre})`, ...r });
    comp = `<h3 style="margin:14px 0 4px">Este mismo día, con el mismo saldo inicial, resuelto por los agentes</h3>
      <div class="tabla-wrap"><table><thead><tr><th>Quién</th><th>Gastó</th><th>Saldo final</th><th>Volvió en transporte</th><th>Puntual</th><th>Bienestar</th><th>Puntaje</th></tr></thead><tbody>
      ${filas.map((f, i) => `<tr class="${i === 0 ? "persona" : ""}"><td>${f.n}</td><td>${S(f.gasto)}</td><td>${S(f.saldoSiguiente)}</td><td>${f.volvio ? "Sí" : "No"}</td><td>${f.puntual ? "Sí" : "No"}</td><td>${f.bienestar.toFixed(1)}</td><td><b>${f.puntaje.toFixed(1)}</b></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  pintarHUD();
  const sigue = !PERIODO.terminado, n = r.numero;
  abrirPanel(`Fin del día ${n}`, `Casa · ${hhmm(est.hora)} · día ${n} de ${PERIODO.duracion}`, `
    <div class="grande" style="grid-template-columns:repeat(4,1fr)">
      <div><small>Gastó hoy</small><strong>${S(r.gasto)}</strong></div>
      <div><small>Saldo para mañana</small><strong>${S(r.saldoSiguiente)}</strong></div>
      <div><small>Volvió en transporte</small><strong class="${r.volvio ? "ok" : "mal"}">${r.volvio ? "Sí" : "No"}</strong></div>
      <div><small>Puntaje del día</small><strong>${r.puntaje.toFixed(1)}</strong></div></div>
    ${r.quiebre ? `<p class="mal"><b>Se acabó el dinero:</b> no pudo pagar el pasaje de regreso el día ${n}. El periodo termina aquí.</p>` : ""}
    ${r.saldoFinal < 0 ? `<p class="mal">Las deudas del día no alcanzaron a pagarse: penalización por saldo negativo y el saldo queda en S/ 0.00.</p>` : ""}
    ${resumenReferencia(r)}
    ${comp}
    <details style="margin-top:10px"><summary style="cursor:pointer">Ver todas las decisiones del día (${est.log.length})</summary>
      <ul class="historial">${est.log.map(l => `<li><b>${dia.paradas.find(p => p.id === l.parada).nombre}</b> · ${l.titulo} (${S(l.costo)}): ${etiquetaResultado(l)} — ${l.texto}</li>`).join("")}</ul></details>
    ${est.sinFondos ? `<p class="mal" style="font-size:13px">Intentos sin fondos hoy: ${est.sinFondos}.</p>` : ""}
    <div class="acciones">${!sigue ? `<button class="btn primario" id="bResumen">Ver el resumen del periodo</button>`
      : modo === "jugar" ? `<button class="btn primario" id="bManana">Jugar el día ${n + 1} en el mapa</button><button class="btn" id="bResto">Resolver los días restantes con ${agenteDeAyuda().nombre}</button>`
      : ""}</div>`);
  if (!sigue) { $("bResumen").onclick = () => mostrarResumenPeriodo(); agenteCorriendo = false; actualizarBotonAgente(); }
  else if (modo === "jugar") {
    $("bManana").onclick = () => empezarDiaEnMapa(n + 1);
    $("bResto").onclick = () => { while (!PERIODO.terminado) resolverDiaDetras(); mostrarResumenPeriodo(); };
  } else esperar(() => { while (!PERIODO.terminado) resolverDiaDetras(); mostrarResumenPeriodo(); }, 2600);
}

// referencia de mañana: se calcula con el saldo que le quedó y los días que faltan. si era el último día o
// quebró, no hay referencia de mañana y devuelve nulo.
function referenciaManana(r) {
  if (r.numero >= PERIODO.duracion || r.quiebre) return null;
  return Motor.referenciaDelDia(Motor.diaDelPeriodo(PERIODO, r.numero + 1, CATALOGO), r.saldoSiguiente, r.numero + 1, PERIODO.duracion).referencia;
}

// bloque del fin del día: gastado, referencia, diferencia, saldo, días que faltan y referencia de mañana,
// con una advertencia y una proyección si se pasó, o un mensaje positivo si gastó menos.
function resumenReferencia(r) {
  const dif = redondear(r.gasto - r.referencia), faltan = PERIODO.duracion - r.numero, manana = referenciaManana(r);
  let mensaje;
  if (manana === null) mensaje = `<p>${r.quiebre ? "El periodo termina aquí." : "Era el último día del periodo."}</p>`;
  else if (dif > 0) {
    const pr = Motor.proyeccionGasto(r.saldoSiguiente, r.gasto, r.numero, PERIODO.duracion);
    mensaje = `<p class="pasa" role="alert">▲ Gastaste ${S(dif)} más que la referencia. Eso baja tu referencia de mañana de ${S(r.referencia)} a ${S(manana)}.</p>
      <p>${pr.alcanza ? `Si mañana gastas lo mismo que hoy, tu dinero te alcanza hasta el día ${pr.hasta}, el último.` : `Si sigues así, te quedas sin dinero el día ${pr.quiebra}.`}</p>`;
  } else mensaje = `<p class="ok">✓ ${dif < 0 ? `Gastaste ${S(-dif)} menos que la referencia. ¡Bien!` : "Gastaste justo la referencia."} Tu referencia de mañana es ${S(manana)}${manana > r.referencia ? ", más alta que la de hoy" : ""}.</p>`;
  return `<div class="resumen-dia"><b>Referencia de hoy</b>
    <div class="grande" style="grid-template-columns:repeat(3,1fr)">
      <div><small>Gastado hoy</small><strong>${S(r.gasto)}</strong></div>
      <div><small>Referencia de hoy</small><strong>${S(r.referencia)}</strong></div>
      <div><small>Diferencia</small><strong class="${dif > 0 ? "mal" : "ok"}">${dif > 0 ? "+" : dif < 0 ? "−" : ""}${S(Math.abs(dif))}</strong></div>
      <div><small>Saldo final</small><strong>${S(r.saldoSiguiente)}</strong></div>
      <div><small>Días que faltan</small><strong>${faltan}</strong></div>
      <div><small>Referencia de mañana</small><strong>${manana === null ? "—" : S(manana)}</strong></div></div>
    ${mensaje}</div>`;
}

// listado compacto de días resueltos sin mapa: gastado, referencia y saldo, con marca si se pasó.
function listaDiasCompacta(dias) {
  return `<div class="tabla-wrap"><table class="compacta" style="min-width:0"><thead><tr><th>Día</th><th>Gastó</th><th>Referencia</th><th>Saldo</th></tr></thead><tbody>
    ${dias.map(d => `<tr><td>${d.numero}</td><td>${S(d.gasto)}${d.gasto > d.referencia + 1e-9 ? ` <span class="pasa" title="se pasó de la referencia">▲</span>` : ""}</td><td>${S(d.referencia)}</td><td>${S(d.saldoSiguiente)}</td></tr>`).join("")}
    </tbody></table></div><p style="font-size:13px;color:var(--suave)">▲ marca los días en que gastó más que la referencia del día.</p>`;
}

// resumen del periodo completo, con el saldo y la referencia de cada día. en el modo jugar se guarda en la
// base de datos como persona, un jugador mixto: cuenta cuántos días jugó ella y cuántos resolvió el agente de ayuda.
function mostrarResumenPeriodo(nota) {
  const res = Motor.cerrarPeriodo(PERIODO);
  const diasPersona = PERIODO.dias.filter(d => d.quien === "persona").length, diasAgente = PERIODO.dias.length - diasPersona;
  if (modo === "jugar" && diasPersona > 0) {
    asegurarTuPresupuesto();
    BD.guardarPeriodo(loteTu(), "Persona", "tu", res, PERIODO.dias, 0,
      JSON.stringify({ diasPersona, diasAgente, agenteAyuda: agenteDeAyuda().nombre }), null);
  }
  agenteCorriendo = false; actualizarBotonAgente();
  est.terminado = true;
  pintarHUD();
  const quien = modo === "agente" ? agenteDeAyuda().nombre
    : `Tú jugaste ${diasPersona} ${diasPersona === 1 ? "día" : "días"} y ${agenteDeAyuda().nombre} resolvió ${diasAgente}`;
  abrirPanel("Resumen del periodo", `${S(res.presupuesto)} · ${res.duracion} días · semilla base ${res.semillaBase}`, `
    ${nota ? `<p class="mal">${nota}</p>` : ""}
    <p>${quien}.</p>
    <div class="grande" style="grid-template-columns:repeat(4,1fr)">
      <div><small>Resultado</small><strong class="${res.llego ? "ok" : "mal"}">${res.llego ? "Le alcanzó" : "Quiebre día " + res.diaQuiebre}</strong></div>
      <div><small>Saldo final</small><strong>${S(res.saldoFinal)}</strong></div>
      <div><small>Bienestar / día vivido</small><strong>${res.bienestarProm.toFixed(2)}</strong></div>
      <div><small>Puntaje total</small><strong>${res.puntaje.toFixed(1)}</strong></div></div>
    <p style="font-size:13px;color:var(--suave)">Puntaje total = suma de los puntajes diarios
      ${res.llego ? `+ ${REGLAS.bonoLlegada} por llegar al último día con el pasaje pagado` : `− ${REGLAS.penalQuiebre} por quedarse sin dinero − ${REGLAS.penalPorDiaPerdido} por cada uno de los ${res.duracion - res.diaQuiebre} días que no pudo vivir`}.
      Vivió ${res.diasVividos} de ${res.duracion} días; bienestar total ${res.bienestarTotal.toFixed(1)}.</p>
    <div class="tabla-wrap"><table class="compacta"><thead><tr><th>Día</th><th>Quién</th><th>Saldo inicial</th><th>Gastó</th><th>Referencia</th><th>Saldo final</th><th>Bienestar</th><th>Puntaje</th></tr></thead><tbody>
      ${PERIODO.dias.map(d => `<tr class="${d.quien === "persona" ? "persona" : ""}"><td>${d.numero}${d.quiebre ? " ✕" : ""}</td><td>${d.quien === "persona" ? "Tú" : agenteDeAyuda().nombre.replace("Basado en ", "B. ")}</td><td>${S(d.saldoInicial)}</td><td>${S(d.gasto)}${d.gasto > d.referencia + 1e-9 ? ' <span class="pasa" title="se pasó de la referencia">▲</span>' : ""}</td><td>${S(d.referencia)}</td><td>${S(d.saldoSiguiente)}</td><td>${d.bienestar.toFixed(1)}</td><td>${d.puntaje.toFixed(1)}</td></tr>`).join("")}
    </tbody></table></div>
    <p style="font-size:13px;color:var(--suave)">▲ marca los días en que gastó más que la referencia del día.</p>
    <div class="acciones"><button class="btn primario" id="bComparar">Ver la comparación</button><button class="btn" id="bRepetir">Repetir el periodo</button><button class="btn" id="bNuevoPer">Cambiar presupuesto</button></div>`);
  $("bComparar").onclick = () => { cerrarPanel(); cambiarModo("comparar"); };
  $("bRepetir").onclick = iniciarPeriodo;
  $("bNuevoPer").onclick = abrirInicio;
}
