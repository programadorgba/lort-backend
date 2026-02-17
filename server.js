const express = require("express");
const { fetch } = require("undici");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ✅ CONFIGURACIÓN
const LOTR_API_KEY = process.env.LOTR_API_KEY;
const LOTR_BASE_URL = "https://the-one-api.dev/v2";
const WIKIPEDIA_API_ES = "https://es.wikipedia.org/w/api.php";
const WIKIPEDIA_API_EN = "https://en.wikipedia.org/w/api.php";
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

console.log("Estado de la API Key:", LOTR_API_KEY ? "Cargada correctamente" : "❌ FALTA LA API KEY");

// ✅ CACHE DE IMÁGENES (para todos los tipos)
const imageCache = new Map();

// ✅ PERSONAJES PRINCIPALES (ordenados por importancia)
const MAIN_CHARACTERS = [
  "Frodo Baggins",
  "Gandalf",
  "Aragorn",
  "Legolas",
  "Gimli",
  "Samwise Gamgee",
  "Boromir",
  "Gollum",
  "Saruman",
  "Galadriel",
  "Elrond",
  "Bilbo Baggins",
  "Peregrin Took",
  "Meriadoc Brandybuck",
  "Éowyn",
  "Théoden",
  "Faramir",
  "Arwen",
  "Sauron",
  "Witch-king of Angmar",
  "Treebeard",
  "Éomer",
  "Denethor",
  "Gríma Wormtongue"
];

// --- HELPER: Petición a The One API ---
async function fetchLOTR(endpoint) {
  try {
    const url = `${LOTR_BASE_URL}${endpoint}`;
    console.log("📍 URL:", url);

    const apiResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOTR_API_KEY}`
      }
    });

    console.log("📡 Status:", apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("❌ Respuesta API:", errorText);
      throw new Error(`LOTR API error: ${apiResponse.status}`);
    }

    return await apiResponse.json();
  } catch (error) {
    console.error("❌ Error en fetchLOTR:", error.message);
    throw error;
  }
}

// --- HELPER: Buscar imagen en Wikipedia (genérico) ---
async function getImageFromWikipedia(searchTerm, lang = "es") {
  try {
    const apiUrl = lang === "es" ? WIKIPEDIA_API_ES : WIKIPEDIA_API_EN;
    
    const params = new URLSearchParams({
      action: "query",
      titles: searchTerm,
      prop: "pageimages",
      pithumbsize: 500,
      format: "json",
      origin: "*",
      redirects: 1
    });

    const response = await fetch(`${apiUrl}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) return null;

    const page = Object.values(pages)[0];

    if (page && page.pageid && page.pageid > 0 && page.thumbnail?.source) {
      console.log(`✅ Imagen encontrada para "${searchTerm}" en Wikipedia ${lang.toUpperCase()}`);
      return page.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error buscando imagen en Wikipedia ${lang}:`, error.message);
    return null;
  }
}

// --- HELPER: Imagen de personaje (con cache y fallback) ---
async function getCharacterImage(name) {
  const cacheKey = `char:${name}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  let imageUrl = null;

  // Intentos en varios idiomas y contextos
  const attempts = [
    { term: `${name} Tierra Media`, lang: "es" },
    { term: name, lang: "es" },
    { term: `${name} Middle-earth`, lang: "en" },
    { term: name, lang: "en" }
  ];

  for (const { term, lang } of attempts) {
    imageUrl = await getImageFromWikipedia(term, lang);
    if (imageUrl) break;
  }

  // Fallback: avatar con iniciales
  if (!imageUrl) {
    console.log(`⚠️ No se encontró imagen para ${name}, usando avatar`);
    imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=10b981&color=fff&bold=true`;
  }

  imageCache.set(cacheKey, imageUrl);
  return imageUrl;
}

// --- HELPER: Imagen de libro (portada) usando Open Library ---
async function getBookCover(bookTitle) {
  const cacheKey = `book:${bookTitle}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  try {
    // Normalizar título: eliminar "The" inicial, etc.
    const searchTitle = bookTitle.replace(/^(The|A|An)\s+/i, '').trim();
    const url = `${OPEN_LIBRARY_URL}?title=${encodeURIComponent(searchTitle)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
      const coverId = data.docs[0].cover_i;
      const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      imageCache.set(cacheKey, coverUrl);
      return coverUrl;
    }
  } catch (error) {
    console.error(`❌ Error obteniendo portada para "${bookTitle}":`, error.message);
  }

  // Fallback: imagen genérica
  const fallback = `https://via.placeholder.com/300x450?text=${encodeURIComponent(bookTitle)}`;
  imageCache.set(cacheKey, fallback);
  return fallback;
}

// --- HELPER: Imagen de película (póster) desde Wikipedia ---
async function getMoviePoster(movieName) {
  const cacheKey = `movie:${movieName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  // Para las películas de LOTR, los nombres en Wikipedia suelen ser:
  // "The Lord of the Rings: The Fellowship of the Ring"
  // Vamos a buscar con variantes
  const variants = [
    `The Lord of the Rings: ${movieName}`,
    movieName,
    `${movieName} film`,
    `${movieName} movie`
  ];

  let imageUrl = null;
  for (const variant of variants) {
    // Intentar en inglés (más probable)
    imageUrl = await getImageFromWikipedia(variant, "en");
    if (imageUrl) break;
  }

  if (!imageUrl) {
    // Fallback: placeholder
    imageUrl = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movieName)}`;
  }

  imageCache.set(cacheKey, imageUrl);
  return imageUrl;
}

// --- HELPER: Imagen de ubicación desde Wikipedia ---
async function getLocationImage(locationName) {
  const cacheKey = `loc:${locationName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  let imageUrl = null;
  const attempts = [
    { term: `${locationName} Tierra Media`, lang: "es" },
    { term: locationName, lang: "es" },
    { term: `${locationName} Middle-earth`, lang: "en" },
    { term: locationName, lang: "en" }
  ];

  for (const { term, lang } of attempts) {
    imageUrl = await getImageFromWikipedia(term, lang);
    if (imageUrl) break;
  }

  if (!imageUrl) {
    imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(locationName)}`;
  }

  imageCache.set(cacheKey, imageUrl);
  return imageUrl;
}

// --- ORDENAR POR PRIORIDAD ---
function normalizeName(name) {
  // Extraer la primera palabra significativa (ignorando títulos)
  const words = name.split(' ');
  // Si el nombre tiene más de una palabra, tomar la primera que no sea "the", "of", etc.
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!['the', 'of', 'and', 'del', 'de', 'la', 'el'].includes(lower)) {
      return word;
    }
  }
  return words[0];
}

function sortByPriority(characters) {
  return characters.sort((a, b) => {
    const aSimple = normalizeName(a.name);
    const bSimple = normalizeName(b.name);
    const indexA = MAIN_CHARACTERS.findIndex(c => 
      c.toLowerCase().includes(aSimple.toLowerCase()) || 
      aSimple.toLowerCase().includes(c.toLowerCase())
    );
    const indexB = MAIN_CHARACTERS.findIndex(c => 
      c.toLowerCase().includes(bSimple.toLowerCase()) || 
      bSimple.toLowerCase().includes(c.toLowerCase())
    );
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

// --- ENDPOINTS ---

// 🆕 Obtener imagen de personaje por nombre
app.get('/api/character-image', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Parámetro "name" requerido' });
    const imageUrl = await getCharacterImage(name);
    res.json({ name, image: imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo imagen" });
  }
});

// 📚 Obtener imagen de libro por título
app.get('/api/book-cover', async (req, res) => {
  try {
    const title = req.query.title;
    if (!title) return res.status(400).json({ error: 'Parámetro "title" requerido' });
    const coverUrl = await getBookCover(title);
    res.json({ title, cover: coverUrl });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo portada" });
  }
});

// 🎬 Obtener póster de película por nombre
app.get('/api/movie-poster', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Parámetro "name" requerido' });
    const posterUrl = await getMoviePoster(name);
    res.json({ name, poster: posterUrl });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo póster" });
  }
});

// 🗺️ Obtener imagen de ubicación por nombre
app.get('/api/location-image', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Parámetro "name" requerido' });
    const imageUrl = await getLocationImage(name);
    res.json({ name, image: imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo imagen de ubicación" });
  }
});

// ✅ PERSONAJES (con filtro por raza)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name, race } = req.query;

    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;
    if (race) endpoint += `&race=${encodeURIComponent(race)}`; // Filtro por raza

    const data = await fetchLOTR(endpoint);

    // Enriquecer con imágenes
    const enriched = await Promise.all(
      (data.docs || []).map(async (char) => ({
        ...char,
        image: await getCharacterImage(char.name)
      }))
    );

    // Ordenar por prioridad
    const sorted = sortByPriority(enriched);

    res.json({
      total: data.total,
      results: sorted
    });
  } catch (error) {
    console.error("❌ Error en /api/characters:", error.message);
    res.status(500).json({ error: "Error obteniendo personajes" });
  }
});

// ✅ PERSONAJE POR ID
app.get("/api/characters/:id", async (req, res) => {
  try {
    const data = await fetchLOTR(`/character/${req.params.id}`);
    const char = data.docs[0];
    if (!char) return res.status(404).json({ error: "No encontrado" });

    res.json({
      ...char,
      image: await getCharacterImage(char.name)
    });
  } catch (error) {
    res.status(404).json({ error: "No encontrado" });
  }
});

// ✅ LIBROS (con portadas)
app.get("/api/books", async (req, res) => {
  try {
    const data = await fetchLOTR("/book");
    const books = await Promise.all(
      (data.docs || []).map(async (book) => ({
        ...book,
        cover: await getBookCover(book.name)
      }))
    );
    res.json(books);
  } catch (error) {
    console.error("❌ Error en /api/books:", error.message);
    res.status(500).json([]);
  }
});

// ✅ UBICACIONES (con imágenes)
app.get("/api/locations", async (req, res) => {
  try {
    const data = await fetchLOTR("/location");
    const locations = await Promise.all(
      (data.docs || []).map(async (loc) => ({
        ...loc,
        image: await getLocationImage(loc.name)
      }))
    );
    res.json(locations);
  } catch (error) {
    console.error("❌ Error en /api/locations:", error.message);
    res.status(500).json([]);
  }
});

// ✅ PELÍCULAS (con pósters)
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    const movies = await Promise.all(
      (data.docs || []).map(async (movie) => ({
        ...movie,
        poster: await getMoviePoster(movie.name)
      }))
    );
    res.json(movies);
  } catch (error) {
    console.error("❌ Error en /api/movies:", error.message);
    res.status(500).json([]);
  }
});

// 🆕 Limpiar caché (útil para desarrollo)
app.post("/api/cache/clear", (req, res) => {
  imageCache.clear();
  res.json({ message: "Caché de imágenes limpiada" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor LOTR en puerto ${PORT}`);
  console.log(`📸 Caché de imágenes: ${imageCache.size} entradas`);
});
