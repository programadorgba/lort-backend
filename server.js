const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE AXIOS: La sacamos fuera para poder depurarla
const LOTR_API_KEY = process.env.LOTR_API_KEY;

const lotrClient = axios.create({
  baseURL: "https://theoneapi.dev/v2",
  headers: { 
    Authorization: `Bearer ${LOTR_API_KEY}` 
  }
});

// LOG DE CONTROL: Esto te dirá en Render si la clave se está leyendo
console.log("Estado de la API Key:", LOTR_API_KEY ? "Cargada correctamente" : "FALTA LA API KEY");

// --- AYUDANTE DE IMÁGENES (Se queda igual) ---
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

// --- RUTAS BLINDADAS ---

// 1. LIBROS
app.get("/api/books", async (req, res) => {
  try {
    const response = await lotrClient.get("/book");
    let books = response.data.docs || [];

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
    console.error("Error en /api/books:", error.response?.data || error.message);
    res.status(200).json([]); // Devolvemos array vacío para no romper el front
  }
});

// 2. PERSONAJES (Aquí es donde daba el 500)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;
    let path = `/character?page=${page}&limit=${limit}`;
    if (name) path += `&name=/${name}/i`;

    const response = await lotrClient.get(path);
    
    // Verificamos que existan datos antes de mapear
    const docs = response.data.docs || [];
    const enriched = docs.map(char => ({
      ...char,
      image: getCharacterImage(char.name)
    }));
    
    res.json({ results: enriched, total: response.data.total || 0 });
  } catch (error) {
    console.error("Error en /api/characters:", error.response?.data || error.message);
    // Si la API falla, mandamos un objeto válido pero vacío
    res.status(200).json({ results: [], total: 0, error: "API externa no disponible" });
  }
});

// 3. MUNDOS
app.get("/api/locations", async (req, res) => {
  try {
    const response = await lotrClient.get("/place");
    const docs = response.data.docs || [];
    const enriched = docs.map(place => ({
      ...place,
      image: "https://images.alphacoders.com/516/516664.jpg",
      description: "Lugar emblemático de la Tierra Media."
    }));
    res.json(enriched);
  } catch (error) {
    res.status(200).json([]);
  }
});

// 4. CAPÍTULOS
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "the-hobbit-manual-id") {
      return res.json([{ _id: "h1", chapterName: "An Unexpected Party" }, { _id: "h2", chapterName: "Roast Mutton" }]);
    }
    const response = await lotrClient.get(`/book/${id}/chapter`);
    res.json(response.data.docs || []);
  } catch (error) {
    res.status(200).json([]);
  }
});

// 5. PELÍCULAS
app.get("/api/movies", async (req, res) => {
  try {
    const response = await lotrClient.get("/movie");
    const moviePosters = {
      "The Fellowship of the Ring": "https://image.tmdb.org/t/p/original/6oom5QYv7nyJ6pbnGSxK6L6u604.jpg",
      "The Two Towers": "https://image.tmdb.org/t/p/original/5VTN0pR8gcqV3EPUHHfMGnne9vL.jpg",
      "The Return of the King": "https://image.tmdb.org/t/p/original/rCzpEXqKUEAtRyvC6sOK2o7TpsW.jpg",
      "The Hobbit: An Unexpected Journey": "https://image.tmdb.org/t/p/original/799S7vV6S77S5YvO88p99S99S99S.jpg",
      "The Desolation of Smaug": "https://image.tmdb.org/t/p/original/v79VvV6S77S5YvO88p99S99S99S.jpg",
      "The Battle of the Five Armies": "https://image.tmdb.org/t/p/original/x79VvV6S77S5YvO88p99S99S99S.jpg"
    };

    const docs = response.data.docs || [];
    const enriched = docs.map(movie => ({
      ...movie,
      poster: moviePosters[movie.name] || "https://via.placeholder.com/300x450?text=LOTR+Movie"
    }));

    res.json(enriched);
  } catch (error) {
    res.status(200).json([]);
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
