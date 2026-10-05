// archivo: personaje.js, carpeta mapa.
// qué hace: guarda dónde está camila y la dibuja caminando con su sombra. también dibuja el marcador que
// flota sobre la siguiente parada y los efectos del día: la lluvia y el cielo que oscurece de noche, con
// las ventanas encendidas.
// se relaciona con: mundo.js, de donde toma la casa, la hoja de camila y las imágenes de luces, con
// movimiento.js, que la mueve, con animacion viaje.js, que la encoge al subir a un vehículo, y con escena.js,
// que llama a estas funciones en cada cuadro.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// camila en el mapa: posición, dirección, tiempo de animación, si se mueve y su escala.
// la hoja tiene 4 cuadros de caminata por fila: la fila 0 es de frente, la 1 de espalda y la 2 de perfil
// derecho, que se voltea como en un espejo para la izquierda.
const cam = { x: LUGAR.casa.sx, y: LUGAR.casa.base + 16, dir: "down", t: 0, mov: false, escala: 1 };
// la escala vale 1 cuando camila se ve normal, entre 0 y 1 se encoge y se desvanece al subir o bajar de un
// vehículo, y en 0 va adentro y no se dibuja.
// dibuja a camila con el cuadro de animación que le toca, su sombra y un pequeño rebote al caminar.
function dibujarCamila() {
  const e = cam.escala;
  if (e <= 0) return;
  const fila = { down: 0, up: 1, right: 2, left: 2 }[cam.dir];
  const f = Math.floor(cam.t) % 4, rebote = cam.mov && f % 2 ? -1 : 0;
  const W = IMAGENES.camila.w, Hh = IMAGENES.camila.h, dw = Math.round(W * e), dh = Math.round(Hh * e);
  const px = Math.round(cam.x - camX - dw / 2), py = Math.round(cam.y - camY - dh) + rebote;
  ctx.globalAlpha = e;
  ctx.fillStyle = "rgba(10,20,15,.32)";
  ctx.beginPath(); ctx.ellipse(cam.x - camX, cam.y - camY, 10 * e, 3.5 * e, 0, 0, 7); ctx.fill();
  if (cam.dir === "left") {
    ctx.save(); ctx.translate(px + dw, 0); ctx.scale(-1, 1);
    ctx.drawImage(HOJA, f * W, fila * Hh, W, Hh, 0, py, dw, dh); ctx.restore();
  } else ctx.drawImage(HOJA, f * W, fila * Hh, W, Hh, px, py, dw, dh);
  ctx.globalAlpha = 1;
}

// dibuja el marcador que flota sobre la puerta de la siguiente parada, para que la persona sepa adónde ir.
function dibujarMarcador(L, t) {
  if (!L) return;
  const x = L.sx - camX, y = L.base - camY - 6 + Math.sin(t / 250) * 3;
  ctx.fillStyle = "rgba(45,212,191,.25)";
  ctx.beginPath(); ctx.ellipse(L.sx - camX, L.base - camY + 14, 16, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#2dd4bf"; ctx.strokeStyle = "#06201c"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y - 12); ctx.lineTo(x + 8, y - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// lluvia simple: líneas inclinadas que caen. sus posiciones salen de la mezcla fija y se desplazan con el
// tiempo, así no se usa ningún azar.
function dibujarLluvia(t) {
  ctx.fillStyle = "rgba(40,60,95,.18)"; ctx.fillRect(0, 0, VW, VH);
  ctx.strokeStyle = "rgba(215,230,255,.75)"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 160; i++) {
    const x = (H(i, 7) * 0.8 + t * 0.05 * (1 + (i % 3) * 0.2)) % VW;
    const y = (H(i, 9) * 0.5 + t * 0.6 * (1 + (i % 4) * 0.15)) % VH;
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13);
  }
  ctx.stroke();
}

// oscurece la escena al atardecer y de noche según la hora del motor, con una capa azulada.
// de noche también se encienden las luces de las ventanas de cada edificio.
function dibujarCielo(minutos) {
  const a = minutos >= 1140 ? 0.38 : minutos >= 1050 ? 0.2 * (minutos - 1050) / 90 + 0.05 : 0;
  if (a <= 0) return;
  ctx.fillStyle = `rgba(12,18,48,${a})`; ctx.fillRect(0, 0, VW, VH);
  ctx.globalAlpha = Math.min(1, a / 0.3);
  for (const L of LUGARES) {
    const X = L.x - camX, Y = L.y - camY;
    if (X < VW && X + L.w > 0 && Y < VH && Y + L.h > 0) ctx.drawImage(IMG[L.img].luz, X, Y);
  }
  ctx.globalAlpha = 1;
}
