// archivo: comparacion.js, carpeta simulador.
// qué hace: corre el experimento del modo comparar: cada agente vive muchos periodos con las mismas
// semillas, en tres niveles de presupuesto, y cada periodo se guarda en la base de datos con su historial.
// se relaciona con: corridas.js, que hace vivir cada periodo, con metricas.js, que calcula el puntaje del
// periodo, con base de datos.js, donde se guardan los resultados, y con tabla experimento.js de la
// interfaz, que muestra la tabla comparativa.
// responsable: yasmin akemi haji taira.
"use strict";

// niveles de presupuesto del experimento: múltiplos del gasto fijo diario esperado. si se cambia un factor,
// cambia el presupuesto de ese nivel y con él qué agente gana.
const NIVELES = [["ajustado", 1.5], ["medio", 2.5], ["holgado", 5]];

// estas funciones se agregan al objeto del simulador, así se siguen llamando igual que antes.
Object.assign(Simulador, {
  // presupuesto de cada nivel del experimento: el gasto fijo diario esperado por los días por el factor del nivel.
  presupuestoNivel(factor, duracion, catalogo) {
    return Math.round(Motor.gastoFijoDiario(catalogo).esperado * duracion * factor);
  },

  // corre n periodos por agente en un nivel de presupuesto, con semillas base consecutivas y sin gráficos,
  // y guarda cada periodo, su historial diario y las condiciones de cada día en la base de datos.
  // todos los agentes usan las mismas semillas, así viven exactamente los mismos días.
  // mide el tiempo promedio por corrida, sin contar el tiempo de guardar en la base de datos.
  compararNivel(lote, nivel, factor, n, semillaBase, duracion, catalogo, bd) {
    const presupuesto = this.presupuestoNivel(factor, duracion, catalogo);
    const corridas = {};
    for (const agente of Object.values(AGENTES)) {
      const t0 = performance.now();
      corridas[agente.nombre] = [];
      for (let r = 0; r < n; r++) corridas[agente.nombre].push(this.correrPeriodo(agente, presupuesto, duracion, semillaBase + r, catalogo));
      corridas[agente.nombre].ms = (performance.now() - t0) / n;   // tiempo por corrida en milisegundos
    }
    if (bd) bd.transaccion(() => {
      Object.values(AGENTES).forEach((agente, i) => corridas[agente.nombre].forEach(({ per, resumen }) => {
        // las condiciones de cada día son las mismas para todos los agentes: se guardan una vez
        const cond = i ? null : Array.from({ length: duracion }, (_, d) => ({ ...this.condiciones(Motor.semillaDelDia(per.semillaBase, d + 1), catalogo),
          semilla_base: per.semillaBase, dia: d + 1, presupuesto, duracion }));
        bd.guardarPeriodo(lote, agente.nombre, nivel, resumen, per.dias, corridas[agente.nombre].ms, null, cond);
      }));
    });
    return { presupuesto, corridas };
  },

  // experimento completo con los tres niveles seguidos. devuelve el nombre del lote para leer la tabla.
  comparar(n, semillaBase, duracion, catalogo, bd) {
    const lote = `exp-${semillaBase}-${duracion}-${n}`;
    for (const [nivel, factor] of NIVELES) this.compararNivel(lote, nivel, factor, n, semillaBase, duracion, catalogo, bd);
    return lote;
  },

  // condiciones del día de una semilla, las mismas que usa el motor, para guardarlas en la base de datos.
  condiciones(semilla, catalogo) { return Motor.nuevoDia(semilla, catalogo).cond; },
});
