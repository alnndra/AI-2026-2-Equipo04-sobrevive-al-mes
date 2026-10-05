// archivo: azar.js, carpeta núcleo.
// qué hace: define el generador de números al azar con semilla que usa todo el juego.
// se relaciona con: motor.js, que lo usa para sortear el calendario de cada día, y con estado.js de la
// interfaz, que crea otro generador aparte solo para los pensamientos.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// generador mulberry32: recibe una semilla y devuelve una función que entrega un número entre 0 y 1
// cada vez que se la llama. la misma semilla siempre produce la misma secuencia de números, por eso la
// persona y todos los agentes viven exactamente el mismo día y la comparación es justa.
// no se usa el azar del navegador porque cambiaría en cada ejecución y no se podría repetir un resultado.
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    // cada llamada avanza el estado interno y lo mezcla con multiplicaciones y desplazamientos de bits
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
