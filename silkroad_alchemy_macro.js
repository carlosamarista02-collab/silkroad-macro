"ui";

var URL_ACTUALIZACION = "https://raw.githubusercontent.com/carlosamarista02-collab/silkroad-macro/main/silkroad_alchemy_macro.js";
var URL_BASE_IMAGENES = "https://raw.githubusercontent.com/carlosamarista02-collab/silkroad-macro/main/";
var VERSION_ACTUAL = "1.3.8";

var PLANTILLAS_REPO = [
  "pergamino.png",
  "menu.png",
  "alchemy.png",
  "Fuse.png",
  "fuse.png",
  "items.png",
  "lv.png",
  "nombre.png",
  "nombre_itens.jpg",
  "page_1.png",
  "page_2.png",
  "page_3.png",
  "plus_1.png",
  "plus_2.jpg",
  "plus_0_1.png",
  "estado_plus_0.png",
  "elixir_weapon.png",
  "elixir_shield.png",
  "elixir_protector.png",
  "elixir_acceaorio.png",
  "elixir_accessory.png",
  "elixir_special.png",
  "Lucky_Power_1th.png",
  "Lucky_Power_2th.png",
  "Lucky_Power_3th.png",
  "Lucky_Power_4th.png",
  "Lucky_Power_5th.png",
  "Lucky_Power_6th.png",
  "Lucky_Power_7th.png",
  "Lucky_Power_8th.png",
  "broken.png",
  "sin_elixir.png",
  "target.png",
  "confirm.png"
];

try {
  activity.resizeTask && activity.resizeTask(700, 1100);
} catch (e) {}

var prefs = storages.create("SilkroadAlchemyApp");
var workerThread = null;
var contadorThread = null;
var floatWin = null;
var running = false;
var alchemyActiva = false;
var paused = false;
var vistaActual = "alchemy";
var disparoAutoHora = "";
var capturaLista = false;

var ALCHEMY_ITEM_SLOT = { x: 305, y: 640, size: 72 };

var PLUS_OPCIONES = [
  "+1", "+2", "+3", "+4", "+5", "+6", "+7", "+8",
  "+9", "+10", "+11", "+12", "+13", "+14", "+15"
];

var ELIXIR_OPCIONES = [
  { label: "Weapon Elixir", key: "weapon" },
  { label: "Shield Elixir", key: "shield" },
  { label: "Protector Elixir", key: "protector" },
  { label: "Accessory Elixir", key: "accessory" },
  { label: "Astral / Immortal", key: "special" }
];

var LUCKY_DEGREES = [
  "1th", "2th", "3th", "4th", "5th", "6th", "7th", "8th"
];

var colaItensDetec = [];
var indiceItemActual = 0;
var ultimoEscaneoPantalla = {
  carpetaUsada: "/storage/emulated/0/SilkroadMacro/",
  menuHit: null,
  elixiresPorTipo: {
    weapon: 0,
    shield: 0,
    protector: 0,
    accessory: 0,
    special: 0
  },
  luckyTotal: 0,
  plantillasEncontradas: []
};

var logsHistorial = [];
var statsSesion = {
  modo: "Alchemy",
  personaje: "",
  nivel: "",
  itemDetectado: "Auriga Elegant Staff",
  plusActual: "+0",
  cantidadMismoItem: 0,
  descripcionItem: "Ítem: Auriga Elegant Staff | Estado: +0",
  intentos: 0,
  fallos: 0,
  roto: false,
  sinElixir: false,
  sinLucky: false,
  metaAlcanzada: false
};

function horaActual() {
  var d = new Date();
  var h = ("0" + d.getHours()).slice(-2);
  var m = ("0" + d.getMinutes()).slice(-2);
  var s = ("0" + d.getSeconds()).slice(-2);
  return h + ":" + m + ":" + s;
}

function agregarLog(msg) {
  var linea = "[" + horaActual() + "] " + msg;
  logsHistorial.push(linea);
  if (logsHistorial.length > 300) {
    logsHistorial.shift();
  }
  log(linea);
}

function copiarImagenesLocalesSiFaltan(dirDestino) {
  var destino = dirDestino || "/storage/emulated/0/SilkroadMacro/";
  if (!destino.endsWith("/")) destino += "/";
  files.createWithDirs(destino);

  var origenes = [
    "/storage/emulated/0/Scripts/SilkroadMacro/",
    "/storage/emulated/0/Scripts/",
    "./SilkroadMacro/",
    "./"
  ];

  try {
    var fuente = engines.myEngine().getSource();
    if (fuente) {
      var p = String(fuente.toString());
      var idx = p.lastIndexOf("/");
      if (idx > 0) {
        var baseScript = p.substring(0, idx + 1);
        origenes.unshift(baseScript + "SilkroadMacro/");
        origenes.unshift(baseScript);
      }
    }
  } catch (e) {}

  var copiados = 0;
  for (var o = 0; o < origenes.length; o++) {
    var dirSrc = origenes[o];
    if (!dirSrc.endsWith("/")) dirSrc += "/";
    if (dirSrc === destino || !files.exists(dirSrc)) continue;

    try {
      var lista = files.listDir(dirSrc, function (name) {
        return /\.(png|jpg|jpeg)$/i.test(name);
      });

      for (var i = 0; i < lista.length; i++) {
        var nombreArchivo = lista[i];
        if (nombreArchivo === "item_auto.png") continue;
        var rutaSrc = dirSrc + nombreArchivo;
        var rutaDst = destino + nombreArchivo;
        if (!files.exists(rutaDst)) {
          files.copy(rutaSrc, rutaDst);
          copiados++;
        }
      }
    } catch (e) {}
  }

  return copiados;
}

function descargarPlantillasDesdeGitHub(dirDestino) {
  var destino = dirDestino || "/storage/emulated/0/SilkroadMacro/";
  if (!destino.endsWith("/")) destino += "/";
  files.createWithDirs(destino);

  var descargadas = 0;
  for (var i = 0; i < PLANTILLAS_REPO.length; i++) {
    var nombre = PLANTILLAS_REPO[i];
    var rutaLocal = destino + nombre;
    if (files.exists(rutaLocal)) continue;

    try {
      var url = URL_BASE_IMAGENES + encodeURIComponent(nombre) + "?v=" + new Date().getTime();
      var res = http.get(url);
      if (res && res.statusCode === 200) {
        var bytes = res.body.bytes();
        if (bytes && bytes.length > 50) {
          files.writeBytes(rutaLocal, bytes);
          descargadas++;
        }
      }
    } catch (e) {}
  }

  return descargadas;
}

function sincronizarCarpetaImagenes(dirDestino, forzarDescarga) {
  var destino = dirDestino || "/storage/emulated/0/SilkroadMacro/";
  if (!destino.endsWith("/")) destino += "/";
  files.createWithDirs(destino);

  var copiados = copiarImagenesLocalesSiFaltan(destino);
  var descargados = 0;

  var tieneBase =
    files.exists(destino + "menu.png") ||
    files.exists(destino + "pergamino.png") ||
    files.exists(destino + "elixir_weapon.png") ||
    files.exists(destino + "Fuse.png") ||
    files.exists(destino + "fuse.png");

  if (forzarDescarga || !tieneBase) {
    descargados = descargarPlantillasDesdeGitHub(destino);
  }

  if (copiados > 0 || descargados > 0) {
    agregarLog("Sincronización imágenes (" + destino + "): +" + copiados + " locales, +" + descargados + " desde GitHub");
  }

  return destino;
}

function resolverCarpetaImagenes() {
  var principal = "/storage/emulated/0/SilkroadMacro/";
  files.createWithDirs(principal);

  var candidatos = [
    principal,
    "/sdcard/SilkroadMacro/",
    "/storage/emulated/0/Scripts/SilkroadMacro/",
    "/storage/emulated/0/Scripts/"
  ];

  try {
    var fuente = engines.myEngine().getSource();
    if (fuente) {
      var p = String(fuente.toString());
      var idx = p.lastIndexOf("/");
      if (idx > 0) {
        var dirScript = p.substring(0, idx + 1);
        candidatos.push(dirScript + "SilkroadMacro/");
        candidatos.push(dirScript);
      }
    }
  } catch (e) {}

  var senales = ["pergamino.png", "pergamino.jpg", "menu.png", "menu.jpg", "elixir_weapon.png", "Fuse.png", "fuse.png"];

  for (var i = 0; i < candidatos.length; i++) {
    var dir = candidatos[i];
    if (!dir.endsWith("/")) dir += "/";
    if (!files.exists(dir)) continue;

    for (var s = 0; s < senales.length; s++) {
      if (files.exists(dir + senales[s])) {
        return dir;
      }
    }
  }

  return principal;
}

function reiniciarStats(modo) {
  var nombreBase = String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item";
  statsSesion = {
    modo: modo || "Alchemy",
    personaje: "",
    nivel: "",
    itemDetectado: nombreBase,
    plusActual: "+0",
    cantidadMismoItem: colaItensDetec.length,
    descripcionItem: "Ítem: " + nombreBase + " | Estado: +0",
    intentos: 0,
    fallos: 0,
    roto: false,
    sinElixir: false,
    sinLucky: false,
    metaAlcanzada: false
  };
}

function normalizarCodigo(texto) {
  return String(texto || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function comprobarYActualizarScript() {
  toast("Buscando actualización...");
  agregarLog("Buscando actualización en " + URL_ACTUALIZACION);

  threads.start(function () {
    try {
      var sep = URL_ACTUALIZACION.indexOf("?") === -1 ? "?" : "&";
      var urlSinCache = URL_ACTUALIZACION + sep + "v=" + new Date().getTime();

      var res = http.get(urlSinCache);
      if (!res || res.statusCode !== 200) {
        toast("Sin actualización");
        agregarLog("Actualización omitida: respuesta HTTP " + (res ? res.statusCode : "sin respuesta"));
        return;
      }

      var nuevoCodigo = String(res.body.string() || "");
      var limpioNuevo = normalizarCodigo(nuevoCodigo);

      if (limpioNuevo.length < 200 || limpioNuevo.indexOf("mostrarVistaAlchemy") === -1) {
        toast("Sin actualización");
        agregarLog("Actualización omitida: archivo remoto vacío o incompleto");
        return;
      }

      var fuente = engines.myEngine().getSource();
      var rutaScript = fuente ? String(fuente.toString()) : "";
      if (!rutaScript || !files.exists(rutaScript)) {
        toast("Sin actualización");
        agregarLog("Actualización omitida: ruta local no encontrada");
        return;
      }

      var codigoActual = String(files.read(rutaScript) || "");
      var limpioActual = normalizarCodigo(codigoActual);

      if (limpioActual === limpioNuevo) {
        toast("Sin actualización");
        agregarLog("Sin cambios: el archivo local ya coincide con GitHub");
        return;
      }

      files.write(rutaScript, nuevoCodigo);
      toast("Actualizado. Reiniciando...");
      agregarLog("Nueva versión aplicada. Reiniciando...");
      sleep(700);
      engines.execScriptFile(rutaScript);
      engines.myEngine().forceStop();
    } catch (e) {
      toast("Sin actualización");
      agregarLog("Error al revisar actualización (sin cambios): " + e.message);
    }
  });
}

function normalizarHoraHHMM(texto) {
  var limpio = String(texto || "").trim();
  var partes = limpio.split(":");
  if (partes.length !== 2) return "20:00";
  var h = parseInt(partes[0], 10);
  var m = parseInt(partes[1], 10);
  if (isNaN(h) || h < 0 || h > 23) h = 20;
  if (isNaN(m) || m < 0 || m > 59) m = 0;
  return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
}

function segundosHastaHora(horaHHMM) {
  var normal = normalizarHoraHHMM(horaHHMM);
  var partes = normal.split(":");
  var targetH = parseInt(partes[0], 10);
  var targetM = parseInt(partes[1], 10);

  var ahora = new Date();
  var objetivo = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    targetH,
    targetM,
    0,
    0
  );

  return Math.floor((objetivo.getTime() - ahora.getTime()) / 1000);
}

function formatearContador(segs) {
  if (segs <= 0) {
    return "00h 00m 00s (Hora de registro)";
  }
  var hrs = Math.floor(segs / 3600);
  var mins = Math.floor((segs % 3600) / 60);
  var s = segs % 60;
  return (
    ("0" + hrs).slice(-2) + "h " +
    ("0" + mins).slice(-2) + "m " +
    ("0" + s).slice(-2) + "s"
  );
}

function formatearSoloDetectado(nombre, nivel) {
  var partes = [];
  if (nombre && String(nombre).trim()) {
    partes.push("PJ: " + String(nombre).trim());
  }
  if (nivel && String(nivel).trim()) {
    partes.push("Lv. " + String(nivel).trim());
  }
  return partes.length > 0 ? partes.join(" | ") : "SRO Macro Flotante";
}

function actualizarDeteccionPantallaUI(nombre, nivel) {
  statsSesion.personaje = nombre ? String(nombre).trim() : "";
  statsSesion.nivel = nivel ? String(nivel).trim() : "";
  var texto = formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel);

  ui.run(function () {
    if (ui.tv_char_info) ui.tv_char_info.setText(texto);
    if (ui.tv_ev_char_info) ui.tv_ev_char_info.setText(texto);
    if (floatWin && floatWin.tv_mini_char) {
      try {
        floatWin.tv_mini_char.setText(texto);
      } catch (e) {}
    }
  });
}

function actualizarInfoItemDetalladaUI(nombreItem, plusActual, cantidad) {
  var limpioNombre = (nombreItem && String(nombreItem).trim())
    ? String(nombreItem).trim()
    : (String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item");
  var limpioPlus = (plusActual && String(plusActual).trim())
    ? String(plusActual).trim()
    : "+0";
  var qtyNum = Math.max(0, parseInt(cantidad, 10) || 0);

  statsSesion.itemDetectado = limpioNombre;
  statsSesion.plusActual = limpioPlus;
  statsSesion.cantidadMismoItem = qtyNum;
  statsSesion.descripcionItem = "Ítem: " + limpioNombre + " | Estado: " + limpioPlus;

  ui.run(function () {
    if (ui.tv_top_item) {
      ui.tv_top_item.setText(statsSesion.descripcionItem + " | Detec: " + qtyNum);
    }
    if (floatWin && floatWin.tv_mini_info) {
      try {
        floatWin.tv_mini_info.setText(limpioNombre + " [" + limpioPlus + "]");
      } catch (e) {}
    }
  });
}

function obtenerCandidatosMenuPergamino() {
  return ["pergamino", "scroll", "menu", "Menu", "btn_menu"];
}

function obtenerCandidatosElixir(elixirKey) {
  if (elixirKey === "accessory") return ["elixir_acceaorio", "elixir_accessory"];
  return ["elixir_" + elixirKey];
}

function obtenerCandidatosLucky(luckyDegree) {
  return ["Lucky_Power_" + luckyDegree, "lucky_" + luckyDegree];
}

function localizarArchivoPlantilla(dir, nombreBase) {
  var base = dir || resolverCarpetaImagenes();
  if (!base.endsWith("/")) base += "/";
  var png = base + nombreBase + ".png";
  if (files.exists(png)) return png;
  var jpg = base + nombreBase + ".jpg";
  if (files.exists(jpg)) return jpg;
  return null;
}

function escanearPantallaCompleta(cfg) {
  cfg.dir = sincronizarCarpetaImagenes(resolverCarpetaImagenes(), false);
  var resultado = {
    carpetaUsada: cfg.dir,
    menuHit: null,
    elixiresPorTipo: {
      weapon: 0,
      shield: 0,
      protector: 0,
      accessory: 0,
      special: 0
    },
    luckyTotal: 0,
    plantillasEncontradas: []
  };

  try {
    var screen = captureScreen();
    if (!screen) {
      agregarLog("Escaneo total: no se pudo obtener captura de pantalla");
      return resultado;
    }

    var umbralEscaneo = Math.max(0.40, Math.min(cfg.threshold, 0.62));

    var menuCandidatos = obtenerCandidatosMenuPergamino();
    for (var m = 0; m < menuCandidatos.length; m++) {
      var rutaMenu = localizarArchivoPlantilla(cfg.dir, menuCandidatos[m]);
      if (!rutaMenu) continue;
      var tplMenu = images.read(rutaMenu);
      if (!tplMenu) continue;
      var hitMenu = buscarImagenEscalada(screen, tplMenu, umbralEscaneo);
      tplMenu.recycle();
      if (hitMenu) {
        resultado.menuHit = { x: hitMenu.x, y: hitMenu.y, name: menuCandidatos[m] };
        resultado.plantillasEncontradas.push(menuCandidatos[m] + "(" + hitMenu.x + "," + hitMenu.y + ")");
        break;
      }
    }

    for (var eIdx = 0; eIdx < ELIXIR_OPCIONES.length; eIdx++) {
      var tipoElixir = ELIXIR_OPCIONES[eIdx];
      var candsElixir = obtenerCandidatosElixir(tipoElixir.key);
      var cuentaTipo = 0;

      for (var c = 0; c < candsElixir.length; c++) {
        var rutaElixir = localizarArchivoPlantilla(cfg.dir, candsElixir[c]);
        if (!rutaElixir) continue;
        var ptsElixir = encontrarPuntosPlantilla(screen, rutaElixir, umbralEscaneo);
        if (ptsElixir.length > 0) {
          cuentaTipo += ptsElixir.length;
          resultado.plantillasEncontradas.push(candsElixir[c] + " x" + ptsElixir.length);
        }
      }
      resultado.elixiresPorTipo[tipoElixir.key] = cuentaTipo;
    }

    var candsLucky = obtenerCandidatosLucky(cfg.luckyDegree);
    for (var l = 0; l < candsLucky.length; l++) {
      var rutaLucky = localizarArchivoPlantilla(cfg.dir, candsLucky[l]);
      if (!rutaLucky) continue;
      var ptsLucky = encontrarPuntosPlantilla(screen, rutaLucky, umbralEscaneo);
      if (ptsLucky.length > 0) {
        resultado.luckyTotal += ptsLucky.length;
        resultado.plantillasEncontradas.push(candsLucky[l] + " x" + ptsLucky.length);
      }
    }

    var extras = ["alchemy", "Alchemy", "Fuse", "fuse"];
    for (var ex = 0; ex < extras.length; ex++) {
      var rutaEx = localizarArchivoPlantilla(cfg.dir, extras[ex]);
      if (!rutaEx) continue;
      var tplEx = images.read(rutaEx);
      if (!tplEx) continue;
      var hitEx = buscarImagenEscalada(screen, tplEx, umbralEscaneo);
      tplEx.recycle();
      if (hitEx) {
        resultado.plantillasEncontradas.push(extras[ex] + "(" + hitEx.x + "," + hitEx.y + ")");
      }
    }

    ultimoEscaneoPantalla = resultado;

    var elixirSeleccionadoCant = resultado.elixiresPorTipo[cfg.elixirKey] || 0;
    var finalElixir = elixirSeleccionadoCant > 0 ? elixirSeleccionadoCant : cfg.elixirQty;
    var finalLucky = resultado.luckyTotal > 0 ? resultado.luckyTotal : cfg.luckyQty;

    actualizarContadoresUI(finalElixir, finalLucky);

    var resumenElixires =
      "W:" + resultado.elixiresPorTipo.weapon +
      " S:" + resultado.elixiresPorTipo.shield +
      " P:" + resultado.elixiresPorTipo.protector +
      " A:" + resultado.elixiresPorTipo.accessory +
      " Sp:" + resultado.elixiresPorTipo.special;

    agregarLog(
      "Carpeta imágenes: " + cfg.dir +
      " | Pergamino/Menú: " +
      (resultado.menuHit ? resultado.menuHit.name + ".png @ (" + resultado.menuHit.x + "," + resultado.menuHit.y + ")" : "No detectado") +
      " | Elixires [" + resumenElixires + "] | Lucky: " + resultado.luckyTotal
    );

    if (resultado.plantillasEncontradas.length > 0) {
      agregarLog("Imágenes identificadas: " + resultado.plantillasEncontradas.join(", "));
    } else {
      agregarLog("Ninguna plantilla coincidió en " + cfg.dir);
    }
  } catch (err) {
    agregarLog("Error en escaneo total: " + err.message);
  }

  return resultado;
}

function autoDetectarCantidadesEnPantalla(cfg) {
  var escaneo = escanearPantallaCompleta(cfg);
  var elixirDetectado = escaneo.elixiresPorTipo[cfg.elixirKey] || cfg.elixirQty || 0;
  var luckyDetectado = escaneo.luckyTotal || cfg.luckyQty || 0;
  actualizarContadoresUI(elixirDetectado, luckyDetectado);
  return { elixir: elixirDetectado, lucky: luckyDetectado };
}

function renderizarListaItensDetecUI() {
  if (vistaActual !== "alchemy" || !ui.container_itens_detec) return;

  ui.run(function () {
    ui.container_itens_detec.removeAllViews();

    if (!colaItensDetec || colaItensDetec.length === 0) {
      var vacio = ui.inflate(
        <text text="Sin ítems detectados aún. Coloca el arma y toca Escanear." textSize="11sp" textColor="#9CA3AF" padding="4" />
      );
      ui.container_itens_detec.addView(vacio);
      return;
    }

    for (var i = 0; i < colaItensDetec.length; i++) {
      (function (idx) {
        var entry = colaItensDetec[idx];
        var fila = ui.inflate(
          <horizontal gravity="center_vertical" bg="#1F2937" padding="6" marginBottom="4">
            <checkbox id="cb_item_sel" checked={Boolean(entry.selected)} textColor="#FFFFFF" textSize="11sp" layout_weight="1" />
            <spinner id="sp_item_meta" entries="+1|+2|+3|+4|+5|+6|+7|+8|+9|+10|+11|+12|+13|+14|+15" bg="#111827" />
          </horizontal>
        );

        var etiquetaFila = entry.nombre + " " + entry.plusActual + " #" + (idx + 1);
        fila.cb_item_sel.setText(etiquetaFila);

        var metaIdx = PLUS_OPCIONES.indexOf(entry.plusObjetivo || "+2");
        if (metaIdx < 0) metaIdx = 1;
        fila.sp_item_meta.setSelection(metaIdx);

        fila.cb_item_sel.setOnCheckedChangeListener(function (_, isChecked) {
          colaItensDetec[idx].selected = Boolean(isChecked);
        });

        fila.sp_item_meta.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener({
          onItemSelected: function (_, __, pos) {
            var chosen = PLUS_OPCIONES[pos] || "+2";
            colaItensDetec[idx].plusObjetivo = chosen;
            colaItensDetec[idx].metaNumero = parseInt(chosen.replace("+", ""), 10) || 2;
          },
          onNothingSelected: function () {}
        }));

        ui.container_itens_detec.addView(fila);
      })(i);
    }
  });
}

function leerSoloLoVistoEnPantalla(cfg) {
  var nombreVisto = "";
  var nivelVisto = "";

  try {
    var screen = captureScreen();
    var vioLvImg = screen ? (buscarEnCaptura(screen, cfg, ["lv"]) != null) : false;
    var vioNombreImg = screen ? (buscarEnCaptura(screen, cfg, ["nombre"]) != null) : false;

    if (vioLvImg) nivelVisto = "Lv";
    if (vioNombreImg) nombreVisto = "Detectado";
  } catch (e) {}

  return { personaje: nombreVisto, nivel: nivelVisto };
}

function esperarCuentaEnJuego(cfg) {
  var visto = leerSoloLoVistoEnPantalla(cfg);
  if (visto.personaje || visto.nivel) {
    actualizarDeteccionPantallaUI(visto.personaje, visto.nivel);
  }
  return true;
}

function actualizarContadorYAutoActivar() {
  var horaProg = normalizarHoraHHMM(prefs.get("evHora", "20:00"));
  var segs = segundosHastaHora(horaProg);
  var texto = "Guild Boss (" + horaProg + "): " + formatearContador(segs);

  ui.run(function () {
    if (vistaActual === "eventos" && ui.tv_ev_countdown) {
      ui.tv_ev_countdown.setText(texto);
    }
  });

  var ahora = new Date();
  var claveDisparo =
    ahora.getFullYear() + "-" +
    (ahora.getMonth() + 1) + "-" +
    ahora.getDate() + " " +
    horaProg;

  if (segs === 0 && (!running || !alchemyActiva) && disparoAutoHora !== claveDisparo) {
    disparoAutoHora = claveDisparo;
    alchemyActiva = false;
    agregarLog("Activación automática de Guild Boss (" + horaProg + ")");
    var cfgEv = leerConfigEventos();
    cfgEv.modo = "Eventos";
    running = true;
    paused = false;
    threads.start(function () {
      try {
        prepararEntornoYPermisos(cfgEv);
        esperarCuentaEnJuego(cfgEv);
        ejecutarEventos(cfgEv);
      } catch (err) {
        agregarLog("Error en Eventos automático: " + err.message);
      }
    });
  }
}

function iniciarRelojContador() {
  if (contadorThread && contadorThread.isAlive()) return;
  contadorThread = threads.start(function () {
    while (true) {
      actualizarContadorYAutoActivar();
      sleep(1000);
    }
  });
}

function tieneAccesibilidad() {
  return auto.service != null;
}

function tieneSuperposicion() {
  try {
    return Boolean(floaty.checkPermission());
  } catch (e) {
    return false;
  }
}

function abrirAjusteAccesibilidad() {
  toast("Activa Accesibilidad para AutoJs6");
  try {
    app.startActivity({ action: "android.settings.ACCESSIBILITY_SETTINGS" });
  } catch (e) {}
}

function abrirAjusteSuperposicion() {
  try {
    floaty.requestPermission();
  } catch (e) {}
}

function refrescarEstadoPermisos() {
  var acc = tieneAccesibilidad();
  var ovl = tieneSuperposicion();
  var msg = "Accesibilidad: " + (acc ? "OK" : "Falta") + " | Flotante: " + (ovl ? "OK" : "Falta");
  ui.run(function () {
    if (ui.tv_perms) ui.tv_perms.setText(msg);
    if (ui.tv_ev_perms) ui.tv_ev_perms.setText(msg);
  });
  return acc && ovl;
}

function prepararEntornoYPermisos(cfg) {
  cfg.dir = sincronizarCarpetaImagenes(resolverCarpetaImagenes(), false);

  if (!tieneAccesibilidad()) {
    ui.run(function () { abrirAjusteAccesibilidad(); });
    for (var w = 0; w < 20 && !tieneAccesibilidad() && running; w++) {
      sleep(500);
    }
    if (!tieneAccesibilidad()) {
      detenerMacro("Activa Accesibilidad y vuelve a tocar INICIAR");
      return false;
    }
  }

  if (!tieneSuperposicion()) {
    ui.run(function () { abrirAjusteSuperposicion(); });
    for (var s = 0; s < 16 && !tieneSuperposicion() && running; s++) {
      sleep(500);
    }
  }

  if (!capturaLista) {
    try {
      var capOk = requestScreenCapture();
      if (capOk) {
        capturaLista = true;
      } else {
        detenerMacro("Permite la captura de pantalla para continuar");
        return false;
      }
    } catch (e) {
      detenerMacro("Error captura: " + e.message);
      return false;
    }
  }

  refrescarEstadoPermisos();
  return true;
}

function setEstado(texto) {
  ui.run(function () {
    if (ui.tv_status) ui.tv_status.setText("Estado: " + texto);
    if (ui.tv_ev_status) ui.tv_ev_status.setText("Estado: " + texto);
    if (floatWin && floatWin.tv_mini_status) {
      try {
        floatWin.tv_mini_status.setText(texto);
      } catch (e) {}
    }
  });
}

function actualizarContadoresUI(elixirRest, luckyRest) {
  ui.run(function () {
    if (vistaActual === "alchemy" && ui.et_elixir_qty && ui.et_lucky_qty) {
      ui.et_elixir_qty.setText(String(elixirRest));
      ui.et_lucky_qty.setText(String(luckyRest));
    }
  });
  prefs.put("elixirQty", elixirRest);
  prefs.put("luckyQty", luckyRest);
}

function mostrarVentanaLog() {
  var elx = ultimoEscaneoPantalla.elixiresPorTipo;
  var resumenEscaneo =
    "Carpeta: " + (ultimoEscaneoPantalla.carpetaUsada || resolverCarpetaImagenes()) + "\n" +
    "Pergamino/Menú: " +
    (ultimoEscaneoPantalla.menuHit ? ultimoEscaneoPantalla.menuHit.name + ".png" : "No") +
    " | Elixires [W:" + elx.weapon + " S:" + elx.shield + " P:" + elx.protector + " A:" + elx.accessory + " Sp:" + elx.special + "]";

  var resumenStats =
    resumenEscaneo + "\n" +
    "Pantalla: " + formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel) + "\n" +
    statsSesion.descripcionItem + " | Detec: " + statsSesion.cantidadMismoItem + "\n" +
    "Modo: " + statsSesion.modo + " | Intentos: " + statsSesion.intentos + " | Fallos: " + statsSesion.fallos + "\n" +
    "Roto: " + (statsSesion.roto ? "SÍ" : "NO") +
    " | Sin Elixir: " + (statsSesion.sinElixir ? "SÍ" : "NO") +
    " | Sin Lucky: " + (statsSesion.sinLucky ? "SÍ" : "NO") +
    " | Meta: " + (statsSesion.metaAlcanzada ? "SÍ" : "NO");

  var detalle = logsHistorial.length > 0
    ? logsHistorial.slice().reverse().join("\n")
    : "Aún no hay registros en esta sesión.";

  dialogs.build({
    title: "Registro de Actividad SRO",
    content: resumenStats + "\n------------------------------\n" + detalle,
    positive: "Cerrar",
    neutral: "Limpiar LOG"
  }).on("neutral", function () {
    logsHistorial = [];
    reiniciarStats("Alchemy");
    toast("LOG limpiado");
  }).show();
}

function cargarUIAlchemy() {
  var itemName = prefs.get("itemName", "");
  var plusIdx = prefs.get("plusIdx", 5);
  var elixirIdx = prefs.get("elixirIdx", 0);
  var luckyDegIdx = prefs.get("luckyDegIdx", 0);

  if (plusIdx < 0 || plusIdx >= PLUS_OPCIONES.length) plusIdx = 5;
  if (elixirIdx < 0 || elixirIdx >= ELIXIR_OPCIONES.length) elixirIdx = 0;
  if (luckyDegIdx < 0 || luckyDegIdx >= LUCKY_DEGREES.length) luckyDegIdx = 0;

  actualizarDeteccionPantallaUI(statsSesion.personaje, statsSesion.nivel);

  ui.et_item_name.setText(String(itemName));
  actualizarInfoItemDetalladaUI(
    itemName || statsSesion.itemDetectado,
    statsSesion.plusActual,
    colaItensDetec.length
  );

  ui.sp_plus.setSelection(plusIdx);
  ui.sp_elixir.setSelection(elixirIdx);
  ui.sp_lucky_deg.setSelection(luckyDegIdx);

  ui.et_elixir_qty.setText(String(prefs.get("elixirQty", 0)));
  ui.et_lucky_qty.setText(String(prefs.get("luckyQty", 0)));
  ui.cb_use_lucky.setChecked(Boolean(prefs.get("useLucky", true)));
  ui.cb_use_confirm.setChecked(Boolean(prefs.get("useConfirm", false)));

  ui.et_threshold.setText(String(prefs.get("threshold", 0.58)));
  ui.et_max_tries.setText(String(prefs.get("maxTries", 300)));
  ui.et_delay_tap.setText(String(prefs.get("delayTap", 550)));
  ui.et_delay_res.setText(String(prefs.get("delayRes", 2600)));

  renderizarListaItensDetecUI();
}

function leerConfigAlchemy() {
  var itemNameRaw = String(ui.et_item_name.text() || "").trim();
  var itemName = itemNameRaw || statsSesion.itemDetectado || "Item";
  actualizarInfoItemDetalladaUI(itemName, statsSesion.plusActual, colaItensDetec.length);

  var plusIdx = ui.sp_plus.getSelectedItemPosition();
  var elixirIdx = ui.sp_elixir.getSelectedItemPosition();
  var luckyDegIdx = ui.sp_lucky_deg.getSelectedItemPosition();

  var plusTexto = PLUS_OPCIONES[plusIdx] || "+6";
  var plusNumero = parseInt(plusTexto.replace("+", ""), 10) || 6;
  var elixirObj = ELIXIR_OPCIONES[elixirIdx] || ELIXIR_OPCIONES[0];
  var luckyDegTexto = LUCKY_DEGREES[luckyDegIdx] || "1th";

  var th = parseFloat(ui.et_threshold.text());
  if (isNaN(th) || th < 0.35 || th > 0.99) th = 0.58;

  var cfg = {
    modo: "Alchemy",
    itemName: itemName,
    evName: "Guild Boss",
    evHora: normalizarHoraHHMM(prefs.get("evHora", "20:00")),
    evCycles: 3,
    evWait: 1200,
    plusIdx: plusIdx,
    plusTexto: plusTexto,
    plusNumero: plusNumero,
    elixirIdx: elixirIdx,
    elixirLabel: elixirObj.label,
    elixirKey: elixirObj.key,
    luckyDegIdx: luckyDegIdx,
    luckyDegree: luckyDegTexto,
    elixirQty: Math.max(0, parseInt(ui.et_elixir_qty.text(), 10) || 0),
    luckyQty: Math.max(0, parseInt(ui.et_lucky_qty.text(), 10) || 0),
    useLucky: ui.cb_use_lucky.isChecked(),
    useConfirm: ui.cb_use_confirm.isChecked(),
    threshold: th,
    maxTries: Math.max(1, parseInt(ui.et_max_tries.text(), 10) || 300),
    delayTap: Math.max(150, parseInt(ui.et_delay_tap.text(), 10) || 550),
    delayRes: Math.max(500, parseInt(ui.et_delay_res.text(), 10) || 2600),
    dir: resolverCarpetaImagenes()
  };

  prefs.put("itemName", itemNameRaw);
  prefs.put("plusIdx", cfg.plusIdx);
  prefs.put("elixirIdx", cfg.elixirIdx);
  prefs.put("luckyDegIdx", cfg.luckyDegIdx);
  prefs.put("elixirQty", cfg.elixirQty);
  prefs.put("luckyQty", cfg.luckyQty);
  prefs.put("useLucky", cfg.useLucky);
  prefs.put("useConfirm", cfg.useConfirm);
  prefs.put("threshold", cfg.threshold);
  prefs.put("maxTries", cfg.maxTries);
  prefs.put("delayTap", cfg.delayTap);
  prefs.put("delayRes", cfg.delayRes);

  return cfg;
}

function leerConfigDesdePrefs() {
  var plusIdx = prefs.get("plusIdx", 5);
  var plusTexto = PLUS_OPCIONES[plusIdx] || "+6";
  var elixirIdx = prefs.get("elixirIdx", 0);
  var elixirObj = ELIXIR_OPCIONES[elixirIdx] || ELIXIR_OPCIONES[0];
  var luckyDegIdx = prefs.get("luckyDegIdx", 0);
  var th = parseFloat(prefs.get("threshold", 0.58));
  if (isNaN(th) || th < 0.35 || th > 0.99) th = 0.58;

  return {
    modo: "Alchemy",
    itemName: String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item",
    evName: "Guild Boss",
    evHora: normalizarHoraHHMM(prefs.get("evHora", "20:00")),
    evCycles: 3,
    evWait: 1200,
    plusIdx: plusIdx,
    plusTexto: plusTexto,
    plusNumero: parseInt(plusTexto.replace("+", ""), 10) || 6,
    elixirIdx: elixirIdx,
    elixirLabel: elixirObj.label,
    elixirKey: elixirObj.key,
    luckyDegIdx: luckyDegIdx,
    luckyDegree: LUCKY_DEGREES[luckyDegIdx] || "1th",
    elixirQty: Math.max(0, parseInt(prefs.get("elixirQty", 0), 10) || 0),
    luckyQty: Math.max(0, parseInt(prefs.get("luckyQty", 0), 10) || 0),
    useLucky: Boolean(prefs.get("useLucky", true)),
    useConfirm: Boolean(prefs.get("useConfirm", false)),
    threshold: th,
    maxTries: Math.max(1, parseInt(prefs.get("maxTries", 300), 10) || 300),
    delayTap: Math.max(150, parseInt(prefs.get("delayTap", 550), 10) || 550),
    delayRes: Math.max(500, parseInt(prefs.get("delayRes", 2600), 10) || 2600),
    dir: resolverCarpetaImagenes()
  };
}

function leerConfigEventos() {
  var base = leerConfigDesdePrefs();
  var evHora = normalizarHoraHHMM(ui.et_ev_hora ? ui.et_ev_hora.text() : base.evHora);
  if (ui.et_ev_hora) ui.et_ev_hora.setText(evHora);
  prefs.put("evName", "Guild Boss");
  prefs.put("evHora", evHora);
  base.modo = "Eventos";
  base.evHora = evHora;
  return base;
}

function tocarFuseEnJuegoDirecto() {
  var cfg = (vistaActual === "alchemy" && ui.et_threshold) ? leerConfigAlchemy() : leerConfigDesdePrefs();
  cfg.modo = "Alchemy";
  threads.start(function () {
    try {
      if (!prepararEntornoYPermisos(cfg)) return;
      var prevRunning = running;
      var prevActiva = alchemyActiva;
      var prevPaused = paused;
      running = true;
      alchemyActiva = true;
      paused = false;

      var ok = detectarYTocar(cfg, ["Fuse", "fuse"], "Fuse.png", cfg.delayTap);

      running = prevRunning;
      alchemyActiva = prevActiva;
      paused = prevPaused;

      if (ok) {
        agregarLog("FUSE: tocado dentro del juego");
        toast("Fuse ejecutado");
      } else {
        agregarLog("FUSE: no se encontró Fuse.png en " + cfg.dir);
        toast("No se encontró Fuse.png en pantalla");
      }
    } catch (err) {
      agregarLog("Error al buscar Fuse en juego: " + err.message);
    }
  });
}

function abrirJobSroPrueba() {
  var miPaquete = "";
  try {
    miPaquete = String(context.getPackageName() || "");
  } catch (e) {}

  function esAppPropia(pkg) {
    if (!pkg) return true;
    var p = String(pkg).toLowerCase();
    return p === miPaquete.toLowerCase() || p.indexOf("autojs") !== -1 || p.indexOf("silkroad_alchemy_macro") !== -1;
  }

  function esJobSro(label, pkg) {
    var l = String(label || "").toLowerCase().trim();
    var p = String(pkg || "").toLowerCase().trim();
    return (
      l === "job sro" ||
      l === "jobsro" ||
      l.indexOf("job sro") !== -1 ||
      l.indexOf("jobsro") !== -1 ||
      p.indexOf("jobsro") !== -1 ||
      p.indexOf("job_sro") !== -1 ||
      p.indexOf("job.sro") !== -1
    );
  }

  var nombresJobSro = ["JOB SRO", "Job SRO", "Job Sro", "JobSro"];
  for (var i = 0; i < nombresJobSro.length; i++) {
    try {
      if (app.launchApp(nombresJobSro[i])) {
        var msgOk = "Abriendo aplicación " + nombresJobSro[i];
        agregarLog(msgOk);
        setEstado(msgOk);
        toast(msgOk);
        return true;
      }
    } catch (e) {}
  }

  try {
    var pm = context.getPackageManager();
    var mainIntent = new android.content.Intent(android.content.Intent.ACTION_MAIN, null);
    mainIntent.addCategory(android.content.Intent.CATEGORY_LAUNCHER);
    var actividades = pm.queryIntentActivities(mainIntent, 0);

    for (var a = 0; a < actividades.size(); a++) {
      var act = actividades.get(a);
      var pkgAct = String(act.activityInfo.packageName || "");
      if (esAppPropia(pkgAct)) continue;

      var labelAct = String(act.loadLabel(pm) || "");
      if (esJobSro(labelAct, pkgAct)) {
        var intentAct = pm.getLaunchIntentForPackage(pkgAct);
        if (intentAct) {
          intentAct.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intentAct);
        } else {
          app.launch(pkgAct);
        }
        var msgAct = "Abriendo " + labelAct + " (" + pkgAct + ")";
        agregarLog(msgAct);
        setEstado(msgAct);
        toast(msgAct);
        return true;
      }
    }
  } catch (errAct) {
    agregarLog("Error consultando lanzadores para JOB SRO: " + errAct.message);
  }

  try {
    var pm2 = context.getPackageManager();
    var pkgs = pm2.getInstalledPackages(0);
    for (var j = 0; j < pkgs.size(); j++) {
      var p = pkgs.get(j);
      var pkgName = String(p.packageName || "");
      if (esAppPropia(pkgName)) continue;

      var label = String(p.applicationInfo.loadLabel(pm2) || "");
      if (esJobSro(label, pkgName)) {
        var intent = pm2.getLaunchIntentForPackage(pkgName);
        if (intent) {
          intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intent);
        } else {
          app.launch(pkgName);
        }
        var msgPkg = "Abriendo " + label + " (" + pkgName + ")";
        agregarLog(msgPkg);
        setEstado(msgPkg);
        toast(msgPkg);
        return true;
      }
    }
  } catch (err) {
    agregarLog("Error buscando paquete JOB SRO: " + err.message);
  }

  var msgNo = "No se encontró la app JOB SRO en el dispositivo.";
  agregarLog(msgNo);
  setEstado(msgNo);
  toast(msgNo);
  return false;
}

function iniciarProcesoAlchemy() {
  var cfg = (vistaActual === "alchemy" && ui.et_item_name) ? leerConfigAlchemy() : leerConfigDesdePrefs();
  cfg.modo = "Alchemy";
  running = true;
  alchemyActiva = true;
  paused = false;

  reiniciarStats("Alchemy");
  setEstado("Buscando JOB SRO...");
  agregarLog("Botón INICIAR pulsado -> buscando JOB SRO");
  toast("Buscando JOB SRO...");

  if (workerThread && workerThread.isAlive()) {
    try { workerThread.interrupt(); } catch (e) {}
  }

  workerThread = threads.start(function () {
    try {
      abrirJobSroPrueba();
    } catch (err) {
      detenerMacro("Error al abrir JOB SRO: " + err.message);
    }
  });
}

function mostrarVistaAlchemy() {
  vistaActual = "alchemy";
  var viewAlchemy = ui.inflate(
    <vertical padding="12" bg="#0A0C14">
      <horizontal gravity="center_vertical" marginBottom="6">
        <text text={"v" + VERSION_ACTUAL} textSize="11sp" textColor="#9CA3AF" layout_weight="1" />
        <button id="btn_float_open" text="FLOTANTE" textSize="10sp" bg="#7C3AED" textColor="#FFFFFF" h="32" padding="4" marginRight="4" />
        <button id="btn_update" text="ACTUALIZACIÓN" textSize="10sp" bg="#2563EB" textColor="#FFFFFF" h="32" padding="4" />
      </horizontal>

      <card cardCornerRadius="8dp" cardBackgroundColor="#1E1B18" strokeWidth="1dp" strokeColor="#D97706" marginBottom="8">
        <vertical padding="8">
          <text id="tv_char_info" text="SRO Macro Flotante" textSize="12sp" textColor="#10B981" textStyle="bold" />
          <text id="tv_top_item" text="Ítem: Item | Estado: +0 | Detec: 0" textSize="12sp" textColor="#FBBF24" textStyle="bold" marginTop="2" />
        </vertical>
      </card>

      <horizontal marginBottom="10">
        <text id="tv_perms" text="Permisos: ..." textSize="10sp" textColor="#9CA3AF" layout_weight="1" gravity="center_vertical" />
        <button id="btn_perms" text="Permisos" textSize="10sp" bg="#374151" textColor="#FFFFFF" h="34" padding="4" marginRight="4" />
        <button id="btn_go_eventos" text="EVENTOS" textSize="10sp" bg="#0284C7" textColor="#FFFFFF" h="34" padding="4" marginRight="4" />
        <button id="btn_log" text="LOG" textSize="10sp" bg="#7C3AED" textColor="#FFFFFF" h="34" padding="4" />
      </horizontal>

      <scroll layout_weight="1">
        <vertical>
          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#374155" marginBottom="10">
            <vertical padding="12">
              <horizontal gravity="center_vertical" marginBottom="8">
                <text text="CONFIGURACIÓN DE ALCHEMY" textSize="12sp" textColor="#F59E0B" textStyle="bold" layout_weight="1" />
                <button id="btn_fuse" text="FUSE" textSize="11sp" bg="#2563EB" textColor="#FFFFFF" textStyle="bold" h="34" padding="6" />
              </horizontal>

              <text text="Nombre del ítem detectado / filtro" textSize="11sp" textColor="#9CA3AF" marginBottom="2" />
              <input id="et_item_name" hint="Ej: Auriga Elegant Staff" textColor="#FFFFFF" textColorHint="#4B5563" bg="#1F2937" padding="8" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Plus Objetivo por defecto" textSize="11sp" textColor="#9CA3AF" />
                  <spinner id="sp_plus" entries="+1|+2|+3|+4|+5|+6|+7|+8|+9|+10|+11|+12|+13|+14|+15" bg="#1F2937" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Degree Lucky" textSize="11sp" textColor="#9CA3AF" />
                  <spinner id="sp_lucky_deg" entries="1th|2th|3th|4th|5th|6th|7th|8th" bg="#1F2937" />
                </vertical>
              </horizontal>

              <text text="Tipo de Elixir a colocar" textSize="11sp" textColor="#9CA3AF" marginBottom="2" />
              <spinner id="sp_elixir" entries="Weapon Elixir|Shield Elixir|Protector Elixir|Accessory Elixir|Astral / Immortal" bg="#1F2937" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Elixires Disp. (Auto)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_elixir_qty" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Lucky Disp. (Auto)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_lucky_qty" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
              </horizontal>

              <checkbox id="cb_use_lucky" text="Colocar automáticamente Lucky Powder del degree" textColor="#D1D5DB" marginBottom="2" />
              <checkbox id="cb_use_confirm" text="Tocar Confirmar si sale emergente" textColor="#D1D5DB" />
            </vertical>
          </card>

          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#D97706" marginBottom="10">
            <vertical padding="12">
              <horizontal gravity="center_vertical" marginBottom="6">
                <text text="Itens detec (mismo ícono/nombre)" textSize="13sp" textColor="#F59E0B" textStyle="bold" layout_weight="1" />
                <button id="btn_scan_itens" text="Escanear" textSize="10sp" bg="#D97706" textColor="#FFFFFF" h="32" padding="4" />
              </horizontal>
              <text text="Sincroniza plantillas desde GitHub, ubica carpeta de imágenes, identifica pergamino/elixires y arma la cola." textSize="11sp" textColor="#9CA3AF" marginBottom="6" />
              <vertical id="container_itens_detec" />
            </vertical>
          </card>

          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#374155" marginBottom="10">
            <vertical padding="12">
              <text text="TIEMPOS Y RECONOCIMIENTO VISUAL" textSize="14sp" textColor="#38BDF8" textStyle="bold" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Precisión (0.35-0.95)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_threshold
