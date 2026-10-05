// archivo: eleccion.js, carpeta transporte.
// qué hace: agrega al motor las funciones de la elección de transporte en los paraderos: qué fila aplica
// hoy, qué opciones ve camila, cuánto cuesta lo mínimo y qué pasa cuando elige una opción.
// se relaciona con: motor.js, porque estas funciones se agregan al objeto del motor, con opciones.js, que
// da las filas de bus, mototaxi y taxi, con los agentes, que eligen una opción, y con paneles.js de la
// interfaz, que dibuja las tarjetas del paradero.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// las funciones se copian dentro del objeto del motor, así se siguen llamando igual que antes de separar
// el código en archivos. dentro de ellas, this sigue siendo el motor.
Object.assign(Motor, {
  // elección de transporte en los paraderos.
  // fila de transporte que aplica hoy para un tramo y un modo: la primera cuya condición se cumple.
  filaTransporte(dia, tramo, modo) {
    return dia.catalogo.transporte.find(t => t.tramo === tramo && t.modo === modo && this.cumple(t.condicion, dia.cond));
  },

  // opciones que ve camila en el paradero: bus, mototaxi y taxi ordenados del más barato al más caro, con
  // costo, minutos, nota, si están disponibles, por ejemplo con paro no hay bus, y si le alcanzan.
  // caminar aparece solo cuando no le alcanza para ninguna opción disponible.
  opcionesViaje(dia, est, ev) {
    const ops = MEDIOS.map(m => {
      const t = this.filaTransporte(dia, ev.tramo, m);
      return { ...t, disponible: !!t.disponible, alcanza: t.costo <= est.saldo + 1e-9 };
    }).sort((a, b) => a.costo - b.costo);
    if (!ops.some(o => o.disponible && o.alcanza)) ops.push({ ...this.filaTransporte(dia, ev.tramo, "caminar"), disponible: true, alcanza: true });
    return ops;
  },

  // lo mínimo que cuesta resolver un tramo hoy: la opción disponible más barata. sirve para reservar dinero
  // y para la parte fija de la referencia de gasto del día.
  costoMinimoViaje(dia, tramo) {
    const disp = MEDIOS.map(m => this.filaTransporte(dia, tramo, m)).filter(t => t.disponible).map(t => t.costo);
    return disp.length ? Math.min(...disp) : 0;
  },

  // aplica la elección de transporte. hay tres resultados: aceptado, que cobra, aplica los efectos y crea el
  // objeto de viaje que anima el mapa, sin fondos, cuando no le alcanza y no se aplica nada, y no disponible,
  // por ejemplo el bus en un día de paro.
  // quiebre: en el regreso, si ni siquiera le alcanza para el pasaje del bus, el periodo termina ese día.
  elegirViaje(dia, est, ev, modo) {
    const o = this.opcionesViaje(dia, est, ev).find(x => x.modo === modo);
    if (!o || !o.disponible) return { resultado: "no_disponible", aplicado: false, mensaje: o ? o.nota : "Esa opción solo aparece cuando no alcanza para el bus ni el taxi." };
    if (!o.alcanza) {
      const mensaje = `No te alcanza: tienes S/ ${est.saldo.toFixed(2)} y el ${o.nombre.toLowerCase()} cuesta S/ ${o.costo.toFixed(2)}.`;
      est.sinFondos++;
      est.log.push({ parada: ev.parada, id: ev.id, titulo: o.nombre, tipo: "transporte", costo: o.costo, acepta: false, resultado: "sin_fondos", saldo: est.saldo, texto: mensaje });
      return { resultado: "sin_fondos", aplicado: false, mensaje };
    }
    if (ev.tramo === "vuelta" && est.saldo + 1e-9 < this.filaTransporte(dia, "vuelta", "bus").costo) est.quiebre = true;
    const e = o.efecto;
    est.saldo = redondear(est.saldo - o.costo);
    // la seguridad del viaje también cuenta en el bienestar, y por lo tanto en el puntaje
    est.bienestar += (e.bienestar || 0) + dia.catalogo.parametros.peso_seguridad * (e.seguridad || 0);
    est.energia = limitar(est.energia + (e.energia || 0), 0, 10);
    est.retraso += e.minutos || 0;
    est.tramos[ev.tramo] = true;
    if (ev.tramo === "vuelta") est.volvio = !e.sin_transporte;
    const viaje = est.viajes[ev.tramo] = {
      tramo: ev.tramo, modo: o.modo, vehiculo: o.modo === "caminar" ? null : o.modo, nombre: o.modo === "caminar" ? "A pie" : o.nombre,
      origen: ev.parada, destino: ev.tramo === "ida" ? "puerta" : "casa_fin", costo: o.costo, duracion: o.minutos,
    };
    const texto = o.modo === "caminar" ? "Fue caminando." : `Eligió ${o.nombre.toLowerCase()} (${o.minutos} min).`;
    est.log.push({ parada: ev.parada, id: ev.id, titulo: "Transporte: " + o.nombre, tipo: "transporte", costo: o.costo, acepta: true, resultado: "aceptado", saldo: est.saldo, texto });
    return { resultado: "aceptado", aplicado: true, acepta: true, texto, viaje };
  },
});
