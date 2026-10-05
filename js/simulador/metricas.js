// archivo: metricas.js, carpeta simulador.
// qué hace: calcula la métrica de un periodo completo: el puntaje total, el bienestar promedio por día
// vivido, si llegó al final, el día de quiebre, el saldo final y cuántos viajes hizo en cada medio.
// se relaciona con: motor.js, porque esta función se agrega al objeto del motor y usa sus reglas, con
// corridas.js y comparacion.js, que la llaman al terminar cada periodo, y con la interfaz, que muestra el resumen.
// responsable: yasmin akemi haji taira.
"use strict";

// la función se agrega al objeto del motor, así se sigue llamando igual que antes de separar el código.
Object.assign(Motor, {
  // métrica del periodo: puntaje total, que es la suma de los puntajes diarios más un bono si llegó al último
  // día o menos una penalización si quebró, mayor cuanto antes quebró. también el bienestar promedio por día
  // vivido, para no confundir vivir más días con vivir mejor. usamos varias medidas porque si solo
  // midiéramos el saldo, ganaría el agente que nunca gasta, aunque pase hambre y llegue tarde.
  cerrarPeriodo(per) {
    const vividos = per.dias.length;
    const bienestarTotal = per.dias.reduce((s, d) => s + d.bienestar, 0);
    const sumaDiaria = per.dias.reduce((s, d) => s + d.puntaje, 0);
    const llego = !per.diaQuiebre && vividos === per.duracion;
    const penal = per.diaQuiebre ? REGLAS.penalQuiebre + REGLAS.penalPorDiaPerdido * (per.duracion - per.diaQuiebre) : 0;
    return {
      presupuesto: per.presupuesto, duracion: per.duracion, semillaBase: per.semillaBase, diasVividos: vividos, llego,
      diaQuiebre: per.diaQuiebre, saldoFinal: redondear(per.saldo), bienestarTotal: redondear(bienestarTotal),
      bienestarProm: redondear(vividos ? bienestarTotal / vividos : 0),
      viajes: per.dias.reduce((c, d) => { for (const [m, k] of Object.entries(d.viajes || {})) c[m] = (c[m] || 0) + k; return c; }, {}),
      sinFondos: per.dias.reduce((s, d) => s + (d.sinFondos || 0), 0),
      puntaje: redondear(sumaDiaria + (llego ? REGLAS.bonoLlegada : 0) - penal),
    };
  },
});
