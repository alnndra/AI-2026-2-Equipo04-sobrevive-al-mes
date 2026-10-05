// archivo: animacion viaje.js, carpeta mapa.
// qué hace: anima el viaje que el motor ya decidió. el motor entrega un objeto de viaje con el modo, el
// origen, el destino, el costo y la duración, y aquí solo se anima, sin cambiar ningún resultado.
// los vehículos van solo por la pista. las fases en un vehículo son: acercarse, camila camina por las calles
// hasta la vereda del punto de acceso. llega, el vehículo frena en la pista junto al cruce. subir, camila se
// encoge y desaparece. viaje, la cámara sigue al vehículo. bajar, camila reaparece en la vereda del acceso de
// destino. salir, camina hasta la puerta mientras el vehículo se va. a pie solo hay una fase: caminar.
// este archivo está en la carpeta mapa pero se carga entre los archivos de la interfaz, en el mismo lugar
// donde estaba en el código original.
// se relaciona con: eleccion.js de transporte, que crea el objeto de viaje, con vehiculos.js, caminos.js y
// movimiento.js, que mueven al vehículo y a camila, y con paneles.js y principal.js de la interfaz, que
// empiezan el viaje y lo actualizan en cada cuadro.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// lado hacia donde mira camila cuando espera en un acceso: siempre hacia la pista.
const MIRA_PISTA = { izq: "left", der: "right", arriba: "up", abajo: "down" };
// empieza la animación de un viaje. a pie arma la ruta hasta el destino. en vehículo elige dónde sube y
// dónde baja y crea el vehículo. al terminar llama a la función que se le pasó.
function iniciarViaje(viaje, alTerminar) {
  cerrarPanel(); objetivo = null; teclas = {};
  if (viaje.modo === "caminar") {
    const destino = LUGAR[dia.paradas.find(q => q.id === viaje.destino).lugar];
    anim = { viaje, fase: "caminar", ruta: rutaHacia(destino), alTerminar };
    aviso(viaje.tramo === "vuelta" ? `Sin pasaje: Camila camina de noche a su casa (${viaje.duracion} min).` : `Camila va a pie a la universidad (${viaje.duracion} min).`);
  } else {
    // sube en el acceso más cercano a donde está camila, el bus en el más cercano al paradero oficial, y baja
    // en el acceso con la caminata más corta hasta la puerta de destino.
    const p = PUNTOS_VIAJE[viaje.tramo];
    const desde = viaje.vehiculo === "bus" ? puertaDe(LUGAR[p.sube]) : { x: cam.x, y: cam.y };
    const sube = mejorAcceso(desde).a, baja = mejorAcceso(puertaDe(LUGAR[p.baja]), sube).a;
    anim = { viaje, fase: "acercarse", sube, baja, ruta: caminoPeatonal({ x: cam.x, y: cam.y }, sube.vereda).ruta,
      veh: crearVehiculo(viaje.vehiculo, sube, baja), alTerminar };
    aviso(`${viaje.nombre} · ${viaje.duracion} min${viaje.costo ? " · " + S(viaje.costo) : ""}`);
  }
}

// avanza la animación del viaje un cuadro, según la fase en que está. en el modo agente respeta la velocidad elegida.
function actualizarViaje(dt) {
  const a = anim, mult = modo === "agente" ? velocidad() : 1, vel = VEL * mult;
  switch (a.fase) {
    case "caminar":   // a pie: un poco más rápido para que la escena no se haga larga
      if (seguirRuta(a.ruta, dt, vel * 1.8)) terminarViaje();
      break;
    case "acercarse":
      if (seguirRuta(a.ruta, dt, vel)) { cam.dir = MIRA_PISTA[a.sube.lado]; a.fase = "llega"; }   // al llegar mira hacia la pista
      break;
    case "llega":
      moverCamila(0, 0, dt, vel);
      if (moverVehiculo(a.veh, dt, mult) === "subir") a.fase = "subir";
      break;
    case "subir":     // se encoge y desaparece en la vereda, sin pisar la pista
      cam.escala = Math.max(0, cam.escala - 2.5 * mult * dt);
      if (cam.escala === 0) { a.veh.lleno = true; a.veh.parado = false; a.fase = "viaje"; }
      break;
    case "viaje":
      if (moverVehiculo(a.veh, dt, mult) === "bajar") {
        cam.x = a.baja.vereda.x; cam.y = a.baja.vereda.y; cam.dir = MIRA_PISTA[a.baja.lado];   // reaparece en la vereda del acceso
        a.veh.lleno = false; a.fase = "bajar";
      }
      break;
    case "bajar":     // reaparece en la vereda y arma su camino a pie hasta la puerta
      cam.escala = Math.min(1, cam.escala + 2.5 * mult * dt);
      if (cam.escala === 1) {
        a.veh.parado = false; a.fase = "salir";
        a.ruta = caminoPeatonal({ x: cam.x, y: cam.y }, puertaDe(LUGAR[PUNTOS_VIAJE[a.viaje.tramo].baja])).ruta;
      }
      break;
    case "salir": {   // camila camina por las calles hasta la puerta mientras el vehículo sigue y se va
      const lista = seguirRuta(a.ruta, dt, vel);
      if (a.veh && moverVehiculo(a.veh, dt, mult) === "fin") a.veh = null;
      if (lista && !a.veh) terminarViaje();
      break;
    }
  }
}

// fin de la animación: camila vuelve a estar a la vista y el juego sigue.
function terminarViaje() {
  const fin = anim.alTerminar;
  anim = null; cam.escala = 1;
  if (fin) fin();
}
