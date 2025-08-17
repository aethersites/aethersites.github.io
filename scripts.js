document.addEventListener("DOMContentLoaded", () => {
  const recipeGrid = document.getElementById("recipeGrid");
  const modal = document.getElementById("recipeModal");
  const closeModal = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalIngredients = document.getElementById("modalIngredients");
  const modalInstructions = document.getElementById("modalInstructions");

  // Render all recipe cards
  function renderRecipes(list) {
    recipeGrid.innerHTML = "";
    list.forEach(r => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="card-media">
          <img src="${r.image}" alt="${r.title}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />
        </div>
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h3 class="mb-1">${r.title}</h3>
            <div class="small">⭐ ${r.rating}</div>
          </div>
          <p class="muted small clamp-2">${r.ingredients.slice(0,3).join(", ")}...</p>
          <div class="muted small mt-2 mb-2">⏱️ ${r.time} min · 👥 ${r.servings} · 🔥 ${r.calories} cal</div>
          <div class="mb-2">
            ${r.tags.map(t => `<span class="badge small">${t}</span>`).join(" ")}
          </div>
          <div class="flex gap-2">
            <button class="btn w-100 primary" data-id="${r.id}">View Recipe</button>
          </div>
        </div>
      `;
      recipeGrid.appendChild(card);
    });
  }

  renderRecipes(recipes);

  // Open modal with recipe details
  recipeGrid.addEventListener("click", e => {
    if (e.target.matches("button[data-id]")) {
      const id = parseInt(e.target.dataset.id, 10);
      const r = recipes.find(x => x.id === id);
      if (!r) return;
      modalTitle.textContent = r.title;
      modalImage.src = r.image;
      modalIngredients.innerHTML = r.ingredients.map(i => `<li>${i}</li>`).join("");
      modalInstructions.innerHTML = r.instructions;
      modal.style.display = "flex";
    }
  });

  // Close modal
  closeModal.addEventListener("click", () => modal.style.display = "none");
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });
});
