const express = require("express");
const { fetch } = require("undici");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ✅ URL CORRECTA
const LOTR_API_KEY = process.env.LOTR_API_KEY;
const LOTR_BASE_URL = "https://the-one-api.dev/v2";

console.log("Estado de la API Key:", LOTR_API_KEY ? "Cargada correctamente" : "❌ FALTA LA API KEY");

// --- HELPER ---
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

// --- IMÁGENES DESDE GITHUB ---
const getCharacterImage = (name) => {
  // Genera un avatar único basado en el nombre del personaje
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=1e3a8a,10b981&scale=80`;
};

  return `${baseUrl}/${corrections[fileName] || fileName}.jpg`;
};

// --- PERSONAJES ---
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;

    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;

    const data = await fetchLOTR(endpoint);

    const enriched = (data.docs || []).map(char => ({
      ...char,
      image: getCharacterImage(char.name)
    }));

    res.json({
      total: data.total,
      results: enriched
    });
  } catch (error) {
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
      image: getCharacterImage(char.name)
    });
  } catch (error) {
    res.status(404).json({ error: "No encontrado" });
  }
});

// --- LIBROS ---
app.get("/api/books", async (req, res) => {
  try {
    const data = await fetchLOTR("/book");
    res.json(data.docs || []);
  } catch (error) {
    res.status(500).json([]);
  }
});

// --- LOCATIONS (CORREGIDO) ---
app.get("/api/locations", async (req, res) => {
  try {
    const data = await fetchLOTR("/location");
    res.json(data.docs || []);
  } catch (error) {
    res.status(500).json([]);
  }
});

// --- MOVIES ---
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    res.json(data.docs || []);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor LOTR en puerto ${PORT}`);
});

