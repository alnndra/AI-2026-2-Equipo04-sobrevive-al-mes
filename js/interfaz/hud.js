// archivo: hud.js, carpeta interfaz.
// qué hace: actualiza el panel lateral con el estado de camila: saldo, hora, parada, barras de hambre,
// energía y batería, el indicador de referencia de gasto de hoy, los pagos pendientes, las condiciones del
// día y el puntaje parcial. también pinta la fila de paradas del recorrido.
// se relaciona con: motor.js, que da el estado, los pagos pendientes y la referencia, con estado.js, que
// guarda el día actual, con pensamientos.js del mapa, que calcula lo gastado hoy, y con hud.css.
// responsable: yasmin akemi haji taira.
"use strict";

// panel de estado.
// arma una barra con su nombre, su valor, su máximo, su color y un texto a la derecha.
function barra(nombre, valor, max, color, texto) {
  return `<div class="barra"><div class="fila"><span>${nombre}</span><span>${texto}</span></div>
    <div class="riel"><i style="width:${(100 * valor / max).toFixed(0)}%;background:${color}"></i></div></div>`;
}
// actualiza el panel lateral con el estado actual del motor. se llama cada vez que algo cambia.
function pintarHUD() {
  if (!est) return;
  $("hSaldo").textContent = S(est.saldo);
  $("hSaldo").style.color = est.saldo < 5 ? "var(--rojo)" : "";
  $("hHora").textContent = hhmm(est.hora);
  $("hParada").textContent = dia.paradas[est.paso].nombre;
  $("hDia").innerHTML = PERIODO ? `Día <b>${est.numero} de ${PERIODO.duracion}</b> · presupuesto ${S(PERIODO.presupuesto)}${PERIODO.diaQuiebre ? ` · <span class="mal">sin dinero el día ${PERIODO.diaQuiebre}</span>` : ""}` : "";
  const colH = est.hambre > 6 ? "var(--rojo)" : est.hambre > 4 ? "var(--ambar)" : "var(--verde)";
  $("barras").innerHTML =
    barra("Hambre", est.hambre, 10, colH, est.hambre.toFixed(1) + " / 10") +
    barra("Energía", est.energia, 10, "var(--azul)", est.energia.toFixed(1) + " / 10") +
    barra("Batería del celular", est.bateria, 100, est.bateria < 15 ? "var(--rojo)" : "var(--acento)", Math.round(est.bateria) + "%") +
    `<div style="font-size:13px;margin-top:6px">Clima: <b>${est.clima === "Garúa" ? "🌧 Garúa" : "☀ Despejado"}</b></div>`;
  pintarReferencia();
  const pend = Motor.pendientes(dia, est);
  $("hPendientes").innerHTML = pend.length ? pend.map(p => `<li><span>${p.nombre}</span><b>${S(p.monto)}</b></li>`).join("")
    : `<li><span style="color:var(--suave)">Nada pendiente</span></li>`;
  const c = dia.cond;
  $("hCond").innerHTML = [
    c.comida_en_casa ? "🍲 Hay comida en casa" : "🚫 No hay comida en casa",
    c.lluvia ? "🌧 Garúa" : "☀ Sin lluvia", c.paro ? "🚌 Paro de transporte" : null, c.entrega_impreso ? "📄 Entrega impresa" : null,
    c.examen ? "📝 Examen mañana" : null, c.olvido_carne ? "🪪 Olvidó el carné" : null,
  ].filter(Boolean).map(t => `<span>${t}</span>`).join("");
  const puntual = est.puntual === null ? "—" : est.puntual ? `<span class="ok">Sí (+${REGLAS.bonoPuntual})</span>` : `<span class="mal">No</span>`;
  $("hPuntaje").innerHTML = `<li><span>Bienestar acumulado</span><b>${est.bienestar.toFixed(1)}</b></li>
    <li><span>Llegó puntual</span><b>${puntual}</b></li><li><span>Deudas</span><b>${S(est.deuda)}</b></li>`;
  pintarRuta();
}
// estado de la referencia: palabra corta con símbolo y color, para no depender solo del color
const ESTADO_REF = { tranquila: ["✓ Tranquila", "var(--verde)"], atencion: ["! Atención", "var(--ambar)"], pasada: ["▲ Pasada", "var(--rojo)"] };

// indicador referencia de hoy: barra de lo gastado contra la referencia, estado y cómo se divide.
function pintarReferencia() {
  const g = gastadoHoy(), er = Motor.estadoReferencia(g, est.referencia);
  const [palabra, color] = ESTADO_REF[er.estado];
  const exceso = redondear(g - est.referencia);
  $("hRef").innerHTML = barra(`Gastado ${S(g)} de ${S(est.referencia)}`, Math.min(1, er.fraccion), 1, color,
    `<span class="ref-estado" style="color:${color}">${palabra}</span>`) +
    `<div class="ref-texto">Más o menos ${S(est.referencia)} hoy, de los cuales ${S(est.parteFija)} son fijos y ${S(est.parteLibre)} libres.${exceso > 0 ? ` <span class="pasa">Vas ${S(exceso)} por encima.</span>` : ""}</div>`;
}

// pinta la fila de paradas del recorrido: las visitadas con un visto y la siguiente resaltada.
function pintarRuta() {
  $("ruta").innerHTML = dia.paradas.map((p, i) =>
    `<span class="${i < siguiente ? "hecha" : i === siguiente ? "actual" : ""}">${i < siguiente ? "✓ " : ""}${p.nombre}</span>`).join("");
}
