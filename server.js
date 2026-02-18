// ============================================================
//  🧙 EL SEÑOR DE LOS ANILLOS - BACKEND FUSIONADO Y MEJORADO
//  Combina lo mejor de ambas versiones:
//  ✅ Traducciones al español (v1)
//  ✅ Imágenes de wikia para personajes (v2)
//  ✅ Imágenes de wikia para ubicaciones (NUEVO)
//  ✅ Imágenes de wikia para películas (v2)
//  ✅ Portadas de libros via Open Library (v2)
//  ✅ CORS con variable de entorno (v1)
//  ✅ Health check (v1)
//  ✅ Ordenar por prioridad (v2)
//  ✅ Logs mejorados (v1)
//  ✅ Manejo de errores normalizado (MEJORADO)
// ============================================================

const express = require("express");
const { fetch } = require("undici");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// ─── CORS desde variable de entorno ─────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ─── Logging ─────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const LOTR_API_KEY = process.env.LOTR_API_KEY;
const LOTR_BASE_URL = "https://the-one-api.dev/v2";
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

if (!LOTR_API_KEY) {
  console.error("❌ ERROR CRÍTICO: No hay LOTR_API_KEY configurada en .env");
} else {
  console.log("✅ API Key cargada correctamente");
}

// ─── TRADUCCIONES inglés → español ───────────────────────────
const TRANSLATIONS = {
  // Personajes
  "Frodo Baggins": "Frodo Bolsón",
  "Samwise Gamgee": "Samsagaz Gamyi",
  "Peregrin Took": "Peregrin Tuk",
  "Meriadoc Brandybuck": "Meriadoc Brandigamo",
  "Bilbo Baggins": "Bilbo Bolsón",
  "Treebeard": "Bárbol",
  "Witch-king of Angmar": "Rey Brujo de Angmar",
  "Gríma Wormtongue": "Gríma Lengua de Serpiente",
  // Ubicaciones
  "The Shire": "La Comarca",
  "Rivendell": "Rivendel",
  "Fangorn Forest": "Bosque de Fangorn",
  "Helm's Deep": "Abismo de Helm",
  "The Black Gate": "Puerta Negra",
  "Mount Doom": "Monte del Destino",
  "The Prancing Pony": "El Poney Pisador",
  "The Dead Marshes": "Las Ciénagas de los Muertos",
  "Weathertop": "Cima de los Vientos",
  "Amon Hen": "Amon Hen",
  "The Grey Havens": "Los Puertos Grises",
  // Libros
  "The Fellowship of the Ring": "La Comunidad del Anillo",
  "The Two Towers": "Las Dos Torres",
  "The Return of the King": "El Retorno del Rey",
  "The Hobbit": "El Hobbit",
  "The Silmarillion": "El Silmarillion",
};

// ─── PERSONAJES PRINCIPALES (orden de importancia) ───────────
const MAIN_CHARACTERS = [
  "Frodo Baggins", "Gandalf", "Aragorn", "Legolas", "Gimli",
  "Samwise Gamgee", "Boromir", "Gollum", "Saruman", "Galadriel",
  "Elrond", "Bilbo Baggins", "Peregrin Took", "Meriadoc Brandybuck",
  "Éowyn", "Théoden", "Faramir", "Arwen", "Sauron",
  "Witch-king of Angmar", "Treebeard", "Éomer", "Denethor",
  "Gríma Wormtongue",
];

// ─── IMÁGENES CONOCIDAS ───────────────────────────────────────

const KNOWN_CHARACTER_IMAGES = {
  "Frodo Baggins":        "https://static.wikia.nocookie.net/lotr/images/3/32/Frodo_%28FotR%29.png",
  "Gandalf":              "https://static.wikia.nocookie.net/lotr/images/8/8d/Gandalf-2.jpg",
  "Aragorn":              "https://static.wikia.nocookie.net/lotr/images/b/b6/Aragorn_profile.jpg",
  "Legolas":              "https://static.wikia.nocookie.net/lotr/images/2/2b/Legolas_profile.jpg",
  "Gimli":                "https://static.wikia.nocookie.net/lotr/images/e/ec/Gimli_-_FOTR.png",
  "Samwise Gamgee":       "https://static.wikia.nocookie.net/lotr/images/7/7b/Sam_FOTR_Promotional.jpg",
  "Boromir":              "https://static.wikia.nocookie.net/lotr/images/7/79/Boromir_-_FOTR.png",
  "Gollum":               "https://static.wikia.nocookie.net/lotr/images/e/e0/Gollum_Render.png",
  "Saruman":              "https://static.wikia.nocookie.net/lotr/images/9/9a/Saruman_the_White.jpg",
  "Galadriel":            "https://static.wikia.nocookie.net/lotr/images/b/b9/Galadriel_FOTR.jpg",
  "Elrond":               "https://static.wikia.nocookie.net/lotr/images/7/7a/Elrond_FOTR.png",
  "Bilbo Baggins":        "https://static.wikia.nocookie.net/lotr/images/b/b6/Bilbo_baggins.jpg",
  "Peregrin Took":        "https://static.wikia.nocookie.net/lotr/images/5/51/Pippin_ROTK.png",
  "Meriadoc Brandybuck":  "https://static.wikia.nocookie.net/lotr/images/2/2c/Merry_ROTK.png",
  "Éowyn":                "https://static.wikia.nocookie.net/lotr/images/6/68/Eowyn_ROTK.png",
  "Théoden":              "https://static.wikia.nocookie.net/lotr/images/4/4c/Theoden_-_ROTK.png",
  "Faramir":              "https://static.wikia.nocookie.net/lotr/images/7/73/Faramir_-_ROTK.png",
  "Arwen":                "https://static.wikia.nocookie.net/lotr/images/b/b6/Arwen_FOTR.jpg",
  "Sauron":               "https://static.wikia.nocookie.net/lotr/images/4/43/Sauron.jpg",
  "Éomer":                "https://static.wikia.nocookie.net/lotr/images/c/ca/Eomer_-_ROTK.png",
  "Denethor":             "https://static.wikia.nocookie.net/lotr/images/b/b7/Denethor_-_ROTK.png",
};

// ── Ubicaciones con imágenes de wikia ────────────────────────
const KNOWN_LOCATION_IMAGES = {
  "The Shire":            "https://static.wikia.nocookie.net/lotr/images/9/9a/The_Shire.jpg",
  "Rivendell":            "https://static.wikia.nocookie.net/lotr/images/e/e7/Rivendell_city.jpg",
  "Moria":                "https://static.wikia.nocookie.net/lotr/images/9/93/Moria.jpg",
  "Lothlórien":           "https://static.wikia.nocookie.net/lotr/images/c/cd/Caras_Galadhon.jpg",
  "Fangorn Forest":       "https://static.wikia.nocookie.net/lotr/images/e/e9/Fangorn_Forest.jpg",
  "Isengard":             "https://static.wikia.nocookie.net/lotr/images/7/78/Orthanc.jpg",
  "Mordor":               "https://static.wikia.nocookie.net/lotr/images/9/9c/Mordor.jpg",
  "Minas Tirith":         "https://static.wikia.nocookie.net/lotr/images/c/c3/Minas_Tirith_ROTK.jpg",
  "Minas Morgul":         "https://static.wikia.nocookie.net/lotr/images/8/82/Minas_Morgul.jpg",
  "Edoras":               "https://static.wikia.nocookie.net/lotr/images/3/38/Edoras.jpg",
  "Helm's Deep":          "https://static.wikia.nocookie.net/lotr/images/6/69/Helms_Deep.jpg",
  "The Black Gate":       "https://static.wikia.nocookie.net/lotr/images/f/f1/Black_Gate.jpg",
  "Mount Doom":           "https://static.wikia.nocookie.net/lotr/images/4/41/Mount_Doom.jpg",
  "Bree":                 "https://static.wikia.nocookie.net/lotr/images/a/a1/Bree.jpg",
  "Weathertop":           "https://static.wikia.nocookie.net/lotr/images/1/19/Weathertop.jpg",
  "The Grey Havens":      "https://static.wikia.nocookie.net/lotr/images/4/43/Grey_Havens.jpg",
  "The Dead Marshes":     "https://static.wikia.nocookie.net/lotr/images/7/7b/Dead_Marshes.jpg",
  "Amon Hen":             "https://static.wikia.nocookie.net/lotr/images/e/e3/Amon_Hen.jpg",
};

// ── Posters de películas ──────────────────────────────────────
const KNOWN_MOVIE_POSTERS = {
  "The Fellowship of the Ring": "https://static.wikia.nocookie.net/lotr/images/9/9d/The_Fellowship_Of_The_Ring_Theatrical_Poster.jpg",
  "The Two Towers":             "https://static.wikia.nocookie.net/lotr/images/2/23/The_Two_Towers_Theatrical_Poster.jpg",
  "The Return of the King":     "https://static.wikia.nocookie.net/lotr/images/6/6d/Returnoftheking.jpg",
};

// ─── CACHÉ ───────────────────────────────────────────────────
const imageCache = new Map();

// ─── HELPERS ─────────────────────────────────────────────────

/** Traduce un nombre inglés a español si existe en el diccionario */
function translate(name) {
  return TRANSLATIONS[name] || name;
}

/** Petición autenticada a The One API */
async function fetchLOTR(endpoint) {
  const url = `${LOTR_BASE_URL}${endpoint}`;
  console.log(`📡 GET ${url}`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${LOTR_API_KEY}` },
  });
  if (!response.ok) {
    throw new Error(`LOTR API error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/** Imagen de personaje: wikia si existe, si no avatar de iniciales */
async function getCharacterImage(originalName) {
  const cacheKey = `char:${originalName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const url =
    KNOWN_CHARACTER_IMAGES[originalName] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(originalName)}&size=400&background=10b981&color=fff&bold=true`;

  imageCache.set(cacheKey, url);
  return url;
}

/** Imagen de ubicación: wikia si existe, si no placeholder temático */
async function getLocationImage(originalName) {
  const cacheKey = `loc:${originalName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const url =
    KNOWN_LOCATION_IMAGES[originalName] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(originalName)}&size=400x300&background=5c3d2e&color=fff&bold=true`;

  imageCache.set(cacheKey, url);
  return url;
}

/** Portada de libro: Open Library con fallback */
async function getBookCover(originalTitle) {
  const cacheKey = `book:${originalTitle}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    const searchTitle = originalTitle.replace(/^(The|A|An)\s+/i, "").trim();
    const response = await fetch(`${OPEN_LIBRARY_URL}?title=${encodeURIComponent(searchTitle)}&limit=1`);
    const data = await response.json();

    if (data.docs?.[0]?.cover_i) {
      const url = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
      imageCache.set(cacheKey, url);
      return url;
    }
  } catch (err) {
    console.warn(`⚠️ No se pudo obtener portada para "${originalTitle}":`, err.message);
  }

  const fallback = `https://via.placeholder.com/300x450/2c3e50/FFFFFF?text=${encodeURIComponent(originalTitle)}`;
  imageCache.set(cacheKey, fallback);
  return fallback;
}

/** Poster de película */
async function getMoviePoster(originalName) {
  const cacheKey = `movie:${originalName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const url =
    KNOWN_MOVIE_POSTERS[originalName] ||
    `https://via.placeholder.com/300x450/000000/FFFFFF?text=${encodeURIComponent(originalName)}`;

  imageCache.set(cacheKey, url);
  return url;
}

/** Ordena personajes priorizando los principales */
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

// 🟢 Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    apiKey: !!LOTR_API_KEY,
    cacheEntries: imageCache.size,
    translations: Object.keys(TRANSLATIONS).length,
    knownCharacters: Object.keys(KNOWN_CHARACTER_IMAGES).length,
    knownLocations: Object.keys(KNOWN_LOCATION_IMAGES).length,
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

// 📍 Ubicaciones
app.get("/api/locations", async (req, res) => {
  try {
    const data = await fetchLOTR("/location");

    const locations = await Promise.all(
      (data.docs || []).map(async (loc) => ({
        _id: loc._id,
        name: translate(loc.name),
        originalName: loc.name,
        type: loc.type,
        region: loc.region,
        image: await getLocationImage(loc.name),
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
  try {
    const data = await fetchLOTR(`/location/${req.params.id}`);
    const loc = data.docs?.[0];
    if (!loc) return res.status(404).json({ error: "Ubicación no encontrada" });

    res.json({
      ...loc,
      name: translate(loc.name),
      originalName: loc.name,
      image: await getLocationImage(loc.name),
    });
  } catch (err) {
    console.error("❌ /api/locations/:id:", err.message);
    res.status(404).json({ error: "Ubicación no encontrada" });
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

// 📚 Capítulos de un libro
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
  console.log(`🗑️ Caché limpiada (${size} entradas eliminadas)`);
  res.json({ message: `Caché limpiada: ${size} entradas eliminadas`, timestamp: new Date().toISOString() });
});

// ─── ARRANQUE ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   🧙 EL SEÑOR DE LOS ANILLOS - API FUSION   ║
╠══════════════════════════════════════════════╣
║   🚀 Puerto:        ${PORT}                         ║
║   🔑 API Key:       ${LOTR_API_KEY ? "✅ Cargada" : "❌ FALTA"}          ║
║   🌍 CORS origins:  ${allowedOrigins.length} configurados        ║
╠══════════════════════════════════════════════╣
║   📡 Endpoints disponibles:                  ║
║   GET  /api/health                           ║
║   GET  /api/characters                       ║
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