// archivo: decoracion.js, carpeta mapa.
// qué hace: dibuja con texto los adornos del pueblo en estilo de píxeles, como árboles, bancas, farolas y
// la fuente, y decide dónde va cada uno sin tapar puertas, carriles ni accesos a la pista.
// también ubica los postes de luz con sus cables.
// se relaciona con: mundo.js, de donde toma las medidas, los edificios y los puntos de acceso, con suelo.js,
// que dibuja los patios, y con dibujo.js y escena.js, que pintan cada adorno en orden de profundidad.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// adornos en estilo de píxeles dibujados con texto: cada letra es un color y el punto es transparente.
// se pintan una sola vez en un lienzo aparte y después solo se copian.
// paleta: qué color tiene cada letra.
const PALETA = {
  G: "#3f8f45", g: "#74c45a", d: "#2b6634", T: "#7a4e2d", t: "#5a3920", B: "#b8763f", b: "#8a5428", k: "#3b3f4a",
  L: "#d7dee8", Y: "#ffe08a", P: "#6b7280", p: "#4b5260", V: "#2f9e7a", v: "#237a5e", r: "#ef6b8a", y: "#facc15",
  w: "#f8fafc", O: "#c2703d", o: "#9a5530", A: "#7cc6f0", a: "#4aa3d8", C: "#94a3b8", c: "#64748b", R: "#e5484d", N: "#1f2937",
  M: "#facc15", m: "#ca8a04", S: "#f1f5f9", s: "#cbd5e1",
};
// cada dibujo empieza con su escala, cuántos píxeles mide cada letra, y sigue con sus filas de letras.
const DIBUJOS = {
  arbol: [4, "...gggGG....", "..gggGGGGG..", ".ggGGGGGGdd.", "gggGGGGGGGdd", "ggGGGGGGGGdd", "gGGGGGGGGddd", "GGGGGGGGdddd",
    ".GGGGGGdddd.", "..dGGddddd..", "....dTtd....", ".....Tt.....", ".....Tt.....", "....TTtt...."],
  arbusto: [3, "..gGGg..", ".gGGGGd.", "gGGGGGdd", "GGGGGddd", ".dddddd."],
  banca: [3, "BBBBBBBBBBBB", "bbbbbbbbbbbb", "BBBBBBBBBBBB", "bbbbbbbbbbbb", ".k........k.", ".k........k."],
  farola: [3, ".LLL.", "LYYYL", ".LLL.", "..P..", "..P..", "..P..", "..P..", "..P..", "..P..", "..P..", "..P..", "..P..", "..P..", "..p..", ".PPP."],
  tacho: [3, "kkkkk", "VVVVV", "VvVvV", "VvVvV", "VvVvV", ".vvv."],
  maceta: [3, ".r.y..", "rgryg.", ".gGgy.", "OOOOOO", ".oooo.", ".oooo."],
  flores: [3, "r.y..r.", "g.g.yg.", "gggggg."],
  fuente: [4, "......SS......", ".....SAAS.....", "......aa......", "..ssssaassss..", ".sAAAAAAAAAAs.", "sAAaAAAAAaAAAs", "sAAAAAaAAAAAAs",
    ".sAAAAAAAAAAs.", "..ssssssssss.."],
  auto_rojo: [3, "..NNNNNNNNNN..", ".NRRRRRRRRRRN.", "NRRAARRRRAARRN", "NRRAARRRRAARRN", "NRRAARRRRAARRN", ".NRRRRRRRRRRN.", "..NNNNNNNNNN.."],
  auto_azul: [3, "..NNNNNNNNNN..", ".NaaaaaaaaaaN.", "NaaSSaaaaSSaaN", "NaaSSaaaaSSaaN", "NaaSSaaaaSSaaN", ".NaaaaaaaaaaN.", "..NNNNNNNNNN.."],
  combi: [3, "..NNNNNNNNNNNNNN..", ".NMMMMMMMMMMMMMMN.", "NMMAAMAAMAAMAAMMMN", "NMMAAMAAMAAMAAMMMN", "NMMMMMMMMMMMMMMMMN", ".NmmmmmmmmmmmmmmN.", "..NNNNNNNNNNNNNN.."],
};
// lienzos ya pintados de cada adorno.
const SPR = {};
for (const [k, [esc, ...filas]] of Object.entries(DIBUJOS)) {
  const cv = document.createElement("canvas");
  cv.width = filas[0].length * esc; cv.height = filas.length * esc;
  const g = cv.getContext("2d");
  filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== ".") { g.fillStyle = PALETA[ch]; g.fillRect(x * esc, y * esc, esc, esc); } }));
  SPR[k] = cv;
}

// lista de adornos: cada uno guarda su tipo, su posición horizontal y la altura donde se apoya.
// se reparten con la mezcla fija de mundo.js y nunca con el azar del navegador.
const DEC = [];
// agrega un adorno a la lista.
const agregar = (k, x, y) => DEC.push([k, x, y]);
// dice si una posición está cerca de un carril vertical.
const cercaCarril = (x, m) => CX.some(c => Math.abs(x - c) < m);
// dice si una posición está cerca de la puerta de un edificio de esa fila.
const cercaPuerta = (x, base, m) => LUGARES.some(L => L.base === base && Math.abs(L.sx - x) < m);
// dice si una posición está cerca de un tramo de acceso de los carriles, para no tapar con árboles o
// bancas el paso a la pista.
const cercaAcceso = (x, y, m) => PUNTOS_ACCESO.filter(a => a.lado === "arriba" || a.lado === "abajo")
  .some(({ tramo: r }) => Math.abs(r[0] + r[2] / 2 - x) < m + 10 && y > r[1] - 30 && y < r[1] + r[3] + 40);
// agrega un adorno solo si no tapa un acceso a la pista.
const agregarLibre = (k, x, y) => { if (!cercaAcceso(x, y, 45)) agregar(k, x, y); };
// árboles detrás de la fila de arriba
for (let x = 120; x < 1700; x += 95) agregarLibre(H(x, 1) % 3 ? "arbol" : "arbusto", x + (H(x, 2) % 30), 150 + (H(x, 3) % 30));
// macetas, bancas, tachos y farolas en el borde de cada calle, sin tapar puertas ni carriles
BASES.forEach((base, ri) => {
  for (let x = 130; x < 1690; x += 110) {
    if (cercaPuerta(x, base, 60) || cercaCarril(x, 55)) continue;
    agregarLibre(["maceta", "farola", "tacho", "maceta", "farola"][H(x, ri) % 5], x, base + 12);
  }
});
// arbustos y flores en los bordes de pasto entre filas
[436, 746].forEach(y => { for (let x = 118; x < 1690; x += 46) { if (cercaCarril(x, 50)) continue; agregar(["arbusto", "flores", "arbusto", "flores", "maceta"][H(x, y) % 5], x, y); } });
// patio de la fila de abajo, en el tercer tramo, con fuente, árboles y bancas
const PATIOS = [[985, 800, 300, 130]];
agregar("fuente", 1135, 885);
[[960, 800], [1300, 800], [960, 950]].forEach(([x, y]) => agregar("arbol", x, y));
[[1045, 925], [1225, 925]].forEach(([x, y]) => agregar("banca", x, y));
[[1020, 850], [1250, 850]].forEach(([x, y]) => agregar("maceta", x, y));
// parque al fondo, debajo de la última calle
[[150, 1120], [370, 1150], [620, 1130], [800, 1170], [1000, 1120], [1180, 1160], [1470, 1130], [1680, 1150]].forEach(([x, y]) => agregarLibre("arbol", x, y));
[[200, 1090], [560, 1090], [900, 1100], [1260, 1090], [1480, 1090]].forEach(([x, y]) => agregarLibre("banca", x, y));
[[420, 1110], [720, 1105], [1100, 1100], [1380, 1110]].forEach(([x, y]) => agregarLibre("flores", x, y));
// los autos estacionados se quitaron de la pista porque ahora por ahí circulan el bus, el mototaxi y el taxi.

// postes de concreto con cables, al borde de abajo de cada calle, sin tapar puertas.
const POSTES = BASES.map(b => [250, 650, 1050, 1450, 1650].filter(x => !cercaPuerta(x, b, 40)).map(x => [x, b + 66]));
