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

console.log("Estado de la API Key:", LOTR_API_KEY ? "Cargada correctamente" : "❌ FALTA LA API KEY");

// ✅ CACHE DE IMÁGENES
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

// --- HELPER: Buscar imagen en Wikipedia ---
async function getImageFromWikipedia(name, lang = "es") {
  try {
    const apiUrl = lang === "es" ? WIKIPEDIA_API_ES : WIKIPEDIA_API_EN;
    
    // Normalizar nombre para búsqueda
    const searchName = name
      .replace(/[-–]/g, " ")
      .replace(/[']/g, "'")
      .trim();

    const params = new URLSearchParams({
      action: "query",
      titles: searchName,
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
      console.log(`✅ Imagen encontrada para ${name} en Wikipedia ${lang.toUpperCase()}`);
      return page.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error buscando imagen en Wikipedia ${lang}:`, error.message);
    return null;
  }
}

// --- OBTENER IMAGEN CON CACHE ---
async function getCharacterImage(name) {
  // Si ya está en cache, devolverla inmediatamente
  if (imageCache.has(name)) {
    return imageCache.get(name);
  }

  let imageUrl = null;

  // 1️⃣ Intentar Wikipedia español con contexto LOTR
  imageUrl = await getImageFromWikipedia(`${name} Tierra Media`, "es");
  if (imageUrl) {
    imageCache.set(name, imageUrl);
    return imageUrl;
  }

  // 2️⃣ Intentar solo el nombre en español
  imageUrl = await getImageFromWikipedia(name, "es");
  if (imageUrl) {
    imageCache.set(name, imageUrl);
    return imageUrl;
  }

  // 3️⃣ Intentar Wikipedia inglés con contexto LOTR
  imageUrl = await getImageFromWikipedia(`${name} Middle-earth`, "en");
  if (imageUrl) {
    imageCache.set(name, imageUrl);
    return imageUrl;
  }

  // 4️⃣ Intentar solo el nombre en inglés
  imageUrl = await getImageFromWikipedia(name, "en");
  if (imageUrl) {
    imageCache.set(name, imageUrl);
    return imageUrl;
  }

  // 5️⃣ Fallback: imagen con iniciales del personaje
  console.log(`⚠️ No se encontró imagen para ${name}, usando avatar con iniciales`);
  imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=10b981&color=fff&bold=true`;
  
  imageCache.set(name, imageUrl);
  return imageUrl;
}

// --- ORDENAR POR PRIORIDAD ---
function sortByPriority(characters) {
  return characters.sort((a, b) => {
    const indexA = MAIN_CHARACTERS.indexOf(a.name);
    const indexB = MAIN_CHARACTERS.indexOf(b.name);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    return a.name.localeCompare(b.name);
  });
}

// --- 🆕 ENDPOINT: BUSCAR IMAGEN POR NOMBRE ---
app.get('/api/character-image', async (req, res) => {
  try {
    const name = req.query.name;
    
    if (!name) {
      return res.status(400).json({ error: 'Parámetro "name" requerido' });
    }

    console.log(`🔍 Buscando imagen para: ${name}`);
    const imageUrl = await getCharacterImage(name);

    res.json({ 
      name, 
      image: imageUrl,
      cached: imageCache.has(name)
    });
  } catch (error) {
    console.error("❌ Error en /api/character-image:", error.message);
    res.status(500).json({ error: "Error obteniendo imagen" });
  }
});

// --- PERSONAJES ---
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;

    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;

    const data = await fetchLOTR(endpoint);

    // Obtener imágenes en paralelo
    const enriched = await Promise.all(
      (data.docs || []).map(async (char) => ({
        ...char,
        image: await getCharacterImage(char.name)
      }))
    );

    // ✅ ORDENAR POR PRIORIDAD (personajes principales primero)
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

// --- PERSONAJE POR ID ---
app.get("/api/characters/:id", async (req, res) => {
  try {
    const data = await fetchLOTR(`/character/${req.params.id}`);
    const char = data.docs[0];

    if (!char) {
      return res.status(404).json({ error: "No encontrado" });
    }

    res.json({
      ...char,
      image: await getCharacterImage(char.name)
    });
  } catch (error) {
    console.error("❌ Error en /api/characters/:id:", error.message);
    res.status(404).json({ error: "No encontrado" });
  }
});

// --- LIBROS ---
app.get("/api/books", async (req, res) => {
  try {
    const data = await fetchLOTR("/book");
    res.json(data.docs || []);
  } catch (error) {
    console.error("❌ Error en /api/books:", error.message);
    res.status(500).json([]);
  }
});

// --- LOCATIONS ---
app.get("/api/locations", async (req, res) => {
  try {
    const data = await fetchLOTR("/location");
    res.json(data.docs || []);
  } catch (error) {
    console.error("❌ Error en /api/locations:", error.message);
    res.status(500).json([]);
  }
});

// --- MOVIES ---
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    res.json(data.docs || []);
  } catch (error) {
    console.error("❌ Error en /api/movies:", error.message);
    res.status(500).json([]);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor LOTR en puerto ${PORT}`);
  console.log(`📸 Cache de imágenes: ${imageCache.size} entradas`);
});
