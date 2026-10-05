// archivo: comparacion.js, carpeta interfaz.
// qué hace: arma la sección del modo comparar con tu presupuesto: los deslizadores de los pesos del agente
// de utilidad, la configuración del periodo, los colores de cada agente y la tabla de un periodo por agente
// con el presupuesto y la semilla que eligió la persona, junto con el gráfico de saldo.
// se relaciona con: corridas.js del simulador, que corre cada periodo, con base de datos.js, donde se guarda
// y se lee, con grafico.js, que dibuja el saldo por día, con utilidad.js, cuyos pesos cambian los
// deslizadores, y con comparar.css.
// responsable: yasmin akemi haji taira.
"use strict";

// comparación con tu presupuesto.
// pesos del agente de utilidad que se pueden cambiar con deslizadores, con su nombre en pantalla.
const PESOS_INFO = [["bienestar", "Bienestar"], ["hambre", "Hambre"], ["puntualidad", "Puntualidad"], ["seguridad", "Seguridad"], ["riesgo", "Riesgo de no alcanzar"]];
// crea los deslizadores de los pesos. al moverlos cambian los pesos del agente de utilidad al instante.
function crearSliders() {
  $("sliders").innerHTML = PESOS_INFO.map(([k, n]) =>
    `<label>${n}<input type="range" min="0" max="5" step="0.5" value="${AGENTES.utilidad.pesos[k]}" data-k="${k}"><span>${AGENTES.utilidad.pesos[k]}</span></label>`).join("");
  $("sliders").querySelectorAll("input").forEach(i => (i.oninput = () => {
    AGENTES.utilidad.pesos[i.dataset.k] = parseFloat(i.value); i.nextElementSibling.textContent = i.value;
  }));
  // al soltar un deslizador se recalcula la tabla de tu presupuesto con los pesos nuevos
  $("sliders").querySelectorAll("input").forEach(i => (i.onchange = () => { if (!$("vistaComparar").hidden) pintarTuPresupuesto(); }));
}
// configuración del periodo, que completa la pantalla de inicio: presupuesto, duración y semilla base.
let CONFIG = { presupuesto: 390, duracion: 15, semillaBase: 2025 };
const N_CORRIDAS = 200;   // periodos por agente y por nivel en el experimento del botón comparar
// color de cada agente en la tabla y en el gráfico.
const COLOR_AGENTE = { "Modo base": "#94a3b8", "Agente reflejo": "#f9a8d4", "Basado en modelo": "#60a5fa",
  "Basado en objetivos": "#fbbf24", "Basado en utilidad": "#2dd4bf", "Persona": "#ff7a6b" };
// orden en que se muestran los agentes: el mismo en que se registraron, y la persona al final.
const ORDEN_AGENTES = [...Object.values(AGENTES).map(a => a.nombre), "Persona"];

// nombre del lote de la corrida con tu presupuesto: cambia si cambian la configuración o los pesos.
const loteTu = () => `tu-${CONFIG.presupuesto}-${CONFIG.duracion}-${CONFIG.semillaBase}-${Object.values(AGENTES.utilidad.pesos).join("_")}`;

// corre un periodo de cada agente con tu presupuesto y lo guarda, una sola vez por cada configuración.
function asegurarTuPresupuesto() {
  const lote = loteTu();
  if (BD.ejecucionesDeLote(lote).some(f => f.agente !== "Persona")) return lote;
  BD.transaccion(() => Object.values(AGENTES).forEach((agente, i) => {
    const t0 = performance.now();
    const { per, resumen } = Simulador.correrPeriodo(agente, CONFIG.presupuesto, CONFIG.duracion, CONFIG.semillaBase, CATALOGO);
    const ms = performance.now() - t0;
    const cond = i ? null : per.dias.map(d => ({ ...Simulador.condiciones(Motor.semillaDelDia(CONFIG.semillaBase, d.numero), CATALOGO),
      semilla_base: CONFIG.semillaBase, dia: d.numero, presupuesto: CONFIG.presupuesto, duracion: CONFIG.duracion }));
    BD.guardarPeriodo(lote, agente.nombre, "tu", resumen, per.dias, ms, null, cond);
  }));
  return lote;
}

// porcentaje de viajes hechos en cada medio: bus, mototaxi, taxi y a pie.
function porcentajesViaje(b, m, t, p) {
  const tot = Math.max(1, (b || 0) + (m || 0) + (t || 0) + (p || 0));
  return [b, m, t, p].map(v => Math.round(100 * (v || 0) / tot) + "%").join(" / ");
}

// nombre que se muestra para una fila: la persona aparece como jugador mixto, con los días que jugó.
function nombreFila(f) {
  if (f.agente !== "Persona") return f.agente;
  const d = f.detalle ? JSON.parse(f.detalle) : null;
  const dias = k => `${k} ${k === 1 ? "día" : "días"}`;
  return d ? `Persona (mixto: ${dias(d.diasPersona)} tú, ${dias(d.diasAgente)} ${d.agenteAyuda})` : "Persona";
}

// tabla y gráfico de tu presupuesto: un periodo por agente y, si jugaste, tu último periodo.
function pintarTuPresupuesto() {
  const lote = asegurarTuPresupuesto();
  $("tituloTu").textContent = `Tu presupuesto: ${S(CONFIG.presupuesto)} · ${CONFIG.duracion} días · semilla base ${CONFIG.semillaBase}`;
  const todas = BD.ejecucionesDeLote(lote);
  const personas = todas.filter(f => f.agente === "Persona");
  const filas = todas.filter(f => f.agente !== "Persona").sort((a, b) => ORDEN_AGENTES.indexOf(a.agente) - ORDEN_AGENTES.indexOf(b.agente));
  if (personas.length) filas.push({ ...personas[personas.length - 1], corridasPersona: personas.length });
  $("tablaTu").querySelector("tbody").innerHTML = filas.map(f => `<tr class="${f.agente === "Persona" ? "persona" : ""}">
    <td><span class="punto" style="background:${COLOR_AGENTE[f.agente]}"></span>${nombreFila(f)}</td><td>${S(f.presupuesto)}</td>
    <td>${f.dia_quiebre ? `<span class="mal">día ${f.dia_quiebre}</span>` : f.llego ? `<span class="ok">le alcanzó</span>` : "en curso"}</td>
    <td>${S(f.saldo_final)}</td><td>${f.bienestar_total.toFixed(1)}</td><td><b>${f.bienestar_prom.toFixed(2)}</b></td>
    <td>${f.sin_fondos || 0}</td><td>${porcentajesViaje(f.v_bus, f.v_moto, f.v_taxi, f.v_pie)}</td><td>${f.agente === "Persona" ? "—" : f.ms.toFixed(1)}</td><td>${f.corridasPersona || 1}</td></tr>`).join("");
  pintarGraficoSaldo(filas.map(f => ({
    nombre: f.agente === "Persona" ? "Persona" : f.agente, color: COLOR_AGENTE[f.agente], quiebre: f.dia_quiebre,
    puntos: [{ dia: 0, saldo: f.presupuesto }, ...BD.historialDe(f.id).map(h => ({ dia: h.dia, saldo: h.saldo_final }))],
  })));
}
