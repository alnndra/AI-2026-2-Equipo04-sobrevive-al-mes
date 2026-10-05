// archivo: paneles.js, carpeta interfaz.
// qué hace: maneja el panel que aparece sobre el mapa en cada parada. muestra cada evento con lo que pasa
// si acepta o rechaza, las tarjetas de bus, mototaxi y taxi en los paraderos, los avisos de falta de dinero
// y el aviso suave de la referencia de gasto. en el modo jugar la persona decide con botones. en el modo
// agente el panel muestra qué decidió el agente y por qué.
// se relaciona con: motor.js y eleccion.js de transporte, que aplican las decisiones, con los agentes, que
// deciden en el modo agente, con animacion viaje.js del mapa, que empieza el viaje al salir del paradero,
// con periodo.js, que cierra el día, y con paneles.css.
// responsable: yasmin akemi haji taira.
"use strict";

// panel de las paradas.
// abre el panel con un título, un subtítulo y su contenido. en celular el panel va debajo del mapa, por eso
// se desplaza la página hasta él.
function abrirPanel(titulo, sub, html) {
  $("pt").textContent = titulo; $("ps").textContent = sub; $("pb").innerHTML = html;
  $("panel").hidden = false; panelAbierto = true; $("go").hidden = true;
  if (innerWidth <= 640) $("panel").scrollIntoView({ block: "nearest", behavior: "smooth" }); // en celular el panel va debajo del mapa
}
// cierra el panel, salvo que la persona esté a mitad de una parada.
function cerrarPanel() {
  if (enParada && modo === "jugar") return; // no se cierra a mitad de una parada
  $("panel").hidden = true; panelAbierto = false;
}
// muestra un aviso corto arriba del mapa que desaparece solo después de un par de segundos.
function aviso(texto) {
  $("toast").textContent = texto; $("toast").hidden = false;
  clearTimeout(toastReloj); toastReloj = setTimeout(() => ($("toast").hidden = true), 2200);
}

// nombre que se muestra para cada tipo de evento.
const TIPOS = { fijo: "Gasto fijo", necesidad: "Necesidad", antojo: "Antojo", sorpresa: "Sorpresa" };
// arma la tarjeta de un evento con su costo, lo que pasa si acepta y lo que pasa si rechaza.
function tarjetaEvento(ev) {
  const si = Motor.describirCambios(ev.efecto, ev);
  if (ev.bienestar) si.push(`bienestar +${ev.bienestar}`);
  const no = Motor.describirCambios(ev.consecuencia, ev);
  const queda = est.saldo - ev.costo;
  return `<div class="evento"><h3><span class="chip t-${ev.tipo}">${TIPOS[ev.tipo]}</span>${ev.titulo}<span class="costo">${S(ev.costo)}</span></h3>
    <p>${ev.texto}</p>
    <div class="efectos"><div><b>${ev.tipo === "fijo" ? "Si paga" : "Si acepta"}</b>${si.join(", ") || "sin efectos extra"} · le quedan ${queda >= 0 ? S(queda) : "<span class='mal'>no alcanza</span>"}</div>
    <div><b>${ev.tipo === "fijo" ? "Si no alcanza" : "Si rechaza"}</b>${no.join(", ") || "nada grave"}</div></div></div>`;
}
// etiqueta de color para cada resultado del historial: aceptado, rechazado o sin fondos.
function etiquetaResultado(l) {
  if (l.resultado === "sin_fondos") return `<span class="mal">sin fondos</span>`;
  return `<span class="${l.acepta ? "ok" : "mal"}">${l.acepta ? (l.tipo === "fijo" ? "pagó" : "aceptó") + " " + S(l.costo) : "rechazó"}</span>`;
}
// lista de lo que ya se decidió en la parada actual.
function historialParada() {
  const hechos = est.log.filter(l => l.parada === dia.paradas[est.paso].id);
  return hechos.length ? `<ul class="historial">${hechos.map(l => `<li>${l.titulo}: ${etiquetaResultado(l)} — ${l.texto}</li>`).join("")}</ul>` : "";
}

// describe la parada al llegar, con avisos que dependen de las condiciones del día, como el carné olvidado.
function textoParada(p) {
  let t = p.descripcion;
  if (p.id === "puerta" && dia.cond.olvido_carne) t += " ¡Camila olvidó su carné! El vigilante la manda a Atención al alumno.";
  if (p.id === "cafeteria" && dia.cond.comida_en_casa) t += " Trajo su táper de casa: almuerza gratis.";
  return t;
}

// flujo de una parada.
// camila entra a la siguiente parada: el motor avanza la hora y se muestran sus eventos uno por uno.
function entrarParada() {
  // al entrar se descarta el pensamiento que estaba en pantalla si era sobre esta parada
  if (nube.texto && nube.ultimo && nube.ultimo.parada === dia.paradas[siguiente].id) nube.texto = null;
  Motor.llegar(dia, est, siguiente);
  Motor.marcarPuntualidad(dia, est);
  enParada = true;
  pintarHUD();
  mostrarEvento();
}

// saca el siguiente evento de la parada y lo muestra, o cierra la parada si ya no quedan.
function mostrarEvento() {
  const ev = Motor.siguienteEvento(dia, est);
  if (!ev) return terminarParada();
  if (ev.tipo === "transporte") return presentarViaje(ev);
  presentarEvento(ev);
}

// paradero: tarjetas lado a lado con bus, mototaxi y taxi, de la más barata a la más cara, y caminar solo si
// no alcanza para ninguna. cada tarjeta muestra costo, minutos, una nota de ventaja o riesgo, y si no está
// disponible, con su razón, como paro, bus lleno o sin taxis, o si no alcanza.
// en el modo agente se ve la elección del agente y, para el de utilidad, la tabla de utilidades.
function presentarViaje(ev, aviso) {
  const p = dia.paradas[est.paso];
  const ops = Motor.opcionesViaje(dia, est, ev);
  const icono = { bus: "🚌", mototaxi: "🛺", taxi: "🚕", caminar: "🚶" };
  const tarjetas = ops.map(o => {
    const apagada = !o.disponible || !o.alcanza;
    const estado = !o.disponible ? `<p class="mal">No disponible.</p>` : !o.alcanza ? `<p class="mal">No te alcanza (tienes ${S(est.saldo)}).</p>` : "";
    const boton = modo !== "jugar" ? "" : `<button class="btn ${apagada ? "sin-fondos" : "primario"}" data-modo="${o.modo}" ${!o.disponible ? "disabled" : ""}>
      ${o.modo === "caminar" ? "Caminar" : "Elegir " + o.nombre.toLowerCase()}${o.disponible && !o.alcanza ? " · Sin fondos" : ""}</button>`;
    return `<div class="op-viaje ${apagada ? "apagada" : ""}"><div class="op-cab"><span class="op-icono" aria-hidden="true">${icono[o.modo]}</span><b>${o.nombre}</b>
      <span class="costo">${o.costo ? S(o.costo) : "Gratis"}</span></div><div class="op-min">≈ ${o.minutos} minutos</div><p>${o.nota}</p>${estado}${boton}</div>`;
  }).join("");
  let html = `<p>${textoParada(p)}</p>${historialParada()}<h3 style="margin:10px 0 0">${ev.titulo}</h3>
    <p class="situacion">${situacionViaje(dia, ev.tramo)}</p><div class="opciones-viaje">${tarjetas}</div>`;
  if (aviso) html += `<div class="aviso-fondos" role="alert">⚠ ${aviso}</div>`;
  const sub = `${NOMBRE_LUGAR[p.lugar]} · ${hhmm(est.hora)} · saldo ${S(est.saldo)}`;
  if (modo === "jugar") {
    evMostrado = ev;
    html += `<div class="acciones"><button class="btn" id="bRapido">⚡ Resolver el día rápido</button></div>`;
    abrirPanel(p.nombre, sub, html);
    $("bRapido").onclick = resolverDiaRapido;
    $("pb").querySelectorAll("button[data-modo]").forEach(b => (b.onclick = () => {
      const r = Motor.elegirViaje(dia, est, ev, b.dataset.modo);
      pintarHUD();
      if (!r.aplicado) return presentarViaje(ev, r.mensaje);   // sin fondos o no disponible: la persona elige otra
      evMostrado = null; mostrarEvento();
    }));
    const primera = $("pb").querySelector("button.primario[data-modo]"); if (primera) primera.focus();
  } else {
    // en el modo agente: el agente percibe y decide aquí, y actúa después de una pausa para que se pueda leer
    const ag = agenteActivo, per = ag.percibir(dia, est, ev), d = ag.decidir(per);
    const elegida = ops.find(o => o.modo === d.opcion);
    html += `<div class="decision"><b>${ag.nombre}: elige ${elegida ? elegida.nombre.toLowerCase() : d.opcion}</b><br>${d.razon}</div>`;
    if (d.utilidades) html += `<table class="compacta utilidades"><thead><tr><th>Opción</th><th>Utilidad calculada</th></tr></thead><tbody>
      ${d.utilidades.map(t => `<tr class="${t.modo === d.opcion ? "mejor" : ""}"><td>${icono[t.modo]} ${t.nombre}</td><td>${t.u === null ? `<span class="mal">${t.motivo}</span>` : t.u.toFixed(2)}</td></tr>`).join("")}</tbody></table>`;
    abrirPanel(p.nombre, sub, html);
    esperar(() => { Simulador.actuarConReintento(ag, dia, est, ev, per, d); pintarHUD(); mostrarEvento(); }, 3000);
  }
}

// describe la situación del transporte ese día: paro, bus lleno, lluvia, noche y falta de taxis o mototaxis.
// son los antiguos eventos de transporte, ahora como contexto de las tarjetas.
function situacionViaje(dia, tramo) {
  const c = dia.cond, t = [];
  if (c.paro) t.push("Hay paro de transporte: el bus no pasa y el mototaxi y el taxi cobran más.");
  else if (c["bus_lleno_" + tramo]) t.push("El bus está pasando lleno.");
  if (c.lluvia) t.push(tramo === "ida" ? "Llueve: el bus va lento, el mototaxi sube de precio y el taxi es la opción cómoda y cara." : "Llueve y es de noche.");
  if (tramo === "vuelta") t.push("De noche el taxi es lo más seguro, el mototaxi es intermedio y el bus es lo más barato pero inseguro.");
  if (c["taxi_no_" + tramo]) t.push("No hay taxis a esta hora.");
  if (c["moto_no_" + tramo]) t.push("No se ve ningún mototaxi.");
  return t.join(" ");
}

// muestra un evento con sus botones. el aviso sin fondos aparece cuando se intentó aceptar algo que no
// alcanza: el evento sigue en pantalla para que la persona elija otra opción.
function presentarEvento(ev, avisoSinFondos) {
  const p = dia.paradas[est.paso];
  const sub = `${NOMBRE_LUGAR[p.lugar]} · ${hhmm(est.hora)} · saldo ${S(est.saldo)}`;
  const alcanza = ev.costo <= est.saldo + 1e-9;
  let html = `<p>${textoParada(p)}</p>${historialParada()}${tarjetaEvento(ev)}`;
  if (avisoSinFondos) html += `<div class="aviso-fondos" role="alert">⚠ ${avisoSinFondos}</div>`;
  html += avisoReferencia(ev, alcanza);
  if (modo === "jugar") {
    evMostrado = ev;
    const rapido = `<button class="btn" id="bRapido">⚡ Resolver el día rápido</button>`;
    html += ev.tipo === "fijo"
      ? `<div class="acciones"><button class="btn primario${alcanza ? "" : " sin-fondos"}" id="bPagar">${alcanza ? "Pagar " + S(ev.costo) : "No me alcanza · seguir"}</button>${rapido}</div>`
      : `<div class="acciones"><button class="btn primario${alcanza ? "" : " sin-fondos"}" id="bSi" ${alcanza ? "" : `aria-describedby="pb" title="Sin fondos"`}>${alcanza ? "Aceptar" : "Aceptar · Sin fondos"}</button><button class="btn peligro" id="bNo">Rechazar</button>${rapido}</div>`;
    abrirPanel(p.nombre, sub, html);
    $("bRapido").onclick = resolverDiaRapido;
    const decidir = acepta => {
      const r = Motor.aplicar(dia, est, ev, acepta);
      pintarHUD();
      if (r.resultado === "sin_fondos" && !r.aplicado) return presentarEvento(ev, r.mensaje);   // vuelve a mostrar el evento para elegir otra opción
      evMostrado = null;
      if (r.resultado === "sin_fondos") return avisoFijoSinFondos(r.mensaje);
      mostrarEvento();
    };
    if ($("bPagar")) { $("bPagar").onclick = () => decidir(true); $("bPagar").focus(); }
    else { $("bSi").onclick = () => decidir(true); $("bNo").onclick = () => decidir(false); (alcanza ? $("bSi") : $("bNo")).focus(); }
  } else {
    // en el modo agente: el agente percibe y decide aquí, el panel muestra qué decidió y por qué, y actúa
    // después de una pausa
    const ag = agenteActivo;
    const per = ev.tipo === "fijo" ? null : ag.percibir(dia, est, ev);
    const decision = ev.tipo === "fijo" ? { acepta: true, razon: "Gasto fijo obligatorio: lo paga si le alcanza." } : ag.decidir(per);
    const intento = decision.acepta && !alcanza;
    html += `<div class="decision ${decision.acepta && alcanza ? "" : "no"}"><b>${ag.nombre}: ${intento ? "Intenta aceptar…" : decision.acepta ? (ev.tipo === "fijo" ? "Paga" : "Acepta") : "Rechaza"}</b><br>${decision.razon}</div>`;
    if (intento) html += `<div class="aviso-fondos" role="alert">⚠ ${Motor.mensajeSinFondos(est, ev)} ${ev.tipo === "fijo" ? "" : "Tiene que rechazarlo."}</div>`;
    abrirPanel(p.nombre, sub, html);
    esperar(() => {
      Simulador.actuarConReintento(ag, dia, est, ev, per, decision);   // aquí actúa. si no alcanza, rechaza
      pintarHUD(); mostrarEvento();
    }, intento ? 3400 : 2600);
  }
}

// aviso suave que no bloquea: si aceptar este gasto opcional la deja por encima de la referencia de hoy.
function avisoReferencia(ev, alcanza) {
  if (ev.tipo === "fijo" || !alcanza) return "";
  const antes = gastadoHoy(), exceso = redondear(antes + ev.costo - est.referencia);
  if (exceso <= 0) return "";
  const texto = antes > est.referencia ? `Ya pasaste la referencia de hoy: con esto quedarías ${S(exceso)} por encima.`
    : `Con esto pasas la referencia de hoy en ${S(exceso)}.`;
  return `<div class="aviso-suave" role="note">💡 ${texto} Igual puedes decidir.</div>`;
}

// gasto fijo que no se pudo pagar: se avisa claramente antes de seguir.
function avisoFijoSinFondos(mensaje) {
  const p = dia.paradas[est.paso];
  abrirPanel(p.nombre, `${NOMBRE_LUGAR[p.lugar]} · ${hhmm(est.hora)} · saldo ${S(est.saldo)}`,
    `<div class="aviso-fondos" role="alert">⚠ ${mensaje}</div><div class="acciones"><button class="btn primario" id="bOk">Entendido</button></div>`);
  $("bOk").onclick = mostrarEvento; $("bOk").focus();
}

// cierra la parada: si era la última, muestra el resumen del día. si de aquí sale un viaje, ofrece subir
// al vehículo o empezar a caminar.
function terminarParada() {
  const p = dia.paradas[est.paso];
  enParada = false;
  siguiente++;
  pintarHUD();
  if (p.id === "casa_fin") return finDelDia();
  // revisa si de esta parada sale un viaje, que el motor creó al resolver el tramo
  const viaje = Object.values(est.viajes).find(v => v.origen === p.id);
  const boton = !viaje ? "Seguir caminando" : viaje.modo === "bus" ? "Subir al bus"
    : viaje.modo === "taxi" ? `Subir al ${viaje.nombre.toLowerCase()}` : "Empezar a caminar";
  const textoViaje = !viaje ? "" : viaje.modo === "caminar"
    ? `<p class="mal">Sin transporte: Camila irá a pie (unos ${viaje.duracion} minutos).</p>`
    : `<p>Viaje: <b>${viaje.nombre}</b> · unos ${viaje.duracion} minutos.</p>`;
  const html = `<p>${textoParada(p)}</p>${historialParada() || "<p style='color:var(--suave)'>Aquí no hubo gastos hoy.</p>"}
    ${textoViaje}<p>Siguiente parada: <b>${dia.paradas[siguiente].nombre}</b>.</p>
    ${modo === "jugar" ? `<div class="acciones"><button class="btn primario" id="bSeguir">${boton}</button><button class="btn" id="bRapido">⚡ Resolver el día rápido</button></div>` : ""}`;
  abrirPanel(p.nombre, `${NOMBRE_LUGAR[p.lugar]} · ${hhmm(est.hora)} · saldo ${S(est.saldo)}`, html);
  if (modo === "jugar") {
    $("bRapido").onclick = resolverDiaRapido;
    // si vuelve a pie, la escena termina sola en la puerta de su casa
    const alLlegar = () => { if (viaje.modo === "caminar" && viaje.tramo === "vuelta") entrarParada(); };
    $("bSeguir").onclick = viaje ? () => iniciarViaje(viaje, alLlegar) : cerrarPanel;
    $("bSeguir").focus();
  } else esperar(() => { cerrarPanel(); if (viaje) iniciarViaje(viaje, caminarAgente); else caminarAgente(); }, 1600);
}
