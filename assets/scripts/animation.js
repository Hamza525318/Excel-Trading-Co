document.addEventListener("DOMContentLoaded", () => {
    const images = document.querySelectorAll(".bolt-nut-image");
  
    function randomizePositions() {
      images.forEach((image) => {
        const randomTop = Math.random() * 100; // Random value between 0 and 100 for percentage
        const randomLeft = Math.random() * 100; // Random value between 0 and 100 for percentage
        image.style.top = randomTop + "%";
        image.style.left = randomLeft + "%";
      });
    }
  
    // Randomize positions on load
    randomizePositions();
  
    // Optionally, randomize positions every few seconds
    setInterval(randomizePositions, 8000); // Change position every 5 seconds
});