// archivo: tabla experimento.js, carpeta interfaz.
// qué hace: corre el experimento del botón comparar agentes y muestra la tabla comparativa: por cada nivel
// de presupuesto y cada agente, el porcentaje que llegó al final, el día de quiebre, el saldo, el bienestar,
// el puntaje, el tiempo por corrida y las corridas, con la técnica ganadora resaltada. debajo explica si el
// modo base empata o supera a la ganadora en algún nivel.
// se relaciona con: comparacion.js del simulador, que corre cada nivel, con base de datos.js, que calcula
// los promedios, y con comparacion.js de la interfaz, que da la configuración y los colores.
// responsable: yasmin akemi haji taira.
"use strict";

// corre el experimento completo nivel por nivel, con pausas cortas para que la página no se congele.
async function correrComparacion() {
  const base = CONFIG.semillaBase, dur = CONFIG.duracion;
  const lote = `exp-${base}-${dur}-${Object.values(AGENTES.utilidad.pesos).join("_")}-${Date.now()}`;
  $("btnComparar").disabled = true;
  const t0 = performance.now();
  for (const [nivel, factor] of NIVELES) {
    $("estadoComparar").textContent = `Simulando nivel ${nivel}…`;
    await new Promise(r => setTimeout(r, 20));
    Simulador.compararNivel(lote, nivel, factor, N_CORRIDAS, base, dur, CATALOGO, BD);
  }
  ultimoLote = lote;
  pintarTablaExperimento(BD.resumen(lote));
  $("btnComparar").disabled = false;
  $("estadoComparar").textContent = `Listo en ${((performance.now() - t0) / 1000).toFixed(1)} s: ${N_CORRIDAS} periodos de ${dur} días por técnica y nivel, semillas base ${base} a ${base + N_CORRIDAS - 1}. Base de datos: ${BD.modo === "sqlite" ? "SQLite (sql.js)" : "respaldo en memoria"}.`;
}

// tabla del experimento: por nivel de presupuesto y por agente. se resalta la técnica ganadora de cada nivel.
function pintarTablaExperimento(filas) {
  const ordenNivel = NIVELES.map(n => n[0]);
  filas.sort((a, b) => ordenNivel.indexOf(a.nivel) - ordenNivel.indexOf(b.nivel) || ORDEN_AGENTES.indexOf(a.agente) - ORDEN_AGENTES.indexOf(b.agente));
  const mejor = {};
  filas.forEach(f => { if (!mejor[f.nivel] || f.puntaje > mejor[f.nivel].puntaje) mejor[f.nivel] = f; });
  $("tablaExp").querySelector("tbody").innerHTML = filas.map((f, i) => `<tr class="${mejor[f.nivel] === f ? "mejor" : ""} ${i && filas[i - 1].nivel !== f.nivel ? "nivel-ini" : ""}">
    <td>${i && filas[i - 1].nivel === f.nivel ? "" : `<b>${f.nivel}</b><br><small style="color:var(--suave)">${S(f.presupuesto)}</small>`}</td>
    <td><span class="punto" style="background:${COLOR_AGENTE[f.agente]}"></span>${f.agente}</td><td>${f.llego.toFixed(1)}%</td>
    <td>${f.dia_quiebre ? f.dia_quiebre.toFixed(1) : "—"}</td><td>${S(f.saldo)}</td><td>${f.bienestar_prom.toFixed(2)}</td>
    <td><b>${f.puntaje.toFixed(1)}</b></td><td>${(f.sin_fondos || 0).toFixed(1)}</td><td>${[f.p_bus, f.p_moto, f.p_taxi, f.p_pie].map(v => (v || 0).toFixed(0) + "%").join(" / ")}</td><td>${f.ms.toFixed(0)}</td><td>${f.corridas}</td></tr>`).join("");
  $("lineaBase").hidden = false;
  $("lineaBase").innerHTML = textoModoBase(filas, mejor);
}

// línea para el examen oral: dice en qué nivel el modo base empata o supera a la técnica ganadora.
// se considera empate si la diferencia de puntaje es menor al 5 por ciento del rango de puntajes del nivel.
function textoModoBase(filas, mejor) {
  const partes = [], gana = [];
  for (const [nivel] of NIVELES) {
    const delNivel = filas.filter(f => f.nivel === nivel);
    const base = delNivel.find(f => f.agente === "Modo base");
    const top = delNivel.filter(f => f.agente !== "Modo base").sort((a, b) => b.puntaje - a.puntaje)[0];
    if (!base || !top) continue;
    const rango = Math.max(...delNivel.map(f => f.puntaje)) - Math.min(...delNivel.map(f => f.puntaje)) || 1;
    const empata = base.puntaje >= top.puntaje - 0.05 * rango;
    if (empata) gana.push(nivel);
    partes.push(`${nivel}: base ${base.puntaje.toFixed(1)} vs. ${top.agente} ${top.puntaje.toFixed(1)}`);
  }
  const resumen = gana.length
    ? `<b>El modo base empata o supera a la técnica ganadora en el nivel ${gana.join(" y ")}.</b>`
    : `<b>El modo base no empata ni supera a la técnica ganadora en ningún nivel.</b> Su bienestar por día vivido suele ser alto (gasta sin pensar), pero se queda sin dinero antes del final.`;
  return `${resumen} (${partes.join(" · ")}).`;
}

// texto con el presupuesto de cada nivel, que se muestra arriba del botón de comparar.
function textoNiveles() {
  return NIVELES.map(([n, f]) => `${n} ${S(Simulador.presupuestoNivel(f, CONFIG.duracion, CATALOGO))} (${f}× el fijo esperado)`).join(", ");
}
// el botón de comparar corre el experimento completo.
$("btnComparar").onclick = correrComparacion;
