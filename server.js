const express = require("express");
const { fetch } = require("undici");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE LA API
const LOTR_API_KEY = process.env.LOTR_API_KEY;
const LOTR_BASE_URL = "https://theoneapi.dev/v2";

// LOG DE CONTROL
console.log("Estado de la API Key:", LOTR_API_KEY ? "Cargada correctamente" : "FALTA LA API KEY");

// --- HELPER: Petición a The One API ---
async function fetchLOTR(endpoint) {
  try {
    const url = `${LOTR_BASE_URL}${endpoint}`;
    console.log('🔑 API Key:', LOTR_API_KEY);
    console.log('📍 URL completa:', url);
    console.log('🔐 Authorization header:', `Bearer ${LOTR_API_KEY}`);
    
    const apiResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${LOTR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Status de respuesta:', apiResponse.status);

    if (!apiResponse.ok) {
      throw new Error(`LOTR API error: ${apiResponse.status}`);
    }

    return await apiResponse.json();
  } catch (error) {
    console.error("❌ Error en fetchLOTR:", error.message);
    throw error;
  }
}

// --- AYUDANTE DE IMÁGENES ---
const getCharacterImage = (name) => {
  const baseUrl = "https://cdn.jsdelivr.net/gh/lucas-m-ferreira/lotr-images@master/images";
  let fileName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').trim();
  
  const corrections = {
    "aragorn-ii": "aragorn",
    "gandalf-the-grey": "gandalf",
    "gandalf-the-white": "gandalf",
    "samwise-gamgee": "sam",
    "peregrin-took": "pippin",
    "meriadoc-brandybuck": "merry"
  };
  return `${baseUrl}/${corrections[fileName] || fileName}.jpg`;
};

// --- RUTAS ---

// 1. PERSONAJE POR ID
app.get("/api/characters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchLOTR(`/character/${id}`);
    const char = data.docs[0] || null;
    
    if (!char) {
      return res.status(404).json({ error: "Personaje no encontrado" });
    }
    
    const enriched = {
      ...char,
      image: getCharacterImage(char.name)
    };
    
    res.json(enriched);
  } catch (error) {
    console.error("Error en /api/characters/:id:", error.message);
    res.status(404).json({ error: "Personaje no encontrado" });
  }
});

// 2. PERSONAJES (con búsqueda y paginación)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;
    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${name}/i`;

    const data = await fetchLOTR(endpoint);
    
    const docs = data.docs || [];
    const enriched = docs.map(char => ({
      ...char,
      image: getCharacterImage(char.name)
    }));
    
    res.json({ results: enriched, total: data.total || 0 });
  } catch (error) {
    console.error("Error en /api/characters:", error.message);
    res.status(200).json({ results: [], total: 0, error: "API externa no disponible" });
  }
});

// 3. LIBROS
app.get("/api/books", async (req, res) => {
  try {
    const data = await fetchLOTR("/book");
    let books = data.docs || [];

    const hasHobbit = books.some(b => b.name.toLowerCase().includes("hobbit"));
    if (!hasHobbit) {
      books.unshift({
        _id: "the-hobbit-manual-id",
        name: "The Hobbit",
        image: "https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg"
      });
    }
    res.json(books);
  } catch (error) {
    console.error("Error en /api/books:", error.message);
    res.status(200).json([]);
  }
});

// 4. CAPÍTULOS DE UN LIBRO
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "the-hobbit-manual-id") {
      return res.json([
        { _id: "h1", chapterName: "An Unexpected Party" }, 
        { _id: "h2", chapterName: "Roast Mutton" }
      ]);
    }
    const data = await fetchLOTR(`/book/${id}/chapter`);
    res.json(data.docs || []);
  } catch (error) {
    console.error("Error en /api/books/:id/chapters:", error.message);
    res.status(200).json([]);
  }
});

// 5. MUNDOS / LUGARES
app.get("/api/locations", async (req, res) => {
  try {
    const data = await fetchLOTR("/place");
    const docs = data.docs || [];
    const enriched = docs.map(place => ({
      ...place,
      image: "https://images.alphacoders.com/516/516664.jpg",
      description: "Lugar emblemático de la Tierra Media."
    }));
    res.json(enriched);
  } catch (error) {
    console.error("Error en /api/locations:", error.message);
    res.status(200).json([]);
  }
});

// 6. PELÍCULAS
app.get("/api/movies", async (req, res) => {
  try {
    const data = await fetchLOTR("/movie");
    const moviePosters = {
      "The Fellowship of the Ring": "https://image.tmdb.org/t/p/original/6oom5QYv7nyJ6pbnGSxK6L6u604.jpg",
      "The Two Towers": "https://image.tmdb.org/t/p/original/5VTN0pR8gcqV3EPUHHfMGnne9vL.jpg",
      "The Return of the King": "https://image.tmdb.org/t/p/original/rCzpEXqKUEAtRyvC6sOK2o7TpsW.jpg",
      "The Hobbit: An Unexpected Journey": "https://image.tmdb.org/t/p/original/799S7vV6S77S5YvO88p99S99S99S.jpg",
      "The Desolation of Smaug": "https://image.tmdb.org/t/p/original/v79VvV6S77S5YvO88p99S99S99S.jpg",
      "The Battle of the Five Armies": "https://image.tmdb.org/t/p/original/x79VvV6S77S5YvO88p99S99S99S.jpg"
    };

    const docs = data.docs || [];
    const enriched = docs.map(movie => ({
      ...movie,
      poster: moviePosters[movie.name] || "https://via.placeholder.com/300x450?text=LOTR+Movie"
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error en /api/movies:", error.message);
    res.status(200).json([]);
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor LOTR en puerto ${PORT}`));
