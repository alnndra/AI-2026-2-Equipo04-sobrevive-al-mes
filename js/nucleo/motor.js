// archivo: motor.js, carpeta núcleo.
// qué hace: es el motor del día. arma el calendario de cada día con la semilla, guarda el estado de camila,
// aplica cada decisión con sus tres resultados posibles, calcula el puntaje del día, detecta el quiebre y
// encadena los días de un periodo. también calcula la referencia de gasto del día, que solo informa.
// no toca la pantalla ni el lienzo: por eso se pueden simular cientos de días en milisegundos.
// se relaciona con: azar.js y catalogos.js, que usa para sortear el día, con eleccion.js de transporte y
// metricas.js del simulador, que le agregan funciones, con los agentes, que le piden aplicar sus decisiones,
// y con la interfaz, que muestra lo que el motor decide.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// reglas del puntaje y del desgaste de camila. cambiar un número aquí cambia los resultados de todos los agentes.
const REGLAS = {
  bonoPuntual: 8,          // bono si llega a la primera clase a tiempo
  penalSinTransporte: 25,  // penalización fuerte si no pudo volver en transporte
  penalSaldoNegativo: 10,  // penalización si termina con deudas mayores que su saldo
  hambrePorHora: 0.5, energiaPorHora: -0.35, bateriaPorHora: -5,
  // periodo de varios días
  bonoLlegada: 20,         // bono por llegar al último día con el pasaje de regreso pagado
  penalQuiebre: 30,        // penalización por quedarse sin dinero antes del final
  penalPorDiaPerdido: 6,   // más esta penalización por cada día que ya no pudo vivir, pesa más que un día vivido mal
};

// redondea un monto a dos decimales para que los céntimos no se acumulen con errores.
const redondear = v => Math.round(v * 100) / 100;
// deja un valor dentro de un mínimo y un máximo, por ejemplo el hambre entre 0 y 10.
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// objeto del motor. todas sus funciones reciben el día y el estado, y nunca usan el azar del navegador.
const Motor = {
  // sortea las condiciones del día con el generador del día, siempre en el mismo orden: comida en casa,
  // lluvia, paro, entrega impresa, examen, carné olvidado y batería inicial.
  sortearCondiciones(semilla, rng) {
    const c = { semilla };
    for (const [clave, p] of Object.entries(PROB_CONDICIONES)) c[clave] = rng() < p ? 1 : 0;
    c.bateria_inicial = 40 + Math.floor(rng() * 61);
    return c;
  },

  // semilla de un día del periodo: mezcla la semilla base con el número de día.
  // así cada día es distinto, pero la misma semilla base con el mismo día siempre da el mismo calendario.
  semillaDelDia(base, numero) {
    return (Math.imul(base | 0, 2654435761) ^ Math.imul(numero, 1597334677)) >>> 0 || 1;
  },

  // gasto fijo diario: pasajes siempre y almuerzo los días sin comida en casa.
  // esperado es el promedio por día según la probabilidad de no tener comida, máximo es un día sin comida
  // y prudente suma además lo que en promedio llega solo, como deudas y desayuno.
  gastoFijoDiario(catalogo) {
    const monto = id => catalogo.fijos.find(f => f.id === id).monto;
    const pasajes = monto("pasaje_ida") + monto("pasaje_vuelta"), almuerzo = monto("almuerzo");
    const sinComida = 1 - PROB_CONDICIONES.comida_en_casa;
    // gasto que en promedio llega solo cada día: deudas que se pagan sí o sí, como la multa o el yapeo
    // equivocado, y el desayuno los días sin comida en casa
    const obligado = catalogo.eventos.reduce((s, e) => s + ((e.consecuencia.deuda || 0) > 0 ? e.probabilidad * e.costo
      : e.condicion === "!comida_en_casa" && e.tipo === "necesidad" && e.id !== "menu_economico" ? sinComida * e.probabilidad * e.costo : 0), 0);
    return { pasajes, almuerzo, sinComida, esperado: redondear(pasajes + sinComida * almuerzo), maximo: pasajes + almuerzo,
      prudente: redondear(pasajes + almuerzo + obligado) };
  },

  // referencia de gasto del día, solo informa: saldo con que empieza el día entre los días que faltan,
  // incluido hoy, redondeada al medio sol. la parte fija son los pasajes de ida y vuelta más baratos que
  // hay hoy y el almuerzo si no hay comida en casa. la parte libre es el resto, nunca menor que cero.
  referenciaDelDia(dia, saldo, numero, duracion) {
    const referencia = Math.round((2 * saldo) / Math.max(1, duracion - numero + 1)) / 2;
    const almuerzo = dia.cond.comida_en_casa ? 0 : dia.catalogo.fijos.find(f => f.id === "almuerzo").monto;
    const fija = redondear(this.costoMinimoViaje(dia, "ida") + this.costoMinimoViaje(dia, "vuelta") + almuerzo);
    return { referencia, fija, libre: redondear(Math.max(0, referencia - fija)) };
  },

  // cuánto de la referencia lleva gastado y en qué estado está: tranquila bajo 0.7, atención hasta 1,
  // pasada si gastó más que la referencia.
  estadoReferencia(gastado, referencia) {
    const fraccion = referencia > 0 ? gastado / referencia : gastado > 0 ? Infinity : 0;
    return { fraccion, estado: fraccion > 1 ? "pasada" : fraccion >= 0.7 ? "atencion" : "tranquila" };
  },

  // si cada día gastara lo mismo que hoy, hasta qué día le alcanza el saldo final y si llega al último día.
  proyeccionGasto(saldoFinal, gastoHoy, numero, duracion) {
    const dias = gastoHoy > 0 ? Math.floor(saldoFinal / gastoHoy + 1e-9) : Infinity;
    const hasta = Math.min(duracion, numero + dias);
    return { hasta, alcanza: hasta >= duracion, quiebra: hasta + 1 };
  },

  // dice si se cumple la condición de un evento: vacía siempre se cumple, un nombre se cumple si esa
  // condición del día está activa, y el mismo nombre negado se cumple si no lo está.
  cumple(condicion, cond) {
    if (!condicion) return true;
    return condicion[0] === "!" ? !cond[condicion.slice(1)] : !!cond[condicion];
  },

  // crea el calendario completo del día: condiciones y lista de eventos por parada.
  // todo sale de la semilla, nunca de las decisiones, por eso cualquier agente ve exactamente los mismos eventos.
  nuevoDia(semilla, catalogo) {
    const rng = mulberry32(semilla);
    const cond = this.sortearCondiciones(semilla, rng);
    const eventos = Object.fromEntries(catalogo.paradas.map(p => [p.id, []]));
    // se sortea en el orden del catálogo y no en el del recorrido: así cambiar el orden de
    // las paradas no cambia qué eventos salen con cada semilla.
    for (const ev of catalogo.eventos) {
      const r = rng(); // se sortea siempre, para que la secuencia no dependa de las condiciones
      if (!ev.activo) continue;   // evento retirado: se sorteó solo para no mover la secuencia
      if (this.cumple(ev.condicion, cond) && r < ev.probabilidad) eventos[ev.parada].push(ev);
    }
    // disponibilidad del transporte: bus lleno, sin taxi y sin mototaxi, en la ida y en la vuelta.
    // se sortea al final de la secuencia para que los eventos de antes no cambien, y antes de cualquier
    // decisión, así la misma semilla da la misma disponibilidad para todos. este sorteo se queda aquí y no en
    // la carpeta transporte, porque moverlo cambiaría el orden del generador y con él todos los resultados.
    // las probabilidades vienen de los parámetros definidos en opciones.js de transporte.
    const P = catalogo.parametros, ll = cond.lluvia ? 1 : 0, pa = cond.paro ? 1 : 0;
    const tirada = () => rng();
    const r = [tirada(), tirada(), tirada(), tirada(), tirada(), tirada()];   // siempre seis sorteos
    cond.bus_lleno_ida = r[0] < P.p_bus_lleno_ida + ll * P.p_bus_lleno_lluvia ? 1 : 0;
    cond.bus_lleno_vuelta = r[1] < P.p_bus_lleno_vuelta + ll * P.p_bus_lleno_lluvia ? 1 : 0;
    cond.taxi_no_ida = r[2] < P.p_taxi_no_ida + ll * P.p_taxi_no_lluvia + pa * P.p_taxi_no_paro ? 1 : 0;
    cond.taxi_no_vuelta = r[3] < P.p_taxi_no_vuelta + ll * P.p_taxi_no_lluvia + pa * P.p_taxi_no_paro ? 1 : 0;
    cond.moto_no_ida = r[4] < P.p_moto_no ? 1 : 0;
    cond.moto_no_vuelta = r[5] < P.p_moto_no ? 1 : 0;
    // en cada paradero se agrega la decisión de transporte: bus, mototaxi o taxi, y caminar si no alcanza para ninguno
    for (const tramo of ["ida", "vuelta"]) {
      const parada = catalogo.transporte.find(t => t.tramo === tramo).parada;
      eventos[parada].push({ id: "viaje_" + tramo, parada, tipo: "transporte", tramo, orden: 50, costo: 0, bienestar: 0,
        titulo: tramo === "ida" ? "¿Cómo vas a la universidad?" : "¿Cómo vuelves a casa?", texto: "", efecto: {}, consecuencia: {} });
    }
    for (const p of catalogo.paradas) {
      const lista = eventos[p.id];
      // los pasajes ya no son gastos fijos: los resuelve la elección de transporte, por eso se saltan los fijos con tramo
      for (const f of catalogo.fijos.filter(f => f.parada === p.id && !f.tramo && this.cumple(f.condicion, cond)))
        lista.push({ id: f.id, parada: f.parada, titulo: f.nombre, texto: "Gasto fijo obligatorio.", costo: f.monto, tipo: "fijo",
          probabilidad: 1, condicion: f.condicion, bienestar: 0, tramo: f.tramo, orden: f.orden, efecto: f.efecto, consecuencia: f.consecuencia });
      lista.sort((a, b) => a.orden - b.orden);
    }
    return { semilla, cond, paradas: catalogo.paradas, eventos, catalogo };
  },

  // estado inicial de camila para ese día. el saldo viene del día anterior o del presupuesto, y hambre,
  // energía y batería se reinician cada mañana. el periodo dice qué día es y cuántos faltan.
  estadoInicial(dia, saldo = 30, periodo = { numero: 1, duracion: 1 }) {
    const c = dia.cond;
    // la referencia se calcula una sola vez al empezar el día y no se mueve con los gastos
    const ref = this.referenciaDelDia(dia, saldo, periodo.numero, periodo.duracion);
    return {
      numero: periodo.numero, duracion: periodo.duracion, diasRestantes: periodo.duracion - periodo.numero,
      saldoInicial: saldo, referencia: ref.referencia, parteFija: ref.fija, parteLibre: ref.libre,
      paso: 0, hora: dia.paradas[0].hora, saldo,
      hambre: c.comida_en_casa ? 1 : 4, energia: 8, bateria: c.bateria_inicial,
      clima: c.lluvia ? "Garúa" : "Despejado", deuda: 0, retraso: 0,
      tramos: { ida: false, vuelta: false }, bienestar: 0,
      puntual: null, volvio: null, cola: [], log: [], terminado: false,
      sinFondos: 0,   // veces que intentó aceptar algo que no podía pagar
      viajes: {},   // un objeto de viaje por tramo: ida y vuelta
    };
  },

  // camila llega a la parada indicada: avanza la hora y desgasta hambre, energía y batería según las
  // horas que pasaron. después prepara la cola de eventos de esa parada.
  llegar(dia, est, idx) {
    const p = dia.paradas[idx];
    const iAula = dia.paradas.findIndex(q => q.id === "aula");
    // si se llega con un viaje, la hora de llegada es la salida más la duración del viaje.
    // hasta el aula la hora es la programada más el retraso acumulado
    const viaje = Object.values(est.viajes).find(v => v.destino === p.id);
    const nueva = idx <= iAula ? p.hora + est.retraso : Math.max(p.hora, est.hora + (viaje ? viaje.duracion : 0));
    const horas = Math.max(0, nueva - est.hora) / 60;
    est.hora = nueva;
    est.hambre = limitar(est.hambre + REGLAS.hambrePorHora * horas, 0, 10);
    est.energia = limitar(est.energia + REGLAS.energiaPorHora * horas, 0, 10);
    est.bateria = limitar(est.bateria + REGLAS.bateriaPorHora * horas, 0, 100);
    est.paso = idx;
    est.cola = dia.eventos[p.id].slice();
    if (p.id === "cafeteria" && dia.cond.comida_en_casa) est.hambre = limitar(est.hambre - 5, 0, 10); // almuerza su táper
    return p;
  },

  // dice si el evento todavía aplica. por ejemplo, si ya resolvió el tramo de ida, no vuelve a pagar pasaje,
  // y el menú económico solo aparece si no le alcanzó para el menú del día.
  aplica(dia, est, ev) {
    if (ev.tramo && est.tramos[ev.tramo]) return false;
    if (ev.id === "menu_economico") return !!est.almuerzoFallido; // solo si no alcanzó para el menú
    return true;
  },

  // saca de la cola el siguiente evento que todavía aplica. si ya no quedan, devuelve nulo.
  siguienteEvento(dia, est) {
    while (est.cola.length) {
      const ev = est.cola.shift();
      if (this.aplica(dia, est, ev)) return ev;
    }
    return null;
  },

  // arma el mensaje claro que se muestra cuando no alcanza el dinero.
  mensajeSinFondos(est, ev) {
    return `No te alcanza: tienes ${"S/ " + est.saldo.toFixed(2)} y ${ev.tipo === "fijo" ? ev.titulo.toLowerCase() : "esto"} cuesta ${"S/ " + ev.costo.toFixed(2)}.`;
  },

  // aquí actúa cada agente: aplica una decisión y devuelve uno de tres resultados.
  // aceptado: paga y recibe el efecto.
  // rechazado: no paga y sufre la consecuencia de rechazar.
  // sin fondos: quiso aceptar pero el costo es mayor que el saldo. no se aplica nada: el evento sigue
  // pendiente y quien decide debe elegir otra cosa, por ejemplo rechazar.
  // excepción: un gasto fijo obligatorio que no se puede pagar sí aplica su consecuencia, por ejemplo
  // quedarse sin almorzar, pero queda registrado como sin fondos con su mensaje.
  aplicar(dia, est, ev, acepta) {
    const alcanza = ev.costo <= est.saldo + 1e-9;
    if (ev.tipo === "fijo") acepta = true;   // un fijo siempre se intenta pagar
    if (acepta && !alcanza) {
      const mensaje = this.mensajeSinFondos(est, ev);
      est.sinFondos++;
      est.log.push({ parada: ev.parada, id: ev.id, titulo: ev.titulo, tipo: ev.tipo, costo: ev.costo, acepta: false, resultado: "sin_fondos", saldo: est.saldo, texto: mensaje });
      if (ev.tipo !== "fijo") return { resultado: "sin_fondos", acepta: false, aplicado: false, mensaje };
      const r = this.aplicarCambios(dia, est, ev, false);
      return { ...r, resultado: "sin_fondos", aplicado: true, mensaje: mensaje + " " + r.texto };
    }
    const r = this.aplicarCambios(dia, est, ev, acepta);
    est.log.push({ parada: ev.parada, id: ev.id, titulo: ev.titulo, tipo: ev.tipo, costo: ev.costo, acepta, resultado: r.resultado, saldo: est.saldo, texto: r.texto });
    return { ...r, aplicado: true };
  },

  // aplica al estado el efecto si acepta o la consecuencia si no acepta. solo la usa la función aplicar.
  aplicarCambios(dia, est, ev, acepta) {
    const cambios = acepta ? ev.efecto : ev.consecuencia;
    if (acepta) { est.saldo = redondear(est.saldo - ev.costo); est.bienestar += ev.bienestar; }
    est.bienestar += cambios.bienestar || 0;
    est.hambre = limitar(est.hambre + (cambios.hambre || 0), 0, 10);
    est.energia = limitar(est.energia + (cambios.energia || 0), 0, 10);
    est.bateria = limitar(est.bateria + (cambios.bateria || 0), 0, 100);
    est.retraso += cambios.minutos || 0;
    est.deuda += cambios.deuda || 0;
    if (ev.id === "almuerzo" && !acepta) est.almuerzoFallido = true;
    const texto = acepta ? (ev.tipo === "fijo" ? "Pagó." : "Aceptó.") : (cambios.texto || "Lo dejó pasar.");
    return { resultado: acepta ? "aceptado" : "rechazado", acepta, texto };
  },

  // al llegar a la primera clase se decide si fue puntual: lo es solo si no acumuló retraso.
  marcarPuntualidad(dia, est) {
    if (dia.paradas[est.paso].id === "aula") est.puntual = est.retraso === 0;
  },

  // gastos fijos, pasajes y deudas que todavía faltan pagar hoy. los usa el panel de estado y los agentes
  // que reservan dinero.
  pendientes(dia, est) {
    const lista = [];
    for (let i = est.paso; i < dia.paradas.length; i++) {
      const p = dia.paradas[i];
      for (const ev of dia.eventos[p.id]) {
        if (ev.tipo !== "fijo" && ev.tipo !== "transporte") continue;
        if (ev.tramo && est.tramos[ev.tramo]) continue;
        if (i === est.paso && !est.cola.includes(ev)) continue; // ya se resolvió en esta parada
        if (ev.tipo === "transporte")   // lo mínimo para ese tramo, normalmente el pasaje del bus
          lista.push({ nombre: `Pasaje de ${ev.tramo === "ida" ? "ida" : "vuelta"} (mínimo)`, monto: this.costoMinimoViaje(dia, ev.tramo), id: "pasaje_" + ev.tramo, tramo: ev.tramo });
        else lista.push({ nombre: ev.titulo, monto: ev.costo, id: ev.id });
      }
    }
    if (est.deuda > 0) lista.push({ nombre: "Deudas", monto: est.deuda, id: "deuda" });
    return lista;
  },

  // calcula el resultado del día y su puntaje. el puntaje es el bienestar, más el bono por llegar puntual,
  // menos una penalización fuerte si no volvió en transporte y otra si terminó con deudas.
  // las deudas del día se pagan al llegar a casa: si no alcanzan, se penaliza el saldo negativo y el saldo
  // queda en cero, nunca pasa negativo al día siguiente. hay quiebre si no pudo pagar el regreso en transporte.
  cerrarDia(dia, est) {
    let bienestar = est.bienestar;
    bienestar -= Math.max(0, est.hambre - 4);   // terminar con hambre resta
    bienestar -= Math.max(0, 3 - est.energia);  // terminar agotada resta
    const saldoFinal = redondear(est.saldo - est.deuda);
    const saldoSiguiente = Math.max(0, saldoFinal);
    const puntual = !!est.puntual, volvio = est.volvio !== false;
    // quiebre: en el regreso no le alcanzó ni para el pasaje del bus
    const puntaje = bienestar + (puntual ? REGLAS.bonoPuntual : 0)
      - (volvio ? 0 : REGLAS.penalSinTransporte) - (saldoFinal < 0 ? REGLAS.penalSaldoNegativo : 0);
    est.terminado = true;
    return { semilla: dia.semilla, numero: est.numero, saldoInicial: est.saldoInicial, gasto: redondear(est.saldoInicial - saldoSiguiente),
      referencia: est.referencia, parteFija: est.parteFija,
      viajes: Object.values(est.viajes).reduce((c, v) => (c[v.modo] = (c[v.modo] || 0) + 1, c), {}),
      saldoFinal, saldoSiguiente, volvio, quiebre: !!est.quiebre, puntual, bienestar: redondear(bienestar), puntaje: redondear(puntaje), sinFondos: est.sinFondos };
  },

  // periodo de varios días.
  // crea un periodo con el presupuesto inicial, la duración de 15 o 30 días y la semilla base.
  nuevoPeriodo(presupuesto, duracion, semillaBase) {
    return { presupuesto, duracion, semillaBase, saldo: presupuesto, dias: [], diaQuiebre: null, terminado: false };
  },

  // calendario completo de un día del periodo, con condiciones y eventos, generado de una sola vez antes
  // de cualquier decisión. las decisiones nunca usan el generador.
  diaDelPeriodo(per, numero, catalogo) {
    return this.nuevoDia(this.semillaDelDia(per.semillaBase, numero), catalogo);
  },

  // anota el resultado de un día: el saldo final pasa a ser el inicial del siguiente.
  // si hubo quiebre, el periodo termina ese día. la métrica del periodo completo está en metricas.js.
  registrarDia(per, r) {
    per.dias.push(r);
    per.saldo = r.saldoSiguiente;
    if (r.quiebre) { per.diaQuiebre = r.numero; per.terminado = true; }
    else if (per.dias.length >= per.duracion) per.terminado = true;
  },

  // explica en palabras qué pasa si acepta o rechaza, para mostrarlo en el panel.
  describirCambios(c, ev) {
    const t = [];
    if (c.hambre) t.push(c.hambre < 0 ? `hambre ${c.hambre}` : `hambre +${c.hambre}`);
    if (c.energia) t.push(`energía ${c.energia > 0 ? "+" : ""}${c.energia}`);
    if (c.bateria) t.push(c.bateria > 0 ? `batería +${c.bateria}%` : "sin batería");
    if (c.minutos) t.push(`llega ${c.minutos} min tarde`);
    if (c.deuda) t.push(`deuda S/ ${c.deuda.toFixed(2)}`);
    if (c.seguridad) t.push(c.seguridad > 0 ? "más seguro" : "menos seguro");
    if (c.sin_transporte) t.push("no vuelve en transporte");
    if (c.bienestar) t.push(`bienestar ${c.bienestar > 0 ? "+" : ""}${c.bienestar}`);
    return t;
  },
};
