// archivo: corridas.js, carpeta simulador.
// qué hace: hace vivir a un agente días y periodos completos sin dibujar nada, para poder comparar agentes
// rápido. aquí está el ciclo de cada agente: percibir, decidir y actuar en cada evento de cada parada.
// se relaciona con: motor.js, que arma cada día y aplica las decisiones, con los archivos de agentes, que
// deciden, con comparacion.js y metricas.js del simulador, y con la interfaz, que usa estas funciones para
// los días que se resuelven por detrás y para el botón de resolver el día rápido.
// responsable: yasmin akemi haji taira.
"use strict";

// objeto del simulador. comparacion.js le agrega las funciones del experimento.
const Simulador = {
  // resuelve con un agente lo que queda del día desde el estado actual. sirve para un día completo y
  // también para resolver el día rápido a mitad de camino. los gastos fijos se pagan solos.
  // en cada evento el agente percibe, decide y actúa, en ese orden.
  resolverResto(agente, dia, est) {
    const atender = () => {
      let ev;
      while ((ev = Motor.siguienteEvento(dia, est))) {
        const p = ev.tipo === "fijo" ? null : agente.percibir(dia, est, ev);
        this.actuarConReintento(agente, dia, est, ev, p, ev.tipo === "fijo" ? { acepta: true } : agente.decidir(p));
      }
    };
    atender();
    for (let i = est.paso + 1; i < dia.paradas.length; i++) {
      Motor.llegar(dia, est, i);
      Motor.marcarPuntualidad(dia, est);
      atender();
    }
    return Motor.cerrarDia(dia, est);
  },

  // el agente actúa. si el resultado es sin fondos, o la opción no está disponible, no se aplicó nada y debe
  // elegir otra cosa: en un evento, rechazar, y en el paradero, otra opción de transporte, descartando las
  // que ya intentó.
  actuarConReintento(agente, dia, est, ev, p, d) {
    let r = agente.actuar(dia, est, ev, d);
    if (ev.tipo !== "transporte") {
      if (r.resultado === "sin_fondos" && !r.aplicado) r = agente.actuar(dia, est, ev, { acepta: false });
      return r;
    }
    const descartadas = [];
    for (let k = 0; !r.aplicado && k < 3; k++) {
      descartadas.push(d.opcion);
      const p2 = { ...p, saldo: est.saldo, opciones: Motor.opcionesViaje(dia, est, ev).map(o => (descartadas.includes(o.modo) ? { ...o, descartada: true } : o)) };
      d = agente.decidir(p2);
      r = agente.actuar(dia, est, ev, d);
    }
    if (!r.aplicado) {   // red de seguridad: la opción disponible más barata que alcance, o caminar
      const o = Motor.opcionesViaje(dia, est, ev).filter(x => x.disponible && x.alcanza).sort((a, b) => a.costo - b.costo)[0];
      r = Motor.elegirViaje(dia, est, ev, o.modo);
    }
    return r;
  },

  // simula un día suelto con un agente y un saldo dado.
  correrDia(agente, semilla, catalogo, saldo = 30) {
    const dia = Motor.nuevoDia(semilla, catalogo);
    return this.resolverResto(agente, dia, Motor.estadoInicial(dia, saldo));
  },

  // simula un periodo completo con un agente: un día tras otro hasta el final o hasta el quiebre.
  // la función al día es opcional y recibe cada día con su resultado, sirve para pruebas y para guardar el historial.
  correrPeriodo(agente, presupuesto, duracion, semillaBase, catalogo, alDia) {
    const per = Motor.nuevoPeriodo(presupuesto, duracion, semillaBase);
    for (let n = 1; !per.terminado; n++) {
      const dia = Motor.diaDelPeriodo(per, n, catalogo);   // calendario completo, antes de decidir
      const r = this.resolverResto(agente, dia, Motor.estadoInicial(dia, per.saldo, { numero: n, duracion }));
      Motor.registrarDia(per, r);
      if (alDia) alDia(dia, r);
    }
    return { per, resumen: Motor.cerrarPeriodo(per) };
  },
};
