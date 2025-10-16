function displayResults() {
  const container = document.getElementById("results");
  container.innerHTML = "";

  results.forEach(outfit => {
    if (!outfit.image) return; // skip if no image

    const div = document.createElement("div");
    div.style.marginBottom = "20px";

    const title = document.createElement("h3");
    title.textContent = outfit.name || "Unnamed Outfit";
    div.appendChild(title);

    const img = document.createElement("img");
    img.src = outfit.image; // only valid URLs
    img.alt = outfit.name || "Outfit Image";
    img.style.width = "200px";
    img.style.height = "auto";
    img.style.borderRadius = "8px";

    div.appendChild(img);
    container.appendChild(div);
  });
}
