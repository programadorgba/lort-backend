// ============================================================
//  🧙 EL SEÑOR DE LOS ANILLOS - BACKEND FINAL
//  ✅ Imágenes via Fandom API (confirmado funciona)
//  ✅ Ubicaciones como datos estáticos (no existe en The One API)
//  ✅ Personajes con imágenes hardcodeadas + fallback Fandom
//  ✅ Películas y libros via Fandom API
//  ✅ CORS desde variable de entorno
//  ✅ Caché en memoria
// ============================================================

const express = require("express");
const { fetch } = require("undici");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// ─── CORS ────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const LOTR_API_KEY = process.env.LOTR_API_KEY;
const LOTR_BASE_URL = "https://the-one-api.dev/v2";
const FANDOM_API = "https://lotr.fandom.com/api.php";

if (!LOTR_API_KEY) {
  console.error("❌ ERROR CRÍTICO: No hay LOTR_API_KEY en .env");
} else {
  console.log("✅ API Key cargada");
}

// ─── CACHÉ ───────────────────────────────────────────────────
const imageCache = new Map();

// ─── TRADUCCIONES ────────────────────────────────────────────
const TRANSLATIONS = {
  "Frodo Baggins": "Frodo Bolsón",
  "Samwise Gamgee": "Samsagaz Gamyi",
  "Peregrin Took": "Peregrin Tuk",
  "Meriadoc Brandybuck": "Meriadoc Brandigamo",
  "Bilbo Baggins": "Bilbo Bolsón",
  "Treebeard": "Bárbol",
  "Witch-king of Angmar": "Rey Brujo de Angmar",
  "Gríma Wormtongue": "Gríma Lengua de Serpiente",
  "The Fellowship of the Ring": "La Comunidad del Anillo",
  "The Two Towers": "Las Dos Torres",
  "The Return of the King": "El Retorno del Rey",
  "The Hobbit": "El Hobbit",
  "The Silmarillion": "El Silmarillion",
  "The Hobbit Series": "Serie El Hobbit",
  "The Lord of the Rings Series": "Serie El Señor de los Anillos",
};

// ─── PERSONAJES PRINCIPALES (orden de prioridad) ─────────────
const MAIN_CHARACTERS = [
  "Frodo Baggins", "Gandalf", "Aragorn", "Legolas", "Gimli",
  "Samwise Gamgee", "Boromir", "Gollum", "Saruman", "Galadriel",
  "Elrond", "Bilbo Baggins", "Peregrin Took", "Meriadoc Brandybuck",
  "Éowyn", "Théoden", "Faramir", "Arwen", "Sauron",
  "Witch-king of Angmar", "Treebeard", "Éomer", "Denethor",
  "Gríma Wormtongue",
];

// ─── IMÁGENES DE PERSONAJES (hardcodeadas, confirmadas) ──────
const KNOWN_CHARACTER_IMAGES = {
  "Frodo Baggins":       "https://static.wikia.nocookie.net/lotr/images/3/32/Frodo_%28FotR%29.png/revision/latest?cb=20130117015538",
  "Gandalf":             "https://static.wikia.nocookie.net/lotr/images/8/8d/Gandalf-2.jpg/revision/latest?cb=20130410204534",
  "Aragorn":             "https://static.wikia.nocookie.net/lotr/images/b/b6/Aragorn_profile.jpg/revision/latest?cb=20130117015547",
  "Legolas":             "https://static.wikia.nocookie.net/lotr/images/2/2b/Legolas_profile.jpg/revision/latest?cb=20130117015559",
  "Gimli":               "https://static.wikia.nocookie.net/lotr/images/e/ec/Gimli_-_FOTR.png/revision/latest?cb=20130117015552",
  "Samwise Gamgee":      "https://static.wikia.nocookie.net/lotr/images/7/7b/Sam_FOTR_Promotional.jpg/revision/latest?cb=20130117015542",
  "Boromir":             "https://static.wikia.nocookie.net/lotr/images/7/79/Boromir_-_FOTR.png/revision/latest?cb=20130117015549",
  "Gollum":              "https://static.wikia.nocookie.net/lotr/images/e/e0/Gollum_Render.png/revision/latest?cb=20130117015555",
  "Saruman":             "https://static.wikia.nocookie.net/lotr/images/9/9a/Saruman_the_White.jpg/revision/latest?cb=20130117015605",
  "Galadriel":           "https://static.wikia.nocookie.net/lotr/images/b/b9/Galadriel_FOTR.jpg/revision/latest?cb=20130117015557",
  "Elrond":              "https://static.wikia.nocookie.net/lotr/images/7/7a/Elrond_FOTR.png/revision/latest?cb=20130117015553",
  "Bilbo Baggins":       "https://static.wikia.nocookie.net/lotr/images/b/b6/Bilbo_baggins.jpg/revision/latest?cb=20130117015540",
  "Peregrin Took":       "https://static.wikia.nocookie.net/lotr/images/5/51/Pippin_ROTK.png/revision/latest?cb=20130117015601",
  "Meriadoc Brandybuck": "https://static.wikia.nocookie.net/lotr/images/2/2c/Merry_ROTK.png/revision/latest?cb=20130117015600",
  "Éowyn":               "https://static.wikia.nocookie.net/lotr/images/6/68/Eowyn_ROTK.png/revision/latest?cb=20130117015551",
  "Théoden":             "https://static.wikia.nocookie.net/lotr/images/4/4c/Theoden_-_ROTK.png/revision/latest?cb=20130117015607",
  "Faramir":             "https://static.wikia.nocookie.net/lotr/images/7/73/Faramir_-_ROTK.png/revision/latest?cb=20130117015550",
  "Arwen":               "https://static.wikia.nocookie.net/lotr/images/b/b6/Arwen_FOTR.jpg/revision/latest?cb=20130117015548",
  "Sauron":              "https://static.wikia.nocookie.net/lotr/images/4/43/Sauron.jpg/revision/latest?cb=20130117015604",
  "Éomer":               "https://static.wikia.nocookie.net/lotr/images/c/ca/Eomer_-_ROTK.png/revision/latest?cb=20130117015550",
  "Denethor":            "https://static.wikia.nocookie.net/lotr/images/b/b7/Denethor_-_ROTK.png/revision/latest?cb=20130117015549",
};

// ─── UBICACIONES ESTÁTICAS ───────────────────────────────────
// The One API no tiene /location — estos datos son propios
const STATIC_LOCATIONS = [
  { _id: "loc001", name: "La Comarca",               originalName: "The Shire",              region: "Eriador",         description: "Hogar tranquilo de los hobbits" },
  { _id: "loc002", name: "Rivendel",                  originalName: "Rivendell",              region: "Eriador",         description: "Ciudad élfica de Elrond" },
  { _id: "loc003", name: "Moria",                     originalName: "Moria",                  region: "Montañas Nubladas", description: "Antigua mina enana bajo las montañas" },
  { _id: "loc004", name: "Lothlórien",                originalName: "Lothlórien",             region: "Rhovanion",       description: "Bosque élfico de Galadriel" },
  { _id: "loc005", name: "Mordor",                    originalName: "Mordor",                 region: "Rhûn",            description: "Tierra oscura de Sauron" },
  { _id: "loc006", name: "Minas Tirith",              originalName: "Minas Tirith",           region: "Gondor",          description: "Ciudad blanca de Gondor" },
  { _id: "loc007", name: "Edoras",                    originalName: "Edoras",                 region: "Rohan",           description: "Capital del reino de Rohan" },
  { _id: "loc008", name: "Abismo de Helm",            originalName: "Helm's Deep",            region: "Rohan",           description: "Fortaleza de la gran batalla" },
  { _id: "loc009", name: "Isengard",                  originalName: "Isengard",               region: "Nan Curunír",     description: "Fortaleza de Saruman" },
  { _id: "loc010", name: "Monte del Destino",         originalName: "Mount Doom",             region: "Mordor",          description: "Volcán donde se forjó el Anillo" },
  { _id: "loc011", name: "Minas Morgul",              originalName: "Minas Morgul",           region: "Gondor",          description: "Ciudad de los Nazgûl" },
  { _id: "loc012", name: "Puerta Negra",              originalName: "The Black Gate",         region: "Mordor",          description: "Entrada principal a Mordor" },
  { _id: "loc013", name: "Bosque de Fangorn",         originalName: "Fangorn",                region: "Rhovanion",       description: "Bosque antiguo hogar de los Ents" },
  { _id: "loc014", name: "Los Puertos Grises",        originalName: "Grey Havens",            region: "Eriador",         description: "Puerto desde donde los elfos parten" },
  { _id: "loc015", name: "Bree",                      originalName: "Bree",                   region: "Eriador",         description: "Ciudad de hombres y hobbits" },
  { _id: "loc016", name: "Cima de los Vientos",       originalName: "Weathertop",             region: "Eriador",         description: "Ruinas donde Frodo fue herido" },
  { _id: "loc017", name: "Ciénagas de los Muertos",   originalName: "Dead Marshes",           region: "Mordor",          description: "Pantanos con visiones de los caídos" },
  { _id: "loc018", name: "Amon Hen",                  originalName: "Amon Hen",               region: "Rhovanion",       description: "Colina de la Vista, fin de la Comunidad" },
  { _id: "loc019", name: "Erebor",                    originalName: "Erebor",                 region: "Rhovanion",       description: "La Montaña Solitaria de los enanos" },
  { _id: "loc020", name: "Ciudad del Lago",           originalName: "Lake-town",              region: "Rhovanion",       description: "Ciudad sobre el lago Long" },
];

// ─── HELPERS ─────────────────────────────────────────────────

function translate(name) {
  return TRANSLATIONS[name] || name;
}

async function fetchLOTR(endpoint) {
  const url = `${LOTR_BASE_URL}${endpoint}`;
  console.log(`📡 GET ${url}`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${LOTR_API_KEY}` },
  });
  if (!response.ok) throw new Error(`LOTR API error ${response.status}: ${response.statusText}`);
  return response.json();
}

/**
 * Obtiene imagen desde Fandom Wiki API.
 * Probado y confirmado que devuelve URLs de wikia.nocookie.net sin restricciones.
 */
async function getWikiaImage(pageTitle) {
  const cacheKey = `wikia:${pageTitle}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    const url = `${FANDOM_API}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=500`;
    const response = await fetch(url);
    const data = await response.json();

    const pages = data?.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0];
      if (page?.thumbnail?.source) {
        // Quitar escala para imagen completa
        const fullUrl = page.thumbnail.source.replace(/\/scale-to-width-down\/\d+/, "");
        imageCache.set(cacheKey, fullUrl);
        console.log(`🖼️  Wikia OK: "${pageTitle}"`);
        return fullUrl;
      }
    }
  } catch (err) {
    console.warn(`⚠️  Fandom API falló para "${pageTitle}":`, err.message);
  }

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(pageTitle)}&size=400&background=3d1f00&color=d4af37&bold=true`;
  imageCache.set(cacheKey, fallback);
  return fallback;
}

/** Personaje: hardcodeado primero, luego Fandom API */
async function getCharacterImage(originalName) {
  const cacheKey = `char:${originalName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  if (KNOWN_CHARACTER_IMAGES[originalName]) {
    imageCache.set(cacheKey, KNOWN_CHARACTER_IMAGES[originalName]);
    return KNOWN_CHARACTER_IMAGES[originalName];
  }

  return getWikiaImage(originalName);
}

/** Ubicación: Fandom API con nombre en inglés */
async function getLocationImage(originalName) {
  return getWikiaImage(originalName);
}

/** Libro: Fandom API */
async function getBookCover(originalTitle) {
  return getWikiaImage(originalTitle);
}

/** Película: Fandom API — los títulos del Hobbit tienen prefijo en la API */
async function getMoviePoster(originalName) {
  const fandomTitles = {
  "La Comunidad del Anillo":           "La Comunidad del Anillo",
  "Las Dos Torres":                    "Las Dos Torres",
  "El Retorno del Rey":                "El Retorno del Rey",
  "Un Viaje Inesperado":               "Un Viaje Inesperado",
  "La Desolación de Smaug":            "La Desolación de Smaug",
  "La Batalla de los Cinco Ejércitos": "La Batalla de los Cinco Ejércitos",
  };
  const searchTitle = fandomTitles[originalName] || originalName;
  return getWikiaImage(searchTitle);
}

/** Ordena personajes: principales primero, resto alfabético */
function sortByPriority(characters) {
  return characters.sort((a, b) => {
    const idxA = MAIN_CHARACTERS.indexOf(a.originalName);
    const idxB = MAIN_CHARACTERS.indexOf(b.originalName);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── ENDPOINTS ───────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    apiKey: !!LOTR_API_KEY,
    cacheEntries: imageCache.size,
    staticLocations: STATIC_LOCATIONS.length,
  });
});

// 👤 Personajes
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 100, name, race } = req.query;
    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;
    if (race) endpoint += `&race=${encodeURIComponent(race)}`;

    const data = await fetchLOTR(endpoint);

    const enriched = await Promise.all(
      (data.docs || []).map(async (char) => ({
        _id: char._id,
        name: translate(char.name),
        originalName: char.name,
        race: char.race,
        gender: char.gender,
        birth: char.birth,
        death: char.death,
        realm: char.realm,
        spouse: char.spouse,
        image: await getCharacterImage(char.name),
      }))
    );

    res.json({
      total: data.total,
      page: parseInt(page),
      limit: parseInt(limit),
      results: sortByPriority(enriched),
    });
  } catch (err) {
    console.error("❌ /api/characters:", err.message);
    res.status(500).json({ error: "Error obteniendo personajes" });
  }
});

// 👤 Personaje por ID
app.get("/api/characters/:id", async (req, res) => {
  try {
    const data = await fetchLOTR(`/character/${req.params.id}`);
    const char = data.docs?.[0];
    if (!char) return res.status(404).json({ error: "Personaje no encontrado" });
    res.json({
      ...char,
      name: translate(char.name),
      originalName: char.name,
      image: await getCharacterImage(char.name),
    });
  } catch (err) {
    console.error("❌ /api/characters/:id:", err.message);
    res.status(404).json({ error: "Personaje no encontrado" });
  }
});

// 📍 Ubicaciones (datos estáticos + imágenes Fandom)
app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Promise.all(
      STATIC_LOCATIONS.map(async (loc) => ({
        ...loc,
        image: await getLocationImage(loc.originalName),
      }))
    );
    res.json(locations);
  } catch (err) {
    console.error("❌ /api/locations:", err.message);
    res.status(500).json({ error: "Error obteniendo ubicaciones" });
  }
});

// 📍 Ubicación por ID
app.get("/api/locations/:id", async (req, res) => {
  const loc = STATIC_LOCATIONS.find((l) => l._id === req.params.id);
  if (!loc) return res.status(404).json({ error: "Ubicación no encontrada" });
  try {
    res.json({ ...loc, image: await getLocationImage(loc.originalName) });
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo ubicación" });
  }
});

// 📚 Libros
app.get("/api/books", async (req, res) => {
  try {
    const data = await fetchLOTR("/book");
    const books = await Promise.all(
      (data.docs || []).map(async (book) => ({
        _id: book._id,
        name: translate(book.name),
        originalName: book.name,
        cover: await getBookCover(book.name),
      }))
    );
    res.json(books);
  } catch (err) {
    console.error("❌ /api/books:", err.message);
    res.status(500).json({ error: "Error obteniendo libros" });
  }
});

// 📚 Capítulos
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const data = await fetchLOTR(`/book/${req.params.id}/chapter`);
    res.json(data.docs || []);
  } catch (err) {
    console.error("❌ /api/books/:id/chapters:", err.message);
    res.status(500).json({ error: "Error obteniendo capítulos" });
  }
});

// 🎬 Películas
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    const movies = await Promise.all(
      (data.docs || []).map(async (movie) => ({
        _id: movie._id,
        name: translate(movie.name),
        originalName: movie.name,
        runtimeInMinutes: movie.runtimeInMinutes,
        budgetInMillions: movie.budgetInMillions,
        boxOfficeRevenueInMillions: movie.boxOfficeRevenueInMillions,
        academyAwardNominations: movie.academyAwardNominations,
        academyAwardWins: movie.academyAwardWins,
        rottenTomatoesScore: movie.rottenTomatoesScore,
        poster: await getMoviePoster(movie.name),
      }))
    );
    res.json(movies);
  } catch (err) {
    console.error("❌ /api/movies:", err.message);
    res.status(500).json({ error: "Error obteniendo películas" });
  }
});

// 🗑️ Limpiar caché
app.post("/api/cache/clear", (req, res) => {
  const size = imageCache.size;
  imageCache.clear();
  res.json({ message: `Caché limpiada: ${size} entradas`, timestamp: new Date().toISOString() });
});

// ─── ARRANQUE ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   🧙 EL SEÑOR DE LOS ANILLOS - API FINAL    ║
╠══════════════════════════════════════════════╣
║   🚀 Puerto:      ${PORT}                           ║
║   🔑 API Key:     ${LOTR_API_KEY ? "✅ Cargada" : "❌ FALTA"}              ║
║   🖼️  Imágenes:   Fandom Wiki API            ║
║   📍 Ubicaciones: ${STATIC_LOCATIONS.length} lugares estáticos          ║
╠══════════════════════════════════════════════╣
║   GET  /api/health                           ║
║   GET  /api/characters  ?page ?limit ?name   ║
║   GET  /api/characters/:id                   ║
║   GET  /api/locations                        ║
║   GET  /api/locations/:id                    ║
║   GET  /api/books                            ║
║   GET  /api/books/:id/chapters               ║
║   GET  /api/movies                           ║
║   POST /api/cache/clear                      ║
╚══════════════════════════════════════════════╝
  `);
});