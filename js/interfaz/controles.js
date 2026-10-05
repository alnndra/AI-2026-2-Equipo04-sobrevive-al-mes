// archivo: controles.js, carpeta interfaz.
// qué hace: conecta el teclado, el ratón y el dedo con el juego: mover a camila, entrar a una parada, cerrar
// el panel y tocar el mapa para caminar hacia un punto.
// se relaciona con: movimiento.js del mapa, que encuentra la puerta cercana, con paneles.js, que abre la
// parada, con dibujo.js, que da el lienzo y la cámara, y con principal.js, que mueve a camila en cada cuadro.
// responsable: yasmin akemi haji taira.
"use strict";

// controles con teclado y puntero.
// intenta entrar a la parada cuya puerta está cerca. solo deja entrar a la siguiente parada del recorrido.
function intentarEntrar() {
  if (modo !== "jugar" || panelAbierto || anim || !est || est.terminado) return;
  const L = puertaCercana();
  if (!L) return;
  if (L.id === dia.paradas[siguiente].lugar) entrarParada();
  else aviso(`Todavía no toca ${NOMBRE_LUGAR[L.id]}. Tu siguiente parada es ${dia.paradas[siguiente].nombre}.`);
}
// botón de entrar, botón de cerrar y teclas: escape cierra, e o enter entra, y las demás mueven a camila.
$("go").onclick = intentarEntrar;
$("x").onclick = cerrarPanel;
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (k === "escape") cerrarPanel();
  else if (k === "e" || (k === "enter" && !panelAbierto)) { if (!panelAbierto) { intentarEntrar(); e.preventDefault(); } }
  else { teclas[k] = true; if (k.startsWith("arrow") && !panelAbierto) e.preventDefault(); }
});
addEventListener("keyup", e => (teclas[e.key.toLowerCase()] = false));
addEventListener("blur", () => (teclas = {}));
// convierte la posición del puntero en la pantalla a una posición del mundo, teniendo en cuenta la cámara.
const puntoMundo = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width + camX, y: (e.clientY - r.top) * VH / r.height + camY }; };
cv.onpointerdown = e => { if (modo !== "jugar") return; objetivo = puntoMundo(e); cv.setPointerCapture(e.pointerId); };
cv.onpointermove = e => { if (e.buttons && modo === "jugar") objetivo = puntoMundo(e); };
cv.onpointerup = () => (objetivo = null);
