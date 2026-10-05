// archivo: movimiento.js, carpeta mapa.
// qué hace: mueve a camila por las zonas caminables, encuentra la puerta cercana y la hace seguir una
// ruta de puntos de paso, por ejemplo el camino más corto hasta la siguiente parada.
// se relaciona con: mundo.js, que dice dónde se puede caminar, con caminos.js, que calcula las rutas, con
// personaje.js, que guarda dónde está camila, y con controles.js y animacion viaje.js, que la hacen moverse.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// mueve a camila en una dirección. prueba cada eje por separado: si un eje choca con el borde de la
// zona caminable, igual avanza por el otro, así se desliza por los bordes en vez de quedarse trabada.
function moverCamila(dx, dy, dt, vel) {
  cam.mov = !!(dx || dy);
  if (!cam.mov) { cam.t = 0; return; }
  const m = Math.hypot(dx, dy); dx /= m; dy /= m;
  const nx = cam.x + dx * vel * dt, ny = cam.y + dy * vel * dt;
  if (caminable(nx, cam.y)) cam.x = nx;
  if (caminable(cam.x, ny)) cam.y = ny;
  cam.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  cam.t += dt * 8 * Math.min(2, vel / VEL);
}

// edificio cuya puerta está cerca de camila: unos 30 píxeles en horizontal y dentro de la calle.
function puertaCercana() {
  return LUGARES.find(L => Math.abs(cam.x - L.sx) < 30 && cam.y > L.base && cam.y < L.base + 70) || null;
}

// punto de la puerta de un edificio, donde camila se para para entrar.
const puertaDe = L => ({ x: L.sx, y: L.base + 16 });
// ruta a pie desde donde está camila hasta la puerta de un edificio, por el camino más corto.
const rutaHacia = destino => caminoPeatonal({ x: cam.x, y: cam.y }, puertaDe(destino)).ruta;

// camila sigue una lista de puntos de paso: camina hacia el primero y lo quita al llegar.
// devuelve verdadero cuando llegó al último.
function seguirRuta(ruta, dt, vel) {
  if (!ruta.length) { moverCamila(0, 0, dt, vel); return true; }
  const p = ruta[0], ax = p.x - cam.x, ay = p.y - cam.y, d = Math.hypot(ax, ay);
  if (d < Math.max(2, vel * dt)) { cam.x = p.x; cam.y = p.y; ruta.shift(); return !ruta.length; }
  moverCamila(ax, ay, dt, vel);
  return false;
}
