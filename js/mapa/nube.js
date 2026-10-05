// archivo: nube.js, carpeta mapa.
// qué hace: dibuja la nube de pensamiento sobre la cabeza de camila, con su texto en una o dos líneas.
// qué pensamiento se muestra lo decide pensamientos.js, este archivo solo lo dibuja.
// se relaciona con: pensamientos.js, que elige el texto y cuándo se ve, con personaje.js, de donde toma la
// posición de camila, y con dibujo.js, que da el lienzo.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// nube de pensamiento.
// corta el texto en líneas que entren en el ancho máximo, con dos líneas como máximo. si sobra texto,
// termina la segunda línea con puntos suspensivos.
function lineasNube(texto, max) {
  const palabras = texto.split(" "), lineas = [""];
  for (const w of palabras) {
    const prueba = lineas[lineas.length - 1] ? lineas[lineas.length - 1] + " " + w : w;
    if (ctx.measureText(prueba).width <= max || !lineas[lineas.length - 1]) lineas[lineas.length - 1] = prueba;
    else lineas.push(w);
  }
  if (lineas.length > 2) { lineas.length = 2; lineas[1] = lineas[1].replace(/\s*\S*$/, "") + "…"; }
  return lineas;
}

// dibuja una nube de pensamiento sobre la cabeza de camila: cuerpo hecho de círculos, una cola de tres
// burbujas que baja hacia su cabeza y el texto. siempre queda dentro de los bordes del lienzo.
// la transparencia permite que aparezca y desaparezca suave.
function dibujarNube(texto, alfa) {
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.font = "600 12px system-ui, sans-serif";
  const lineas = lineasNube(texto, 150);
  const ancho = Math.max(...lineas.map(l => ctx.measureText(l).width)) + 22, alto = lineas.length * 15 + 14;
  const cabezaX = cam.x - camX, cabezaY = cam.y - camY - IMAGENES.camila.h - 2;
  const x = limitar(cabezaX - ancho / 2, 6, VW - ancho - 6), y = limitar(cabezaY - alto - 22, 6, VH - alto - 6);
  // cuerpo: rectángulo con círculos en el borde para que parezca nube
  ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.strokeStyle = "#2a3140"; ctx.lineWidth = 1.5;
  const circulos = [];
  for (let cx = x + 10; cx <= x + ancho - 10; cx += 16) circulos.push([cx, y + 3, 9], [cx, y + alto - 3, 9]);
  circulos.push([x + 3, y + alto / 2, 10], [x + ancho - 3, y + alto / 2, 10]);
  ctx.beginPath(); circulos.forEach(([cx, cy, r]) => { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 7); }); ctx.stroke();
  ctx.beginPath(); circulos.forEach(([cx, cy, r]) => { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 7); });
  ctx.rect(x, y, ancho, alto); ctx.fill();
  // cola: tres burbujas que bajan hacia la cabeza
  const bx = limitar(cabezaX, x + 12, x + ancho - 12);
  [[0.25, 5], [0.55, 3.5], [0.82, 2.2]].forEach(([t, r]) => {
    const px = bx + (cabezaX - bx) * t, py = y + alto + 6 + (cabezaY - (y + alto + 6)) * t;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "#1f2937"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  lineas.forEach((l, i) => ctx.fillText(l, x + ancho / 2, y + 7 + i * 15));
  ctx.restore();
}
