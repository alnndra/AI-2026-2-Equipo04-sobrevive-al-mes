// archivo: base de datos.js, carpeta núcleo.
// qué hace: crea la base de datos del juego. intenta usar sqlite en el navegador con la librería sql.js,
// que se descarga de internet. si no carga, usa un respaldo en memoria con las mismas tablas y las mismas
// funciones, así el juego funciona igual sin conexión y se avisa en la pantalla.
// guarda el catálogo, las condiciones de cada día, cada periodo simulado y su historial diario.
// se relaciona con: catalogos.js y opciones.js de transporte, que dan los datos iniciales, con motor.js, que
// lee el catálogo, con comparacion.js del simulador, que guarda los experimentos, y con la interfaz,
// que lee los resultados para la tabla y el gráfico.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// dirección de internet desde donde se descarga sql.js.
const SQLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";

// carga sql.js desde internet agregando una etiqueta de script a la página. espera como máximo el tiempo
// límite: si no llega a tiempo o falla la descarga, rechaza la promesa y el juego pasa al respaldo en memoria.
function cargarSqlJs(limiteMs = 8000) {
  return new Promise((ok, falla) => {
    if (typeof document === "undefined") return falla(new Error("sin navegador"));
    const s = document.createElement("script");
    const reloj = setTimeout(() => falla(new Error("tiempo agotado")), limiteMs);
    s.src = SQLJS_CDN + "sql-wasm.js";
    s.onerror = () => { clearTimeout(reloj); falla(new Error("no cargó sql.js")); };
    s.onload = () => {
      window.initSqlJs({ locateFile: f => SQLJS_CDN + f })
        .then(SQL => { clearTimeout(reloj); ok(SQL); })
        .catch(e => { clearTimeout(reloj); falla(e); });
    };
    document.head.appendChild(s);
  });
}

// columnas de cada tabla en el orden en que se insertan. el respaldo en memoria usa estas mismas listas,
// así las dos versiones de la base guardan exactamente los mismos datos.
const COLUMNAS = {
  paradas: ["id", "orden", "nombre", "lugar", "hora", "descripcion"],
  gastos_fijos: ["id", "nombre", "parada", "monto", "condicion", "tramo", "orden", "efecto", "consecuencia"],
  catalogo_eventos: ["id", "parada", "titulo", "texto", "costo", "tipo", "probabilidad", "condicion", "bienestar", "tramo", "orden", "efecto", "consecuencia", "activo"],
  opciones_transporte: ["id", "tramo", "parada", "modo", "nombre", "costo", "minutos", "condicion", "disponible", "nota", "orden", "efecto"],
  pensamientos: ["id", "parada", "condicion", "prioridad", "texto", "tipo"],
  parametros: ["clave", "valor", "descripcion"],
  // condiciones sorteadas de cada día, junto con el presupuesto y la duración que eligió la persona
  condiciones_del_dia: ["semilla", "semilla_base", "dia", "presupuesto", "duracion", "comida_en_casa", "lluvia", "paro", "entrega_impreso", "examen", "olvido_carne", "bateria_inicial",
    "bus_lleno_ida", "bus_lleno_vuelta", "taxi_no_ida", "taxi_no_vuelta", "moto_no_ida", "moto_no_vuelta"],
  // una fila por periodo simulado de un agente o de la persona, de principio a fin o hasta el quiebre
  ejecuciones: ["lote", "agente", "nivel", "semilla_base", "presupuesto", "duracion", "dias_vividos", "dia_quiebre", "llego",
    "saldo_final", "bienestar_total", "bienestar_prom", "puntaje", "sin_fondos", "v_bus", "v_moto", "v_taxi", "v_pie", "ms", "detalle"],
  // una fila por día vivido de cada ejecución
  historial_diario: ["ejecucion", "agente", "dia", "saldo_inicial", "gasto", "saldo_final", "bienestar", "sin_fondos", "referencia_del_dia", "parte_fija_del_dia"],
};

// instrucciones sql que crean las tablas cuando sí se pudo cargar sqlite.
const ESQUEMA = `
CREATE TABLE paradas (id TEXT PRIMARY KEY, orden INTEGER, nombre TEXT, lugar TEXT, hora INTEGER, descripcion TEXT);
CREATE TABLE gastos_fijos (id TEXT PRIMARY KEY, nombre TEXT, parada TEXT, monto REAL, condicion TEXT, tramo TEXT, orden INTEGER, efecto TEXT, consecuencia TEXT);
CREATE TABLE catalogo_eventos (id TEXT PRIMARY KEY, parada TEXT, titulo TEXT, texto TEXT, costo REAL, tipo TEXT, probabilidad REAL, condicion TEXT, bienestar REAL, tramo TEXT, orden INTEGER, efecto TEXT, consecuencia TEXT, activo INTEGER);
CREATE TABLE parametros (clave TEXT PRIMARY KEY, valor REAL, descripcion TEXT);
CREATE TABLE pensamientos (id TEXT PRIMARY KEY, parada TEXT, condicion TEXT, prioridad INTEGER, texto TEXT, tipo TEXT);
CREATE TABLE opciones_transporte (id TEXT PRIMARY KEY, tramo TEXT, parada TEXT, modo TEXT, nombre TEXT, costo REAL, minutos INTEGER, condicion TEXT, disponible INTEGER, nota TEXT, orden INTEGER, efecto TEXT);
CREATE TABLE condiciones_del_dia (id INTEGER PRIMARY KEY AUTOINCREMENT, semilla INTEGER, semilla_base INTEGER, dia INTEGER, presupuesto REAL, duracion INTEGER,
  comida_en_casa INTEGER, lluvia INTEGER, paro INTEGER, entrega_impreso INTEGER, examen INTEGER, olvido_carne INTEGER, bateria_inicial INTEGER,
  bus_lleno_ida INTEGER, bus_lleno_vuelta INTEGER, taxi_no_ida INTEGER, taxi_no_vuelta INTEGER, moto_no_ida INTEGER, moto_no_vuelta INTEGER);
CREATE TABLE ejecuciones (id INTEGER PRIMARY KEY AUTOINCREMENT, lote TEXT, agente TEXT, nivel TEXT, semilla_base INTEGER, presupuesto REAL, duracion INTEGER,
  dias_vividos INTEGER, dia_quiebre INTEGER, llego INTEGER, saldo_final REAL, bienestar_total REAL, bienestar_prom REAL, puntaje REAL,
  sin_fondos INTEGER, v_bus INTEGER, v_moto INTEGER, v_taxi INTEGER, v_pie INTEGER, ms REAL, detalle TEXT);
CREATE TABLE historial_diario (id INTEGER PRIMARY KEY AUTOINCREMENT, ejecucion INTEGER REFERENCES ejecuciones(id), agente TEXT, dia INTEGER,
  saldo_inicial REAL, gasto REAL, saldo_final REAL, bienestar REAL, sin_fondos INTEGER, referencia_del_dia REAL, parte_fija_del_dia REAL);`;

// objeto de la base de datos. todas sus funciones sirven igual para sqlite y para el respaldo en memoria.
const BD = {
  modo: "memoria",   // dice cuál se está usando: sqlite o memoria
  db: null,          // la base de sqlite cuando sí cargó
  mem: null,         // el respaldo: una lista de filas por cada tabla

  // intenta abrir sqlite y crear las tablas. si algo falla, prepara el respaldo en memoria.
  // en los dos casos termina llenando las tablas con los datos iniciales.
  async iniciar() {
    try {
      const SQL = await cargarSqlJs();
      this.db = new SQL.Database();
      this.db.run(ESQUEMA);
      this.modo = "sqlite";
    } catch (e) {
      this.iniciarMemoria();
    }
    this.sembrar();
  },

  // prepara el respaldo en memoria: una lista vacía por cada tabla, con las mismas columnas que sqlite.
  iniciarMemoria() {
    this.modo = "memoria";
    this.mem = { paradas: [], gastos_fijos: [], catalogo_eventos: [], opciones_transporte: [], pensamientos: [], parametros: [], condiciones_del_dia: [], ejecuciones: [], historial_diario: [] };
  },

  // inserta los datos iniciales: paradas, gastos fijos, catálogo de eventos, pensamientos, parámetros y
  // opciones de transporte. los objetos de efecto y consecuencia se guardan como texto.
  // los eventos retirados se guardan marcados como inactivos.
  sembrar() {
    const json = v => (typeof v === "object" ? JSON.stringify(v) : v);
    this.transaccion(() => {
      DATOS.paradas.forEach(f => this.insertar("paradas", f));
      DATOS.gastos_fijos.forEach(([id, nombre, parada, monto, cond, tramo, orden, ef, cons]) =>
        this.insertar("gastos_fijos", [id, nombre, parada, monto, cond, tramo, orden, json(ef), json(cons)]));
      DATOS.catalogo_eventos.forEach(([id, parada, titulo, texto, costo, tipo, prob, cond, bien, tramo, orden, ef, cons]) =>
        this.insertar("catalogo_eventos", [id, parada, titulo, texto, costo, tipo, prob, cond, bien, tramo, orden, json(ef), json(cons), EVENTOS_RETIRADOS.has(id) ? 0 : 1]));
      DATOS.pensamientos.forEach(f => this.insertar("pensamientos", f));
      DATOS.parametros.forEach(f => this.insertar("parametros", f));
      DATOS.opciones_transporte.forEach(([id, tramo, parada, m, nombre, costo, minutos, cond, disp, nota, orden, ef]) =>
        this.insertar("opciones_transporte", [id, tramo, parada, m, nombre, costo, minutos, cond, disp, nota, orden, json(ef)]));
    });
  },

  // sentencias de inserción ya preparadas, una por tabla, para reutilizarlas.
  sentencias: {},
  // inserta una fila con los valores en el orden de las columnas de esa tabla y devuelve su número.
  // en sqlite reutiliza la sentencia preparada de la tabla: así miles de filas se guardan rápido.
  insertar(tabla, valores) {
    const cols = COLUMNAS[tabla];
    if (this.modo === "sqlite") {
      const st = this.sentencias[tabla] || (this.sentencias[tabla] =
        this.db.prepare(`INSERT INTO ${tabla} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`));
      st.run(valores.map(v => (v === undefined ? null : v)));
      return this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    }
    const fila = Object.fromEntries(cols.map((c, i) => [c, valores[i] === undefined ? null : valores[i]]));
    const t = this.mem[tabla];
    fila.id = fila.id || t.length + 1;
    t.push(fila);
    return fila.id;
  },

  // guarda un periodo completo: su fila en la tabla de ejecuciones, una fila por día en el historial diario
  // con su referencia de gasto, y si se pide, las condiciones sorteadas de cada día.
  // devuelve el número de la ejecución.
  guardarPeriodo(lote, agente, nivel, resumen, dias, ms, detalle, condiciones) {
    const r = resumen;
    const id = this.insertar("ejecuciones", [lote, agente, nivel, r.semillaBase, r.presupuesto, r.duracion, r.diasVividos, r.diaQuiebre,
      r.llego ? 1 : 0, r.saldoFinal, r.bienestarTotal, r.bienestarProm, r.puntaje, r.sinFondos || 0,
      (r.viajes || {}).bus || 0, (r.viajes || {}).mototaxi || 0, (r.viajes || {}).taxi || 0, (r.viajes || {}).caminar || 0, ms, detalle || null]);
    for (const d of dias) this.insertar("historial_diario", [id, agente, d.numero, d.saldoInicial, d.gasto, d.saldoSiguiente, d.bienestar, d.sinFondos || 0,
      d.referencia, d.parteFija]);
    if (condiciones) for (const c of condiciones)
      this.insertar("condiciones_del_dia", COLUMNAS.condiciones_del_dia.map(k => c[k]));
    return id;
  },

  // ejecuta varias inserciones juntas en una transacción. en sqlite es mucho más rápido y, si algo falla,
  // deshace todo para no dejar datos a medias.
  transaccion(fn) {
    if (this.modo === "sqlite") { this.db.run("BEGIN"); try { fn(); this.db.run("COMMIT"); } catch (e) { this.db.run("ROLLBACK"); throw e; } }
    else fn();
  },

  // devuelve todas las filas de una tabla como objetos, ordenadas por una columna si se pide.
  todas(tabla, orden) {
    if (this.modo === "sqlite") return this.consultar(`SELECT * FROM ${tabla}${orden ? " ORDER BY " + orden : ""}`);
    const filas = this.mem[tabla].map(f => ({ ...f }));
    return orden ? filas.sort((a, b) => (a[orden] > b[orden] ? 1 : a[orden] < b[orden] ? -1 : 0)) : filas;
  },

  // ejecuta una consulta sql con sus parámetros y devuelve las filas. solo se usa en modo sqlite.
  consultar(sql, params = []) {
    const st = this.db.prepare(sql);
    st.bind(params);
    const filas = [];
    while (st.step()) filas.push(st.getAsObject());
    st.free();
    return filas;
  },

  // promedios por agente y nivel de presupuesto para la tabla del experimento. en sqlite se agrupa con
  // la consulta y en memoria se hace lo mismo a mano. el día de quiebre promedio se calcula solo con las
  // corridas que sí quebraron, porque las demás no tienen día de quiebre.
  resumen(lote) {
    if (this.modo === "sqlite") {
      return this.consultar(`SELECT agente, nivel, AVG(presupuesto) AS presupuesto, 100.0*AVG(llego) AS llego, AVG(dia_quiebre) AS dia_quiebre,
        AVG(saldo_final) AS saldo, AVG(bienestar_prom) AS bienestar_prom, AVG(puntaje) AS puntaje, AVG(sin_fondos) AS sin_fondos, SUM(ms) AS ms, COUNT(*) AS corridas,
        100.0*SUM(v_bus)/MAX(1, SUM(v_bus+v_moto+v_taxi+v_pie)) AS p_bus, 100.0*SUM(v_moto)/MAX(1, SUM(v_bus+v_moto+v_taxi+v_pie)) AS p_moto,
        100.0*SUM(v_taxi)/MAX(1, SUM(v_bus+v_moto+v_taxi+v_pie)) AS p_taxi, 100.0*SUM(v_pie)/MAX(1, SUM(v_bus+v_moto+v_taxi+v_pie)) AS p_pie
        FROM ejecuciones WHERE lote = ? GROUP BY agente, nivel`, [lote]);
    }
    const grupos = {};
    this.mem.ejecuciones.filter(f => f.lote === lote).forEach(f => {
      const k = f.agente + "|" + f.nivel;
      const g = grupos[k] || (grupos[k] = { agente: f.agente, nivel: f.nivel, presupuesto: 0, llego: 0, q: 0, nq: 0, saldo: 0, bienestar_prom: 0, puntaje: 0, sin_fondos: 0, ms: 0, corridas: 0, vb: 0, vm: 0, vt: 0, vp: 0 });
      g.presupuesto += f.presupuesto; g.llego += f.llego; g.saldo += f.saldo_final; g.bienestar_prom += f.bienestar_prom; g.sin_fondos += f.sin_fondos; g.vb += f.v_bus; g.vm += f.v_moto; g.vt += f.v_taxi; g.vp += f.v_pie;
      g.puntaje += f.puntaje; g.ms += f.ms; g.corridas++;
      if (f.dia_quiebre !== null) { g.q += f.dia_quiebre; g.nq++; }
    });
    return Object.values(grupos).map(g => ({ agente: g.agente, nivel: g.nivel, presupuesto: g.presupuesto / g.corridas, llego: 100 * g.llego / g.corridas,
      dia_quiebre: g.nq ? g.q / g.nq : null, saldo: g.saldo / g.corridas, bienestar_prom: g.bienestar_prom / g.corridas,
      puntaje: g.puntaje / g.corridas, sin_fondos: g.sin_fondos / g.corridas, ms: g.ms, corridas: g.corridas,
      ...(t => ({ p_bus: 100 * g.vb / t, p_moto: 100 * g.vm / t, p_taxi: 100 * g.vt / t, p_pie: 100 * g.vp / t }))(Math.max(1, g.vb + g.vm + g.vt + g.vp)) }));
  },

  // pensamientos de camila ordenados de mayor a menor prioridad. la interfaz los lee una sola vez al arrancar.
  leerPensamientos() { return this.todas("pensamientos", "prioridad").reverse(); },

  // ejecuciones de un lote, por ejemplo la corrida con tu presupuesto: un periodo por agente y la persona si jugó.
  ejecucionesDeLote(lote) {
    if (this.modo === "sqlite") return this.consultar("SELECT * FROM ejecuciones WHERE lote = ? ORDER BY id", [lote]);
    return this.mem.ejecuciones.filter(f => f.lote === lote).map(f => ({ ...f }));
  },

  // historial día por día de una ejecución, que se usa para dibujar el gráfico de líneas del saldo.
  historialDe(ejecucion) {
    if (this.modo === "sqlite") return this.consultar("SELECT * FROM historial_diario WHERE ejecucion = ? ORDER BY dia", [ejecucion]);
    return this.mem.historial_diario.filter(f => f.ejecucion === ejecucion).map(f => ({ ...f }));
  },

  // lee las tablas del catálogo y las convierte en objetos listos para el motor. los efectos guardados como
  // texto vuelven a ser objetos. los eventos se leen en el orden en que se cargaron, porque el motor los
  // sortea en ese orden y así una semilla siempre da los mismos eventos.
  leerCatalogo() {
    const parsear = f => ({ ...f, efecto: JSON.parse(f.efecto || "{}"), consecuencia: JSON.parse(f.consecuencia || "{}") });
    return {
      paradas: this.todas("paradas", "orden"),
      fijos: this.todas("gastos_fijos").map(parsear),
      transporte: this.todas("opciones_transporte", "orden").map(f => ({ ...f, efecto: JSON.parse(f.efecto || "{}") })),
      parametros: Object.fromEntries(this.todas("parametros").map(f => [f.clave, f.valor])),
      eventos: this.todas("catalogo_eventos", "rowid").map(parsear), // en el orden en que se cargó el catálogo
    };
  },
};
