// ============================================================
//  🧙 EL SEÑOR DE LOS ANILLOS - BACKEND FINAL
//  ✅ Imágenes via Fandom API (confirmado funciona)
//  ✅ Ubicaciones como datos estáticos (no existe en The One API)
//  ✅ Personajes con imágenes hardcodeadas + fallback Fandom
//  ✅ Películas y libros via Fandom API
//  ✅ CORS desde variable de entorno
//  ✅ Caché en memoria
//  ✅ Promise.all en lotes de 10 para evitar timeout
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
  // ✅ FIX Bug 1: Añadidas traducciones de películas del Hobbit
  "The Hobbit: An Unexpected Journey": "Un Viaje Inesperado",
  "The Hobbit: The Desolation of Smaug": "La Desolación de Smaug",
  "The Hobbit: The Battle of the Five Armies": "La Batalla de los Cinco Ejércitos",
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
// ✅ Imágenes via ui-avatars como fallback garantizado + Wikia donde funciona
const KNOWN_CHARACTER_IMAGES = {
  "Frodo Baggins":       "https://lotr.fandom.com/wiki/Frodo_Baggins?file=Frodo_%28FotR%29.png",
  "Gandalf":             "https://lotr.fandom.com/wiki/Gandalf?file=Gandalf%3B_The_White.jpg#Third_Age",
  "Aragorn":             "https://lotr.fandom.com/wiki/Aragorn_II?file=King_Aragorn.PNG",
  "Legolas":             "https://ui-avatars.com/api/?name=Legolas&size=400&background=5b8a3c&color=fff&bold=true",
  "Gimli":               "https://ui-avatars.com/api/?name=Gimli&size=400&background=8B4513&color=fff&bold=true",
  "Samwise Gamgee":      "https://ui-avatars.com/api/?name=Samwise+Gamgee&size=400&background=8B7355&color=fff&bold=true",
  "Boromir":             "https://ui-avatars.com/api/?name=Boromir&size=400&background=4a2c0a&color=fff&bold=true",
  "Gollum":              "https://ui-avatars.com/api/?name=Gollum&size=400&background=5a6e4a&color=fff&bold=true",
  "Saruman":             "https://ui-avatars.com/api/?name=Saruman&size=400&background=ffffff&color=333&bold=true",
  "Galadriel":           "https://ui-avatars.com/api/?name=Galadriel&size=400&background=d4af37&color=fff&bold=true",
  "Elrond":              "https://ui-avatars.com/api/?name=Elrond&size=400&background=3a5a8a&color=fff&bold=true",
  "Bilbo Baggins":       "https://ui-avatars.com/api/?name=Bilbo+Baggins&size=400&background=8B7355&color=fff&bold=true",
  "Peregrin Took":       "https://ui-avatars.com/api/?name=Pippin+Took&size=400&background=8B7355&color=fff&bold=true",
  "Meriadoc Brandybuck": "https://ui-avatars.com/api/?name=Merry+Brandybuck&size=400&background=8B7355&color=fff&bold=true",
  "Éowyn":               "https://ui-avatars.com/api/?name=Eowyn&size=400&background=c4a35a&color=fff&bold=true",
  "Théoden":             "https://ui-avatars.com/api/?name=Theoden&size=400&background=7a5c2e&color=fff&bold=true",
  "Faramir":             "https://ui-avatars.com/api/?name=Faramir&size=400&background=2c4a1e&color=fff&bold=true",
  "Arwen":               "https://ui-avatars.com/api/?name=Arwen&size=400&background=6a2c8a&color=fff&bold=true",
  "Sauron":              "https://ui-avatars.com/api/?name=Sauron&size=400&background=1a0a00&color=ff4500&bold=true",
  "Witch-king of Angmar":"https://ui-avatars.com/api/?name=Witch+King&size=400&background=0a0a0a&color=888&bold=true",
  "Treebeard":           "https://ui-avatars.com/api/?name=Treebeard&size=400&background=3a5a1a&color=fff&bold=true",
  "Éomer":               "https://ui-avatars.com/api/?name=Eomer&size=400&background=7a5c2e&color=fff&bold=true",
  "Denethor":            "https://ui-avatars.com/api/?name=Denethor&size=400&background=2a2a2a&color=fff&bold=true",
  "Gríma Wormtongue":    "https://ui-avatars.com/api/?name=Grima&size=400&background=1a1a2e&color=888&bold=true",
};

// ─── UBICACIONES ESTÁTICAS ───────────────────────────────────
const STATIC_LOCATIONS = [
  { _id: "loc001", name: "La Comarca",               originalName: "The Shire",              region: "Eriador",           description: "Hogar tranquilo de los hobbits" },
  { _id: "loc002", name: "Rivendel",                  originalName: "Rivendell",              region: "Eriador",           description: "Ciudad élfica de Elrond" },
  { _id: "loc003", name: "Moria",                     originalName: "Moria",                  region: "Montañas Nubladas", description: "Antigua mina enana bajo las montañas" },
  { _id: "loc004", name: "Lothlórien",                originalName: "Lothlórien",             region: "Rhovanion",         description: "Bosque élfico de Galadriel" },
  { _id: "loc005", name: "Mordor",                    originalName: "Mordor",                 region: "Rhûn",              description: "Tierra oscura de Sauron" },
  { _id: "loc006", name: "Minas Tirith",              originalName: "Minas Tirith",           region: "Gondor",            description: "Ciudad blanca de Gondor" },
  { _id: "loc007", name: "Edoras",                    originalName: "Edoras",                 region: "Rohan",             description: "Capital del reino de Rohan" },
  { _id: "loc008", name: "Abismo de Helm",            originalName: "Helm's Deep",            region: "Rohan",             description: "Fortaleza de la gran batalla" },
  { _id: "loc009", name: "Isengard",                  originalName: "Isengard",               region: "Nan Curunír",       description: "Fortaleza de Saruman" },
  { _id: "loc010", name: "Monte del Destino",         originalName: "Mount Doom",             region: "Mordor",            description: "Volcán donde se forjó el Anillo" },
  { _id: "loc011", name: "Minas Morgul",              originalName: "Minas Morgul",           region: "Gondor",            description: "Ciudad de los Nazgûl" },
  { _id: "loc012", name: "Puerta Negra",              originalName: "The Black Gate",         region: "Mordor",            description: "Entrada principal a Mordor" },
  { _id: "loc013", name: "Bosque de Fangorn",         originalName: "Fangorn",                region: "Rhovanion",         description: "Bosque antiguo hogar de los Ents" },
  { _id: "loc014", name: "Los Puertos Grises",        originalName: "Grey Havens",            region: "Eriador",           description: "Puerto desde donde los elfos parten" },
  { _id: "loc015", name: "Bree",                      originalName: "Bree",                   region: "Eriador",           description: "Ciudad de hombres y hobbits" },
  { _id: "loc016", name: "Cima de los Vientos",       originalName: "Weathertop",             region: "Eriador",           description: "Ruinas donde Frodo fue herido" },
  { _id: "loc017", name: "Ciénagas de los Muertos",   originalName: "Dead Marshes",           region: "Mordor",            description: "Pantanos con visiones de los caídos" },
  { _id: "loc018", name: "Amon Hen",                  originalName: "Amon Hen",               region: "Rhovanion",         description: "Colina de la Vista, fin de la Comunidad" },
  { _id: "loc019", name: "Erebor",                    originalName: "Erebor",                 region: "Rhovanion",         description: "La Montaña Solitaria de los enanos" },
  { _id: "loc020", name: "Ciudad del Lago",           originalName: "Lake-town",              region: "Rhovanion",         description: "Ciudad sobre el lago Long" },
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

async function getCharacterImage(originalName) {
  const cacheKey = `char:${originalName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  if (KNOWN_CHARACTER_IMAGES[originalName]) {
    imageCache.set(cacheKey, KNOWN_CHARACTER_IMAGES[originalName]);
    return KNOWN_CHARACTER_IMAGES[originalName];
  }

  return getWikiaImage(originalName);
}

async function getLocationImage(originalName) {
  return getWikiaImage(originalName);
}

async function getBookCover(originalTitle) {
  return getWikiaImage(originalTitle);
}

// ✅ FIX Bug 1: ahora recibe el nombre ya traducido y lo busca correctamente
async function getMoviePoster(translatedName) {
  const fandomTitles = {
    "La Comunidad del Anillo":           "The Lord of the Rings: The Fellowship of the Ring",
    "Las Dos Torres":                    "The Lord of the Rings: The Two Towers",
    "El Retorno del Rey":                "The Lord of the Rings: The Return of the King",
    "Un Viaje Inesperado":               "The Hobbit: An Unexpected Journey",
    "La Desolación de Smaug":            "The Hobbit: The Desolation of Smaug",
    "La Batalla de los Cinco Ejércitos": "The Hobbit: The Battle of the Five Armies",
  };
  const searchTitle = fandomTitles[translatedName] || translatedName;
  return getWikiaImage(searchTitle);
}

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

// ✅ FIX Bug 2: procesa en lotes de 10 para no saturar Fandom API
async function processInBatches(items, asyncMapper, batchSize = 10) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(asyncMapper));
    results.push(...chunkResults);
  }
  return results;
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

// 👤 Personajes — ✅ FIX Bug 2: lotes de 10
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 100, name, race } = req.query;
    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;
    if (race) endpoint += `&race=${encodeURIComponent(race)}`;

    const data = await fetchLOTR(endpoint);

    const enriched = await processInBatches(data.docs || [], async (char) => ({
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
    }));

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

// 📍 Ubicaciones — ✅ FIX Bug 2: lotes de 10
app.get("/api/locations", async (req, res) => {
  try {
    const locations = await processInBatches(STATIC_LOCATIONS, async (loc) => ({
      ...loc,
      image: await getLocationImage(loc.originalName),
    }));
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
    const books = await processInBatches(data.docs || [], async (book) => ({
      _id: book._id,
      name: translate(book.name),
      originalName: book.name,
      cover: await getBookCover(book.name),
    }));
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

// 🎬 Películas — ✅ FIX Bug 1: se pasa el nombre ya traducido a getMoviePoster
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    const movies = await processInBatches(data.docs || [], async (movie) => {
      const translatedName = translate(movie.name);
      return {
        _id: movie._id,
        name: translatedName,
        originalName: movie.name,
        runtimeInMinutes: movie.runtimeInMinutes,
        budgetInMillions: movie.budgetInMillions,
        boxOfficeRevenueInMillions: movie.boxOfficeRevenueInMillions,
        academyAwardNominations: movie.academyAwardNominations,
        academyAwardWins: movie.academyAwardWins,
        rottenTomatoesScore: movie.rottenTomatoesScore,
        poster: await getMoviePoster(translatedName), // ✅ nombre traducido
      };
    });
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