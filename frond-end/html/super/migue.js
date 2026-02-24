const gallery = document.getElementById("gallery");

// Función para generar imágenes aleatorias (puedes cambiar la fuente)
function addImages(count = 3) {
  for (let i = 0; i < count; i++) {
    const img = document.createElement("img");
    img.src = `https://www.adobe.com/es/creativecloud/photography/discover/media_1b623f583cce04dfdac563b5971e491a884471e44.png?width=750&format=png&optimize=medium${200 + Math.floor(Math.random() * 200)}?sig=${Math.random()}`;
    gallery.appendChild(img);
  }
}

// Cargar las primeras imágenes
addImages();

// // Cargar más imágenes al hacer scroll (scroll infinito)
// window.addEventListener("scroll", () => {
//   if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
//     addImages();
//   }
// });
addImages(1);
