const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Configuraciones principales
const LOTR_BASE_URL = "https://theoneapi.dev/v2";
const API_KEY = process.env.LOTR_API_KEY; // Tu token de theoneapi.dev

// Helper para obtener imágenes desde un CDN de GitHub
// Usamos nombres de archivos normalizados (ej: legolas.jpg)
const getImageUrl = (name) => {
  if (!name) return "https://via.placeholder.com/300x400?text=No+Image";
  const formattedName = name.toLowerCase().replace(/\s+/g, '-');
  return `https://raw.githubusercontent.com/the-one-api/lotr-images/master/images/${formattedName}.jpg`;
};

// Instancia de Axios para LotR
const lotrClient = axios.create({
  baseURL: LOTR_BASE_URL,
  headers: { Authorization: `Bearer ${API_KEY}` }
});

// --- RUTAS ---

// 1. Obtener Personajes con búsqueda y paginación
app.get("/api/characters", async (req, res) => {
  try {
    const { name, page = 1, limit = 10 } = req.query;
    let endpoint = `/character?page=${page}&limit=${limit}`;
    
    // Si hay búsqueda por nombre
    if (name) {
      endpoint += `&name=/${name}/i`; // Regex simple para búsqueda parcial
    }

    const response = await lotrClient.get(endpoint);
    const data = response.data;

    // Enriquecer con imágenes
    const enrichedResults = data.docs.map(char => ({
      ...char,
      image: getImageUrl(char.name)
    }));

    res.json({
      count: data.total,
      pages: data.pages,
      results: enrichedResults
    });
  } catch (error) {
    res.status(500).json({ error: "Error al conectar con la Tierra Media" });
  }
});

// 2. Detalle de un personaje
app.get("/api/characters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await lotrClient.get(`/character/${id}`);
    const char = response.data.docs[0];

    if (!char) return res.status(404).json({ error: "Personaje no encontrado" });

    res.json({
      ...char,
      image: getImageUrl(char.name)
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar el personaje" });
  }
});

// 3. Películas
app.get("/api/movies", async (req, res) => {
  try {
    const response = await lotrClient.get("/movie");
    res.json(response.data.docs);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar las películas" });
  }
});

app.get("/health", (req, res) => res.json({ status: "Online" }));

app.listen(PORT, () => {
  console.log(`🚀 El ojo de Sauron vigila en http://localhost:${PORT}`);
});