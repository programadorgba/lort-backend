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
  "Gimli",
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

// --- OBTENER IMAGEN: Wikipedia ES → Wikipedia EN → Fallback ---
async function getCharacterImage(name) {
  // 1️⃣ Intentar Wikipedia español
  let image = await getImageFromWikipedia(name, "es");
  if (image) return image;

  // 2️⃣ Intentar Wikipedia inglés
  image = await getImageFromWikipedia(name, "en");
  if (image) return image;

  // 3️⃣ Fallback: Imagen genérica de LOTR (necesario para personajes secundarios sin Wikipedia)
  console.log(`⚠️ No se encontró imagen para ${name}, usando fallback`);
  return "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400";
}

// --- ORDENAR POR PRIORIDAD ---
function sortByPriority(characters) {
  return characters.sort((a, b) => {
    const indexA = MAIN_CHARACTERS.indexOf(a.name);
    const indexB = MAIN_CHARACTERS.indexOf(b.name);
    
    // Si ambos están en la lista de principales, ordenar por posición
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Si solo A está en la lista, A va primero
    if (indexA !== -1) return -1;
    
    // Si solo B está en la lista, B va primero
    if (indexB !== -1) return 1;
    
    // Si ninguno está en la lista, orden alfabético
    return a.name.localeCompare(b.name);
  });
}

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
});

