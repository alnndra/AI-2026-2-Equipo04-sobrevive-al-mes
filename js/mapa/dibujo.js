// archivo: dibujo.js, carpeta mapa.
// qué hace: prepara el lienzo de la página y la posición de la cámara, y dibuja el suelo, los edificios con
// su sombra, los adornos y los postes con cables.
// se relaciona con: suelo.js, que arma el suelo, con mundo.js y decoracion.js, que dicen qué dibujar y
// dónde, con escena.js, que mueve la cámara y llama a estas funciones en orden, y con controles.js de la
// interfaz, que usa el lienzo para el ratón y el dedo.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// lienzo de la página donde se dibuja el mapa y su contexto de dibujo. sin suavizado, para que los píxeles se vean nítidos.
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
// cámara: esquina de arriba a la izquierda del pedazo del mundo que se ve en pantalla.
let camX = 0, camY = 0;

// copia en pantalla el pedazo del suelo que ve la cámara. si las imágenes todavía no cargan, pinta un
// fondo verde, y apenas cargan todas arma el suelo una sola vez.
function dibujarSuelo() {
  if (!SUELO && Object.values(TILE).every(i => i.complete && i.naturalWidth)) construirSuelo();
  if (SUELO) ctx.drawImage(SUELO, camX, camY, VW, VH, 0, 0, VW, VH);
  else { ctx.fillStyle = "#3f7d3a"; ctx.fillRect(0, 0, VW, VH); }
}

// dibuja un edificio con una sombra suave en la base. si está fuera de la cámara no dibuja nada.
function dibujarEdificio(L) {
  const X = L.x - camX, Y = L.y - camY;
  if (X > VW || X + L.w < 0 || Y > VH || Y + L.h < 0) return;
  ctx.fillStyle = "rgba(10,25,15,.22)";
  ctx.beginPath(); ctx.ellipse(X + L.w / 2, L.base - camY + 4, L.w / 2, 7, 0, 0, 7); ctx.fill();
  ctx.drawImage(IMG[L.img].img, X, Y);
}

// dibuja un adorno apoyado en su punto de base. los árboles y la fuente llevan sombra.
function dibujarSprite(k, x, y) {
  const s = SPR[k];
  const X = Math.round(x - s.width / 2 - camX), Y = Math.round(y - s.height - camY);
  if (X > VW || X + s.width < 0 || Y > VH || Y + s.height < 0) return;
  if (k === "arbol" || k === "fuente") { ctx.fillStyle = "rgba(10,25,15,.25)"; ctx.beginPath(); ctx.ellipse(X + s.width / 2, Y + s.height - 2, s.width / 2.4, 5, 0, 0, 7); ctx.fill(); }
  ctx.drawImage(s, X, Y);
}

// dibuja un poste de concreto con travesaño y cables curvos hacia el siguiente poste de la misma calle.
function dibujarPoste(q, i, fila) {
  const x = q[0] - camX, y = q[1] - camY;
  if (x < -300 || x > VW + 300 || y < -100 || y > VH + 120) return;
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(x - 6, y - 2, 13, 4);
  ctx.fillStyle = "#9aa3ae"; ctx.fillRect(x - 3, y - 78, 6, 78);
  ctx.fillStyle = "#7b8491"; ctx.fillRect(x + 1, y - 78, 2, 78);
  ctx.fillStyle = "#5b6470"; ctx.fillRect(x - 12, y - 72, 24, 3);
  ctx.fillStyle = "#3f4752"; ctx.fillRect(x + 4, y - 64, 7, 9);  // caja del transformador
  const n = fila[i + 1];
  if (n) {
    ctx.strokeStyle = "#1c2028"; ctx.lineWidth = 1;
    for (const [dy, caida] of [[-71, 16], [-69, 22]]) {
      ctx.beginPath(); ctx.moveTo(x - 10, y + dy);
      ctx.quadraticCurveTo((x + n[0] - camX) / 2, y + dy + caida, n[0] - camX - 10, n[1] - camY + dy); ctx.stroke();
    }
  }
}
