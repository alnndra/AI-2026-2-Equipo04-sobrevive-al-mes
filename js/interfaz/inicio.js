// archivo: inicio.js, carpeta interfaz.
// qué hace: maneja la pantalla de inicio, donde la persona elige el presupuesto, la duración de 15 o 30
// días y la semilla base. explica cuánto cuesta el día en gastos fijos, valida el presupuesto mínimo, llena
// los selectores de día y busca semillas de demostración con los casos especiales del transporte.
// se relaciona con: motor.js, que calcula el gasto fijo diario y arma los días de prueba, con periodo.js,
// que empieza el periodo, con comparacion.js de la interfaz, que guarda la configuración, y con inicio.css.
// responsable: yasmin akemi haji taira.
"use strict";

// pantalla de inicio.
// explica cuánto cuesta el día en gastos fijos y qué tan ajustado está el presupuesto escrito.
function infoPresupuesto(pres, dur) {
  const f = Motor.gastoFijoDiario(CATALOGO);
  const prom = f.esperado * dur, peor = f.maximo * dur, veces = pres / prom;
  const nivel = veces < NIVELES[1][1] ? "ajustado" : veces < NIVELES[2][1] ? "medio" : "holgado";
  const color = veces < 1 ? "var(--rojo)" : veces < NIVELES[1][1] ? "var(--ambar)" : "var(--verde)";
  return `<b>Gasto fijo diario:</b> pasajes ${S(f.pasajes)} todos los días + menú ${S(f.almuerzo)} los días sin comida en casa
    (≈ ${Math.round(f.sinComida * 100)}% de los días) → <b>${S(f.esperado)} en promedio</b>, hasta ${S(f.maximo)} en el peor día.<br>
    <b>Para llegar al día ${dur} gastando solo los fijos</b> necesitarías unos <b>${S(prom)}</b> (hasta ${S(peor)} si nunca hubiera comida en casa).
    ${isFinite(veces) && pres > 0 ? `<div class="medidor"><i style="width:${Math.min(100, veces / NIVELES[2][1] * 100)}%;background:${color}"></i></div>
    Tu presupuesto equivale a <b>${veces.toFixed(1)}×</b> los fijos promedio: nivel <b>${nivel}</b>${veces < 1 ? " (no alcanza ni para los fijos de todos los días)" : ""}.` : ""}`;
}
// lee lo que la persona escribió en la pantalla de inicio: presupuesto, duración y semilla base.
function leerInicio() {
  return { presupuesto: parseFloat($("iniPresupuesto").value), duracion: parseInt(document.querySelector("input[name=iniDur]:checked").value, 10),
    semillaBase: Math.max(1, parseInt($("iniSemilla").value, 10) || 1) };
}
// abre la pantalla de inicio con los valores actuales.
function abrirInicio() {
  $("iniPresupuesto").value = CONFIG.presupuesto; $("iniSemilla").value = CONFIG.semillaBase;
  document.querySelectorAll("input[name=iniDur]").forEach(r => (r.checked = +r.value === CONFIG.duracion));
  $("iniPresupuesto").min = Motor.gastoFijoDiario(CATALOGO).pasajes;
  llenarSemillasDemo();
  actualizarInicio();
  $("inicio").hidden = false; $("iniPresupuesto").focus();
}
// actualiza la explicación del presupuesto cada vez que la persona cambia algo.
function actualizarInicio() {
  const c = leerInicio();
  $("iniInfo").innerHTML = infoPresupuesto(c.presupuesto || 0, c.duracion);
}
// valida el presupuesto, que como mínimo debe cubrir el pasaje de ida y vuelta de un día, y empieza el periodo.
function confirmarInicio() {
  const c = leerInicio(), minimo = Motor.gastoFijoDiario(CATALOGO).pasajes;
  if (!(c.presupuesto >= minimo)) {
    $("iniError").hidden = false;
    $("iniError").textContent = `El presupuesto mínimo es ${S(minimo)}: el pasaje de ida y vuelta de un día.`;
    return;
  }
  $("iniError").hidden = true;
  CONFIG = { presupuesto: Math.round(c.presupuesto * 100) / 100, duracion: c.duracion, semillaBase: c.semillaBase };
  $("semilla").value = CONFIG.semillaBase;
  llenarSelectorDia();
  $("inicio").hidden = true;
  if (modo === "comparar") { $("nivelesTxt").textContent = textoNiveles(); pintarTuPresupuesto(); }
  iniciarPeriodo();
}
// llena el selector del día que se ve en el mapa según la duración elegida.
function llenarSelectorDia() {
  const actual = Math.min(CONFIG.duracion, parseInt($("selDia").value, 10) || 1);
  $("selDia").innerHTML = Array.from({ length: CONFIG.duracion }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  $("selDia").value = actual;
}
// casos especiales del transporte que se pueden repetir en la presentación, con su nombre en pantalla.
const CASOS_DEMO = {
  solo_moto: "Solo queda el mototaxi (bus lleno o paro, y sin taxi)",
  bus_lleno: "El bus pasa lleno",
  sin_taxi: "No hay taxis a esa hora",
  ninguna: "No queda ninguna opción: debe caminar",
  paro: "Paro de transporte",
};
// busca semillas que producen los casos especiales del transporte, mirando solo el calendario de cada día,
// sin simular decisiones. revisa los 15 días de cada semilla base y guarda unas pocas por caso.
function buscarSemillasDemo(maxSemilla = 4000, porCaso = 4) {
  const res = Object.fromEntries(Object.keys(CASOS_DEMO).map(k => [k, []]));
  for (let sb = 1; sb <= maxSemilla && Object.values(res).some(l => l.length < porCaso); sb++) {
    for (let d = 1; d <= 15; d++) {
      const c = Motor.nuevoDia(Motor.semillaDelDia(sb, d), CATALOGO).cond;
      for (const tramo of ["ida", "vuelta"]) {
        const sinBus = c.paro || c["bus_lleno_" + tramo], sinTaxi = c["taxi_no_" + tramo], sinMoto = c["moto_no_" + tramo];
        const casos = { solo_moto: sinBus && sinTaxi && !sinMoto, bus_lleno: !c.paro && c["bus_lleno_" + tramo], sin_taxi: sinTaxi,
          ninguna: sinBus && sinTaxi && sinMoto, paro: c.paro && tramo === "ida" };
        for (const [k, si] of Object.entries(casos))
          if (si && res[k].length < porCaso && !res[k].some(x => x.semilla === sb)) res[k].push({ semilla: sb, dia: d, tramo });
      }
    }
  }
  return res;
}
// llena una sola vez el selector de semillas de demostración.
function llenarSemillasDemo() {
  if ($("iniDemo").options.length > 1) return;
  const res = buscarSemillasDemo();
  for (const [k, titulo] of Object.entries(CASOS_DEMO)) {
    const g = document.createElement("optgroup"); g.label = titulo;
    res[k].forEach(x => { const o = document.createElement("option"); o.value = `${x.semilla}|${x.dia}`;
      o.textContent = `Semilla ${x.semilla}, día ${x.dia} (${x.tramo === "ida" ? "ida" : "regreso"})`; g.appendChild(o); });
    $("iniDemo").appendChild(g);
  }
}
// al elegir un caso, se cargan esa semilla base y ese día para el mapa.
$("iniDemo").onchange = () => {
  if (!$("iniDemo").value) return;
  const [sb, d] = $("iniDemo").value.split("|").map(Number);
  $("iniSemilla").value = sb;
  document.querySelectorAll("input[name=iniDur]").forEach(r => (r.checked = r.value === "15"));
  llenarSelectorDiaHasta(15); $("selDia").value = d;
  actualizarInicio();
};
// llena el selector de día con los días del 1 al número indicado.
function llenarSelectorDiaHasta(n) {
  $("selDia").innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
}
// botones y campos de la pantalla de inicio.
$("iniPresupuesto").oninput = actualizarInicio;
document.querySelectorAll("input[name=iniDur]").forEach(r => (r.onchange = actualizarInicio));
$("iniEmpezar").onclick = confirmarInicio;
$("iniPresupuesto").onkeydown = e => { if (e.key === "Enter") confirmarInicio(); };
$("btnPresupuesto").onclick = abrirInicio;
$("btnRapido").onclick = resolverDiaRapido;
