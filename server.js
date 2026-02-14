const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// --- CONFIGURACIÓN ---
app.use(cors());
app.use(express.json());

const lotrClient = axios.create({
  baseURL: "https://theoneapi.dev/v2",
  headers: { 
    'Authorization': `Bearer ${process.env.LOTR_API_KEY}` 
  }
});

// --- AYUDANTE DE IMÁGENES (Personajes) ---
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

// 1. PERSONAJES (Lista y Búsqueda por nombre)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 20, name } = req.query;
    const url = name ? `/character?name=/${name}/i&page=${page}&limit=${limit}` : `/character?page=${page}&limit=${limit}`;
    const response = await lotrClient.get(url);
    const enriched = response.data.docs.map(char => ({
      ...char,
      id: char._id,
      image: getCharacterImage(char.name)
    }));
    res.json({ results: enriched, total: response.data.total });
  } catch (error) {
    res.status(500).json({ error: "Error al cargar personajes" });
  }
});

// 2. UN PERSONAJE POR ID (Estructura oficial /character/{id})
app.get("/api/characters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await lotrClient.get(`/character/${id}`);
    const char = response.data.docs[0];
    if (!char) return res.status(404).json({ error: "No encontrado" });
    res.json({ ...char, id: char._id, image: getCharacterImage(char.name) });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar ID" });
  }
});

// 3. LIBROS (Trilogía + El Hobbit manual)
app.get("/api/books", async (req, res) => {
  try {
    const response = await lotrClient.get("/book");
    let books = response.data.docs.map(b => ({ ...b, id: b._id }));
    const hasHobbit = books.some(b => b.name.toLowerCase().includes("hobbit"));
    if (!hasHobbit) {
      books.unshift({
        id: "the-hobbit-manual-id",
        _id: "the-hobbit-manual-id",
        name: "The Hobbit",
        image: "https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg"
      });
    }
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "Error en libros" });
  }
});

// 4. CAPÍTULOS
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "the-hobbit-manual-id") {
      return res.json([{ id: "h1", chapterName: "An Unexpected Party" }, { id: "h2", chapterName: "Roast Mutton" }]);
    }
    const response = await lotrClient.get(`/book/${id}/chapter`);
    res.json(response.data.docs.map(c => ({ ...c, id: c._id })));
  } catch (error) {
    res.status(500).json({ error: "Error en capítulos" });
  }
});

// 5. PELÍCULAS (Con posters inyectados)
app.get("/api/movies", async (req, res) => {
  try {
    const response = await lotrClient.get("/movie");
    const moviePosters = {
      "The Fellowship of the Ring": "https://image.tmdb.org/t/p/original/6oom5QYv7nyJ6pbnGSxK6L6u604.jpg",
      "The Two Towers": "https://image.tmdb.org/t/p/original/5VTN0pR8gcqV3EPUHHfMGnne9vL.jpg",
      "The Return of the King": "https://image.tmdb.org/t/p/original/rCzpEXqKUEAtRyvC6sOK2o7TpsW.jpg",
      "The Hobbit: An Unexpected Journey": "
