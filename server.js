// BACKEND EN ESPAÑOL - EL SEÑOR DE LOS ANILLOS
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
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

console.log("Estado de la API Key:", LOTR_API_KEY ? "✅ Cargada correctamente" : "❌ FALTA LA API KEY");

// ✅ CACHE DE IMÁGENES
const imageCache = new Map();

// ✅ MAPA DE TRADUCCIONES (Inglés -> Español)
const TRANSLATIONS = {
  // Personajes
  "Frodo Baggins": "Frodo Bolsón",
  "Samwise Gamgee": "Samsagaz Gamyi",
  "Peregrin Took": "Peregrin Tuk",
  "Meriadoc Brandybuck": "Meriadoc Brandigamo",
  "Bilbo Baggins": "Bilbo Bolsón",
  "Gandalf": "Gandalf",
  "Aragorn": "Aragorn",
  "Legolas": "Legolas",
  "Gimli": "Gimli",
  "Boromir": "Boromir",
  "Gollum": "Gollum",
  "Saruman": "Saruman",
  "Galadriel": "Galadriel",
  "Elrond": "Elrond",
  "Arwen": "Arwen",
  "Éowyn": "Éowyn",
  "Faramir": "Faramir",
  "Théoden": "Théoden",
  "Éomer": "Éomer",
  "Denethor": "Denethor",
  "Treebeard": "Bárbol",
  "Witch-king of Angmar": "Rey Brujo de Angmar",
  "Gríma Wormtongue": "Gríma Lengua de Serpiente",
  "Sauron": "Sauron",
  "Radagast": "Radagast",
  "Tom Bombadil": "Tom Bombadil",
  "Glorfindel": "Glorfindel",
  "Celeborn": "Celeborn",
  "Haldir": "Haldir",
  "Fëanor": "Fëanor",
  "Fingolfin": "Fingolfin",
  "Turgon": "Turgon",
  "Thingol": "Thingol",
  "Beren": "Beren",
  "Lúthien": "Lúthien",
  "Eärendil": "Eärendil",
  "Elwing": "Elwing",
  "Elros": "Elros",
  "Isildur": "Isildur",
  "Anárion": "Anárion",
  "Elendil": "Elendil",
  
  // Ubicaciones
  "The Shire": "La Comarca",
  "Rivendell": "Rivendel",
  "Moria": "Moria",
  "Lothlórien": "Lothlórien",
  "Fangorn Forest": "Bosque de Fangorn",
  "Isengard": "Isengard",
  "Mordor": "Mordor",
  "Minas Tirith": "Minas Tirith",
  "Minas Morgul": "Minas Morgul",
  "Osgiliath": "Osgiliath",
  "Edoras": "Edoras",
  "Helm's Deep": "Abismo de Helm",
  "Dunharrow": "Dunharrow",
  "The Black Gate": "La Puerta Negra",
  "Cirith Ungol": "Cirith Ungol",
  "Mount Doom": "Monte del Destino",
  "The Dead Marshes": "Ciénagas de los Muertos",
  "Bree": "Bree",
  "Weathertop": "Amon Sûl (La Cima de los Vientos)",
  "The Prancing Pony": "El Poney Pisador",
  "Bag End": "Bolsón Cerrado",
  "The Grey Havens": "Los Puertos Grises",
  "The Lonely Mountain": "La Montaña Solitaria",
  "Dale": "Valle",
  "Esgaroth": "Esgaroth",
  "Mirkwood": "Bosque Negro",
  "The Old Forest": "El Viejo Bosque",
  "The Barrow-downs": "Quebradas de los Túmulos",
  "Fornost": "Fornost",
  "Annúminas": "Annúminas",
  "Carn Dûm": "Carn Dûm",
  "Gondor": "Gondor",
  "Rohan": "Rohan",
  "Arnor": "Arnor",
  "Eriador": "Eriador",
  "Rhovanion": "Rhovanion",
  "Harad": "Harad",
  "Khand": "Khand",
  "Rhûn": "Rhûn",
  
  // Libros (títulos en español)
  "The Fellowship of the Ring": "La Comunidad del Anillo",
  "The Two Towers": "Las Dos Torres",
  "The Return of the King": "El Retorno del Rey",
  "The Hobbit": "El Hobbit",
  "The Silmarillion": "El Silmarillion",
  "Unfinished Tales": "Cuentos Inconclusos",
  "The Children of Húrin": "Los Hijos de Húrin",
  "Beren and Lúthien": "Beren y Lúthien",
  "The Fall of Gondolin": "La Caída de Gondolin",
  
  // Películas
  "The Fellowship of the Ring": "La Comunidad del Anillo",
  "The Two Towers": "Las Dos Torres", 
  "The Return of the King": "El Retorno del Rey"
};

// ✅ IMÁGENES PARA PERSONAJES (con nombres en español)
const KNOWN_CHARACTER_IMAGES = {
  "Frodo Bolsón": "https://cdn.costumewall.com/wp-content/uploads/2017/09/frodo-baggins.jpg",
  "Samsagaz Gamyi": "https://cdn.costumewall.com/wp-content/uploads/2017/09/samwise-gamgee.jpg",
  "Peregrin Tuk": "https://cdn.costumewall.com/wp-content/uploads/2017/09/pippin.jpg",
  "Meriadoc Brandigamo": "https://cdn.costumewall.com/wp-content/uploads/2017/09/merry.jpg",
  "Bilbo Bolsón": "https://cdn.costumewall.com/wp-content/uploads/2017/09/bilbo-baggins.jpg",
  "Gandalf": "https://cdn.costumewall.com/wp-content/uploads/2017/09/gandalf.jpg",
  "Aragorn": "https://cdn.costumewall.com/wp-content/uploads/2017/09/aragorn.jpg",
  "Legolas": "https://cdn.costumewall.com/wp-content/uploads/2017/09/legolas-greenleaf.jpg",
  "Gimli": "https://cdn.costumewall.com/wp-content/uploads/2017/09/gimli.jpg",
  "Boromir": "https://cdn.costumewall.com/wp-content/uploads/2017/09/boromir.jpg",
  "Gollum": "https://cdn.costumewall.com/wp-content/uploads/2017/09/gollum.jpg",
  "Saruman": "https://cdn.costumewall.com/wp-content/uploads/2017/09/saruman.jpg",
  "Galadriel": "https://cdn.costumewall.com/wp-content/uploads/2017/09/galadriel.jpg",
  "Elrond": "https://cdn.costumewall.com/wp-content/uploads/2017/09/elrond.jpg",
  "Arwen": "https://cdn.costumewall.com/wp-content/uploads/2017/09/arwen.jpg",
  "Éowyn": "https://cdn.costumewall.com/wp-content/uploads/2017/09/eowyn.jpg",
  "Faramir": "https://cdn.costumewall.com/wp-content/uploads/2017/09/faramir.jpg",
  "Théoden": "https://cdn.costumewall.com/wp-content/uploads/2017/09/theoden.jpg",
  "Éomer": "https://cdn.costumewall.com/wp-content/uploads/2017/09/eomer.jpg",
  "Denethor": "https://cdn.costumewall.com/wp-content/uploads/2017/09/denethor.jpg",
  "Bárbol": "https://cdn.costumewall.com/wp-content/uploads/2017/09/treebeard.jpg",
  "Rey Brujo de Angmar": "https://cdn.costumewall.com/wp-content/uploads/2017/09/witch-king.jpg",
  "Gríma Lengua de Serpiente": "https://cdn.costumewall.com/wp-content/uploads/2017/09/grima-wormtongue.jpg",
  "Sauron": "https://cdn.costumewall.com/wp-content/uploads/2017/09/sauron.jpg"
};

// ✅ IMÁGENES PARA UBICACIONES (con nombres en español)
const KNOWN_LOCATION_IMAGES = {
  "La Comarca": "https://cdn.costumewall.com/wp-content/uploads/2017/09/the-shire.jpg",
  "Rivendel": "https://cdn.costumewall.com/wp-content/uploads/2017/09/rivendell.jpg",
  "Moria": "https://cdn.costumewall.com/wp-content/uploads/2017/09/moria.jpg",
  "Lothlórien": "https://cdn.costumewall.com/wp-content/uploads/2017/09/lothlorien.jpg",
  "Bosque de Fangorn": "https://cdn.costumewall.com/wp-content/uploads/2017/09/fangorn-forest.jpg",
  "Isengard": "https://cdn.costumewall.com/wp-content/uploads/2017/09/isengard.jpg",
  "Mordor": "https://cdn.costumewall.com/wp-content/uploads/2017/09/mordor.jpg",
  "Minas Tirith": "https://cdn.costumewall.com/wp-content/uploads/2017/09/minas-tirith.jpg",
  "Minas Morgul": "https://cdn.costumewall.com/wp-content/uploads/2017/09/minas-morgul.jpg",
  "Osgiliath": "https://cdn.costumewall.com/wp-content/uploads/2017/09/osgiliath.jpg",
  "Edoras": "https://cdn.costumewall.com/wp-content/uploads/2017/09/edoras.jpg",
  "Abismo de Helm": "https://cdn.costumewall.com/wp-content/uploads/2017/09/helms-deep.jpg",
  "La Puerta Negra": "https://cdn.costumewall.com/wp-content/uploads/2017/09/black-gate.jpg",
  "Cirith Ungol": "https://cdn.costumewall.com/wp-content/uploads/2017/09/cirith-ungol.jpg",
  "Monte del Destino": "https://cdn.costumewall.com/wp-content/uploads/2017/09/mount-doom.jpg",
  "Ciénagas de los Muertos": "https://cdn.costumewall.com/wp-content/uploads/2017/09/dead-marshes.jpg",
  "Bree": "https://cdn.costumewall.com/wp-content/uploads/2017/09/bree.jpg",
  "Amon Sûl": "https://cdn.costumewall.com/wp-content/uploads/2017/09/weathertop.jpg",
  "El Poney Pisador": "https://cdn.costumewall.com/wp-content/uploads/2017/09/prancing-pony.jpg",
  "Bolsón Cerrado": "https://cdn.costumewall.com/wp-content/uploads/2017/09/bag-end.jpg",
  "Los Puertos Grises": "https://cdn.costumewall.com/wp-content/uploads/2017/09/grey-havens.jpg",
  "La Montaña Solitaria": "https://cdn.costumewall.com/wp-content/uploads/2017/09/lonely-mountain.jpg",
  "Bosque Negro": "https://cdn.costumewall.com/wp-content/uploads/2017/09/mirkwood.jpg",
  "Gondor": "https://cdn.costumewall.com/wp-content/uploads/2017/09/gondor.jpg",
  "Rohan": "https://cdn.costumewall.com/wp-content/uploads/2017/09/rohan.jpg"
};

// ✅ PORTADAS DE LIBROS (con títulos en español)
const KNOWN_BOOK_COVERS = {
  "La Comunidad del Anillo": "https://covers.openlibrary.org/b/id/7984916-L.jpg",
  "Las Dos Torres": "https://covers.openlibrary.org/b/id/7984917-L.jpg",
  "El Retorno del Rey": "https://covers.openlibrary.org/b/id/7984918-L.jpg",
  "El Hobbit": "https://covers.openlibrary.org/b/id/8228691-L.jpg",
  "El Silmarillion": "https://covers.openlibrary.org/b/id/8228695-L.jpg",
  "Cuentos Inconclusos": "https://covers.openlibrary.org/b/id/8228696-L.jpg",
  "Los Hijos de Húrin": "https://covers.openlibrary.org/b/id/8228697-L.jpg"
};

// ✅ PÓSTERS DE PELÍCULAS (con títulos en español)
const KNOWN_MOVIE_POSTERS = {
  "La Comunidad del Anillo": "https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_FMjpg_UX1000_.jpg",
  "Las Dos Torres": "https://m.media-amazon.com/images/M/MV5BN2Y5ZTVhOGQtMmI5NS00ZmNmLTg5MTYtYzkwNTVhOGM2MjQxXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_FMjpg_UX1000_.jpg",
  "El Retorno del Rey": "https://m.media-amazon.com/images/M/MV5BNzA5ZDNlZWMtM2NhNS00NDJjLTk4NDItYTRmY2EwMWZlMTY3XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_FMjpg_UX1000_.jpg"
};

// --- HELPER: Traducir nombre ---
function translateName(englishName) {
  return TRANSLATIONS[englishName] || englishName;
}

// --- HELPER: Petición a The One API ---
async function fetchLOTR(endpoint) {
  try {
    const url = `${LOTR_BASE_URL}${endpoint}`;
    console.log(`🌐 Llamando a: ${url}`);
    
    const apiResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOTR_API_KEY}`
      }
    });

    if (!apiResponse.ok) {
      throw new Error(`LOTR API error: ${apiResponse.status}`);
    }

    return await apiResponse.json();
  } catch (error) {
    console.error("❌ Error en fetchLOTR:", error.message);
    throw error;
  }
}

// --- HELPER: Imagen de personaje (con nombres en español) ---
async function getCharacterImage(spanishName) {
  const cacheKey = `char:${spanishName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  // Buscar imagen por nombre en español
  let imageUrl = KNOWN_CHARACTER_IMAGES[spanishName];
  
  if (!imageUrl) {
    // Búsqueda flexible (sin tildes, mayúsculas, etc.)
    const normalizedSpanish = spanishName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const [key, url] of Object.entries(KNOWN_CHARACTER_IMAGES)) {
      const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (normalizedKey.includes(normalizedSpanish) || normalizedSpanish.includes(normalizedKey)) {
        imageUrl = url;
        break;
      }
    }
  }

  if (imageUrl) {
    console.log(`✅ Imagen encontrada para ${spanishName}`);
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
  }

  // Fallback: avatar con iniciales
  console.log(`⚠️ No hay imagen para ${spanishName}, usando avatar`);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(spanishName)}&size=400&background=10b981&color=fff&bold=true&length=2&font-size=0.33`;
  imageCache.set(cacheKey, fallbackUrl);
  return fallbackUrl;
}

// --- HELPER: Imagen de ubicación (con nombres en español) ---
async function getLocationImage(spanishName) {
  const cacheKey = `loc:${spanishName}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  // Buscar en ubicaciones conocidas
  let imageUrl = KNOWN_LOCATION_IMAGES[spanishName];
  
  if (!imageUrl) {
    // Búsqueda flexible
    const normalizedSpanish = spanishName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const [key, url] of Object.entries(KNOWN_LOCATION_IMAGES)) {
      const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (normalizedKey.includes(normalizedSpanish) || normalizedSpanish.includes(normalizedKey)) {
        imageUrl = url;
        break;
      }
    }
  }

  if (imageUrl) {
    console.log(`📍 Imagen encontrada para ubicación: ${spanishName}`);
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
  }

  // Fallback
  const fallbackUrl = `https://via.placeholder.com/400x300/8B4513/FFFFFF?text=${encodeURIComponent(spanishName)}`;
  imageCache.set(cacheKey, fallbackUrl);
  return fallbackUrl;
}

// --- HELPER: Portada de libro (con títulos en español) ---
async function getBookCover(spanishTitle) {
  const cacheKey = `book:${spanishTitle}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  // 1. Verificar si tenemos portada conocida
  if (KNOWN_BOOK_COVERS[spanishTitle]) {
    console.log(`📚 Usando portada conocida para: ${spanishTitle}`);
    imageCache.set(cacheKey, KNOWN_BOOK_COVERS[spanishTitle]);
    return KNOWN_BOOK_COVERS[spanishTitle];
  }

  // 2. Intentar con OpenLibrary (buscando en inglés)
  try {
    // Encontrar el título en inglés correspondiente
    let englishTitle = spanishTitle;
    for (const [eng, esp] of Object.entries(TRANSLATIONS)) {
      if (esp === spanishTitle) {
        englishTitle = eng;
        break;
      }
    }
    
    console.log(`🔍 Buscando portada para: ${spanishTitle} (inglés: ${englishTitle})`);
    
    const url = `${OPEN_LIBRARY_URL}?title=${encodeURIComponent(englishTitle)}&limit=5`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.docs && data.docs.length > 0) {
      for (const doc of data.docs) {
        if (doc.cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          console.log(`✅ Portada encontrada en OpenLibrary: ${coverUrl}`);
          imageCache.set(cacheKey, coverUrl);
          return coverUrl;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error en OpenLibrary para "${spanishTitle}":`, error.message);
  }

  // 3. Fallback final
  const fallback = `https://via.placeholder.com/300x450/2c3e50/FFFFFF?text=${encodeURIComponent(spanishTitle)}`;
  imageCache.set(cacheKey, fallback);
  return fallback;
}

// --- HELPER: Póster de película (con títulos en español) ---
async function getMoviePoster(spanishTitle) {
  const cacheKey = `movie:${spanishTitle}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  // Usar pósters conocidos
  const posterUrl = KNOWN_MOVIE_POSTERS[spanishTitle] || 
                    `https://via.placeholder.com/300x450/000000/FFFFFF?text=${encodeURIComponent(spanishTitle)}`;
  
  console.log(`🎬 Póster para ${spanishTitle}`);
  imageCache.set(cacheKey, posterUrl);
  return posterUrl;
}

// --- ENDPOINTS EN ESPAÑOL ---

// ✅ PERSONAJES (en español)
app.get("/api/characters", async (req, res) => {
  try {
    const { page = 1, limit = 100, name, race } = req.query;

    let endpoint = `/character?page=${page}&limit=${limit}`;
    if (name) endpoint += `&name=/${encodeURIComponent(name)}/i`;
    if (race) endpoint += `&race=${encodeURIComponent(race)}`;

    const data = await fetchLOTR(endpoint);

    const enriched = await Promise.all(
      (data.docs || []).map(async (char) => {
        const spanishName = translateName(char.name);
        return {
          ...char,
          name: spanishName, // ¡NOMBRE EN ESPAÑOL!
          originalName: char.name, // Guardamos el original por si acaso
          image: await getCharacterImage(spanishName)
        };
      })
    );

    res.json({
      total: data.total,
      page: parseInt(page),
      limit: parseInt(limit),
      results: enriched
    });
  } catch (error) {
    console.error("❌ Error en /api/characters:", error.message);
    res.status(500).json({ error: "Error obteniendo personajes" });
  }
});

// ✅ PERSONAJE POR ID (en español)
app.get("/api/characters/:id", async (req, res) => {
  try {
    const data = await fetchLOTR(`/character/${req.params.id}`);
    const char = data.docs[0];
    if (!char) return res.status(404).json({ error: "No encontrado" });

    const spanishName = translateName(char.name);
    
    res.json({
      ...char,
      name: spanishName, // ¡NOMBRE EN ESPAÑOL!
      originalName: char.name,
      image: await getCharacterImage(spanishName)
    });
  } catch (error) {
    res.status(404).json({ error: "No encontrado" });
  }
});

// ✅ UBICACIONES (en español)
app.get("/api/locations", async (req, res) => {
  try {
    console.log("📍 Obteniendo ubicaciones...");
    const data = await fetchLOTR("/location");
    
    console.log(`📍 Encontradas ${data.docs?.length || 0} ubicaciones`);
    
    const locations = await Promise.all(
      (data.docs || []).map(async (loc) => {
        const spanishName = translateName(loc.name);
        return {
          ...loc,
          name: spanishName, // ¡NOMBRE EN ESPAÑOL!
          originalName: loc.name,
          image: await getLocationImage(spanishName)
        };
      })
    );
    
    res.json(locations);
  } catch (error) {
    console.error("❌ Error en /api/locations:", error.message);
    res.status(500).json([]);
  }
});

// ✅ UBICACIÓN POR ID (en español)
app.get("/api/locations/:id", async (req, res) => {
  try {
    const data = await fetchLOTR(`/location/${req.params.id}`);
    const location = data.docs[0];
    
    if (!location) {
      return res.status(404).json({ error: "Ubicación no encontrada" });
    }
    
    const spanishName = translateName(location.name);
    
    res.json({
      ...location,
      name: spanishName, // ¡NOMBRE EN ESPAÑOL!
      originalName: location.name,
      image: await getLocationImage(spanishName)
    });
  } catch (error) {
    console.error("❌ Error en /api/locations/:id:", error.message);
    res.status(404).json({ error: "Ubicación no encontrada" });
  }
});

// ✅ LIBROS (en español)
app.get("/api/books", async (req, res) => {
  try {
    console.log("📚 Obteniendo libros...");
    const data = await fetchLOTR("/book");
    
    const books = await Promise.all(
      (data.docs || []).map(async (book) => {
        const spanishTitle = translateName(book.name);
        return {
          ...book,
          name: spanishTitle, // ¡TÍTULO EN ESPAÑOL!
          originalName: book.name,
          cover: await getBookCover(spanishTitle)
        };
      })
    );
    
    console.log(`📚 ${books.length} libros procesados`);
    res.json(books);
  } catch (error) {
    console.error("❌ Error en /api/books:", error.message);
    res.status(500).json([]);
  }
});

// ✅ CAPÍTULOS DE UN LIBRO (los capítulos normalmente ya están en español)
app.get("/api/books/:id/chapters", async (req, res) => {
  try {
    const data = await fetchLOTR(`/book/${req.params.id}/chapter`);
    res.json(data.docs || []);
  } catch (error) {
    console.error("❌ Error en /api/books/:id/chapters:", error.message);
    res.status(500).json({ error: "Error obteniendo capítulos" });
  }
});

// ✅ PELÍCULAS (en español)
app.get("/api/movies", async (req, res) => {
  try {
    console.log("🎬 Obteniendo películas...");
    const data = await fetchLOTR("/movie");
    
    const movies = await Promise.all(
      (data.docs || []).map(async (movie) => {
        const spanishTitle = translateName(movie.name);
        return {
          ...movie,
          name: spanishTitle, // ¡TÍTULO EN ESPAÑOL!
          originalName: movie.name,
          poster: await getMoviePoster(spanishTitle)
        };
      })
    );
    
    console.log(`🎬 ${movies.length} películas procesadas`);
    res.json(movies);
  } catch (error) {
    console.error("❌ Error en /api/movies:", error.message);
    res.status(500).json([]);
  }
});

// ✅ ENDPOINT DE TRADUCCIONES (útil para depuración)
app.get("/api/translations", (req, res) => {
  res.json(TRANSLATIONS);
});

// ✅ ENDPOINT DE DIAGNÓSTICO
app.get("/api/debug/images", (req, res) => {
  res.json({
    characters: Object.keys(KNOWN_CHARACTER_IMAGES).length,
    locations: Object.keys(KNOWN_LOCATION_IMAGES).length,
    books: Object.keys(KNOWN_BOOK_COVERS).length,
    movies: Object.keys(KNOWN_MOVIE_POSTERS).length,
    translations: Object.keys(TRANSLATIONS).length,
    cacheSize: imageCache.size
  });
});

// ✅ LIMPIAR CACHÉ
app.post("/api/cache/clear", (req, res) => {
  imageCache.clear();
  res.json({ 
    message: "Caché de imágenes limpiada",
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor LOTR en ESPAÑOL - puerto ${PORT}`);
  console.log(`📸 Personajes con imágenes: ${Object.keys(KNOWN_CHARACTER_IMAGES).length}`);
  console.log(`📍 Ubicaciones con imágenes: ${Object.keys(KNOWN_LOCATION_IMAGES).length}`);
  console.log(`📚 Libros con portadas: ${Object.keys(KNOWN_BOOK_COVERS).length}`);
  console.log(`🎬 Películas con pósters: ${Object.keys(KNOWN_MOVIE_POSTERS).length}`);
  console.log(`🌍 Traducciones disponibles: ${Object.keys(TRANSLATIONS).length}`);
  console.log(`💾 Caché inicial: ${imageCache.size} entradas\n`);
  
  // Mostrar algunos ejemplos
  console.log("📖 Ejemplos de traducciones:");
  console.log("  - Frodo Baggins → Frodo Bolsón");
  console.log("  - Samwise Gamgee → Samsagaz Gamyi");
  console.log("  - The Shire → La Comarca");
  console.log("  - The Fellowship of the Ring → La Comunidad del Anillo\n");
});