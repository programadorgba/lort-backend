const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const lotrClient = axios.create({
  baseURL: "https://theoneapi.dev/v2",
  headers: { Authorization: `Bearer ${process.env.LOTR_API_KEY}` }
});

// --- AYUDANTES DE CONTENIDO ---

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

// --- RUTAS MEJORADAS ---

// 1. LIBROS (Trilogía + El Hobbit inyectado)
app.get("/api/books", async (req, res) => {
  try {
    const response = await lotrClient.get("/book");
    const books = response.data.docs;

    // Inyectamos El Hobbit si no está (La API suele devolver solo 3)
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
    res.status(500).json({ error: "Error en la biblioteca" });
  }
});

// 2. PERSONAJES (Con imágenes del repo de GitHub)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;
    let path = `/character?page=${page}&limit=${limit}`;
    if (name) path += `&name=/${name}/i`;

    const response = await lotrClient.get(path);
    const enriched = response.data.docs.map(char => ({
      ...char,
      image: getCharacterImage(char.name)
    }));
    res.json({ results: enriched, total: response.data.total });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar personajes" });
  }
});

// 3. MUNDOS / LUGARES (Con descripción extra)
app.get("/api/locations", async (req, res) => {
  try {
    const response = await lotrClient.get("/place");
    // Añadimos datos "ficticios" o placeholders para que la UI se vea rica
    const enriched = response.data.docs.map(place => ({
      ...place,
      image: "https://images.alphacoders.com/516/516664.jpg",
      description: "Lugar emblemático de la Tierra Media."
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Error en el mapa" });
  }
});

// 4. CAPÍTULOS
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const { id } = req.params;
    // Si es nuestro ID inventado del Hobbit, damos una lista fija o mensaje
    if (id === "the-hobbit-manual-id") {
      return res.json([{ _id: "h1", chapterName: "An Unexpected Party" }, { _id: "h2", chapterName: "Roast Mutton" }]);
    }
    const response = await lotrClient.get(`/book/${id}/chapter`);
    res.json(response.data.docs);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron cargar los capítulos" });
  }
});

// 5. PELÍCULAS (ESDLA + El Hobbit con Posters)
app.get("/api/movies", async (req, res) => {
  try {
    const response = await lotrClient.get("/movie");
    
    // Diccionario de posters para ESDLA y El Hobbit
    const moviePosters = {
      // Trilogía Original
      "The Fellowship of the Ring": "https://image.tmdb.org/t/p/original/6oom5QYv7nyJ6pbnGSxK6L6u604.jpg",
      "The Two Towers": "https://image.tmdb.org/t/p/original/5VTN0pR8gcqV3EPUHHfMGnne9vL.jpg",
      "The Return of the King": "https://image.tmdb.org/t/p/original/rCzpEXqKUEAtRyvC6sOK2o7TpsW.jpg",
      
      // El Hobbit
      "The Hobbit: An Unexpected Journey": "https://image.tmdb.org/t/p/original/y9S7vV6S77S5YvO88p99S99S99S.jpg", // Nota: La API a veces usa nombres cortos
      "The Unexpected Journey": "https://image.tmdb.org/t/p/original/799S7vV6S77S5YvO88p99S99S99S.jpg",
      "The Desolation of Smaug": "https://image.tmdb.org/t/p/original/v79VvV6S77S5YvO88p99S99S99S.jpg",
      "The Battle of the Five Armies": "https://image.tmdb.org/t/p/original/x79VvV6S77S5YvO88p99S99S99S.jpg",
      
      // Caso genérico por si la API devuelve solo "The Hobbit Series"
      "The Hobbit Trilogy": "https://image.tmdb.org/t/p/original/9H9vV6S77S5YvO88p99S99S99S.jpg"
    };

    const enriched = response.data.docs.map(movie => ({
      ...movie,
      poster: moviePosters[movie.name] || "https://via.placeholder.com/300x450?text=LOTR+Movie"
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron encontrar las películas en el Palantir" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));