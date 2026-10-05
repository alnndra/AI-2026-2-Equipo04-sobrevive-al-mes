// archivo: principal.js, carpeta js.
// qué hace: arranca el juego y lo mantiene vivo. el arranque llena los selectores de agentes, abre la base
// de datos, lee el catálogo y los pensamientos, empieza el periodo y abre la pantalla de inicio.
// el bucle principal se repite en cada cuadro: mueve a camila con las teclas, el dedo o la ruta del agente,
// anima los viajes, muestra el botón de entrar, dibuja la escena y actualiza la nube de pensamientos.
// es el último archivo que se carga, porque usa funciones de todos los demás.
// se relaciona con: base de datos.js, periodo.js, inicio.js, escena.js, movimiento.js, animacion viaje.js y
// pensamientos.js, entre otros.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// bucle principal.
// momento del cuadro anterior, para saber cuánto tiempo pasó entre un cuadro y otro.
let ultimo = performance.now();
// se ejecuta en cada cuadro de la pantalla, unas sesenta veces por segundo. el paso de tiempo se limita a
// 50 milisegundos para que nada salte si la pestaña estuvo oculta.
function bucle(ahora) {
  const dt = Math.max(0, Math.min(0.05, (ahora - ultimo) / 1000)); ultimo = Math.max(ultimo, ahora); // el tiempo nunca va hacia atrás
  if (dia) {
    let dx = 0, dy = 0, vel = VEL;
    if (anim) {
      // durante un viaje no hay control: solo se anima. en el modo agente, solo si no está en pausa
      if (modo !== "agente" || agenteCorriendo) actualizarViaje(dt);
    } else if (modo === "jugar" && !panelAbierto) {
      dx = (teclas.d || teclas.arrowright ? 1 : 0) - (teclas.a || teclas.arrowleft ? 1 : 0);
      dy = (teclas.s || teclas.arrowdown ? 1 : 0) - (teclas.w || teclas.arrowup ? 1 : 0);
      if (objetivo && !dx && !dy) { const ax = objetivo.x - cam.x, ay = objetivo.y - cam.y; if (Math.hypot(ax, ay) > 4) { dx = ax; dy = ay; } }
    } else if (modo === "agente" && agenteCorriendo && rutaAgente.length && !panelAbierto) {
      // el agente sigue sus puntos de paso con la misma animación
      vel = VEL * velocidad();
      const p = rutaAgente[0], ax = p.x - cam.x, ay = p.y - cam.y, d = Math.hypot(ax, ay);
      if (d < Math.max(2, vel * dt)) { cam.x = p.x; cam.y = p.y; rutaAgente.shift(); if (!rutaAgente.length) entrarParada(); }
      else { dx = ax; dy = ay; }
    }
    if (!anim) moverCamila(dx, dy, dt, vel);
    // botón de entrar: aparece junto a una puerta y dice si esa parada ya toca o todavía no
    if (modo === "jugar" && !panelAbierto && !anim && !est.terminado) {
      const L = puertaCercana();
      $("go").hidden = !L;
      if (L) {
        const toca = L.id === dia.paradas[siguiente].lugar;
        $("go").className = toca ? "" : "no-toca";
        $("go").textContent = toca ? `Entrar: ${dia.paradas[siguiente].nombre} (E)` : `${NOMBRE_LUGAR[L.id]} · todavía no toca`;
      }
    } else $("go").hidden = true;
    const marca = !anim && !est.terminado && siguiente < dia.paradas.length ? LUGAR[dia.paradas[siguiente].lugar] : null;
    const veh = anim && anim.veh;
    dibujarEscena(ahora, marca, est.clima, est.hora, veh, anim && anim.fase === "viaje" ? veh : null);
    actualizarNube(ahora);
  }
  requestAnimationFrame(bucle);
}

// arranque: se ejecuta una sola vez al cargar la página, después de todos los demás archivos.
(async function arrancar() {
  $("selAgente").innerHTML = Object.entries(AGENTES).map(([k, a]) => `<option value="${k}">${a.nombre}</option>`).join("");
  $("selAgente").value = "utilidad";
  $("selAyuda").innerHTML = $("selAgente").innerHTML;
  $("selAyuda").value = "utilidad";
  crearSliders();
  $("vistaComparar").hidden = true;
  await BD.iniciar();
  $("avisoBD").textContent = BD.modo === "sqlite" ? "Base de datos: SQLite (sql.js)" : "⚠ Modo respaldo: base de datos en memoria";
  $("avisoBD").className = "aviso-bd " + (BD.modo === "sqlite" ? "ok" : "respaldo");
  CATALOGO = BD.leerCatalogo();
  PENSAMIENTOS = BD.leerPensamientos();
  llenarSelectorDia();
  iniciarPeriodo();
  requestAnimationFrame(bucle);
  abrirInicio();   // la persona elige presupuesto, duración y semilla base antes de empezar
})();
