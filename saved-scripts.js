document.addEventListener("DOMContentLoaded", () => {
  
  const recipeGrid = document.getElementById("recipeGrid");
  const modal = document.getElementById("recipeModal");
  const closeModal = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalIngredients = document.getElementById("modalIngredients");
  const modalInstructions = document.getElementById("modalInstructions");
  const modalTags = document.getElementById("modalTags");
  const modalFilters = document.getElementById("modalFilters");

  // Render all recipe cards
  function renderRecipes(list) {
    recipeGrid.innerHTML = "";
    list.forEach(r => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="card-media">
          <img src="${r.image}" alt="${r.title}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />
                  <button class="save-btn" data-id="${r.id}" title="Save recipe" style="position:absolute;top:14px;right:14px;">
          <svg width="22" height="22" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
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

  applyFilters();

  
  // Open modal with recipe details
  recipeGrid.addEventListener("click", e => {
    if (e.target.matches("button[data-id]")) {
      const id = parseInt(e.target.dataset.id, 10);
      const r = recipes.find(x => x.id === id);
      if (!r) return;
      modalTitle.textContent = r.title;
      modalImage.src = r.image;
      // Ingredients with checkboxes
    modalIngredients.innerHTML = r.ingredients
  .map(i => `
    <li>
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
        <input type="checkbox" style="transform:scale(1.2);" />
        <span>${i}</span>
      </label>
    </li>
  `).join("");

   // Instructions as plain paragraphs (no numbers)
   const steps = r.instructions.split("<br>").filter(s => s.trim());
    modalInstructions.innerHTML = steps.map(s => `<p>${s.trim()}</p>`).join("");

  
    modalTags.innerHTML = r.tags.map((t, i) =>
      `<span class="tag tag-${i+1}">${t}</span>`
    ).join("");

    modalFilters.innerHTML = `
      ⏱ ${r.time} min 
      | 🍽 ${r.servings} servings 
      | 🔥 ${r.calories} cal 
      | ⭐ ${r.rating}
    `;
      modal.style.display = "flex";
    }
  });
  
    // ---- Listen for Save Button Clicks ----
    recipeGrid.addEventListener('click', async function(e) {
      const btn = e.target.closest('.save-btn');
      if (!btn) return;
      const recipeId = btn.getAttribute('data-id');
      if (typeof currentUser === "undefined" || !currentUser) {
        alert("You need to be logged in to save recipes.");
        return;
      }
      // Save recipe ID to user's savedRecipes array
      const profileRef = doc(db, "profiles", currentUser.uid);
      try {
        await updateDoc(profileRef, {
          savedRecipes: arrayUnion(recipeId)
        });
        btn.textContent = "Saved!";
        btn.disabled = true;
      } catch (err) {
        alert("Error saving recipe: " + err.message);
      }
    });
  
  // Close modal
  closeModal.addEventListener("click", () => modal.style.display = "none");
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
    
  });

  
  // 🔥 NEW: Filtering logic
  function applyFilters() {
    let filtered = [...recipes];

    // Search
    const searchVal = document.getElementById("filter-search").value.toLowerCase();
    if (searchVal) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchVal) ||
        r.ingredients.join(" ").toLowerCase().includes(searchVal)
      );
    }

    // Rating
    const ratingChecks = [...document.querySelectorAll('input[data-filter="rating"]:checked')];
    if (ratingChecks.length > 0) {
      const minRating = Math.max(...ratingChecks.map(i => Number(i.value)));
      filtered = filtered.filter(r => r.rating >= minRating);
    }

    // Calories
    const calorieChecks = [...document.querySelectorAll('input[data-filter="calories"]:checked')].map(i => i.value);
    if (calorieChecks.length > 0) {
      filtered = filtered.filter(r => {
        return calorieChecks.some(c => {
          if (c === "under-200") return r.calories < 200;
          if (c === "200-400") return r.calories >= 200 && r.calories <= 400;
          if (c === "400-600") return r.calories >= 400 && r.calories <= 600;
          if (c === "600-800") return r.calories >= 600 && r.calories <= 800;
          if (c === "800-plus") return r.calories > 800;
        });
      });
    }

    // Tags (Diet Type)
  const tagChecks = [...document.querySelectorAll('input[data-filter="tags"]:checked')].map(i => i.value);
  if (tagChecks.length > 0) {
    filtered = filtered.filter(r => tagChecks.some(tag => r.tags.includes(tag)));
  }

    // Prep time
    const prepLimit = Number(document.getElementById("filter-prepTime").value);
    filtered = filtered.filter(r => r.time <= prepLimit);

    // Ingredients
    const ingLimit = Number(document.getElementById("filter-ingredients").value);
    filtered = filtered.filter(r => r.ingredients.length <= ingLimit);

    // Render results
 renderRecipes(filtered);
    document.getElementById('totalRecipes').textContent = filtered.length;
    
  }

  // 🔥 NEW: Attach listeners
  const allFilterInputs = document.querySelectorAll("#sidebar input");
  allFilterInputs.forEach(input => input.addEventListener("change", applyFilters));
  document.getElementById("filter-prepTime").addEventListener("input", applyFilters);
  document.getElementById("filter-ingredients").addEventListener("input", applyFilters);
  document.getElementById("filter-search").addEventListener("input", applyFilters);

  // 🔥 NEW: Clear filters button
// Clear filters button
  document.getElementById("clearFilters").addEventListener("click", () => {
  // clear checkboxes
  document.querySelectorAll("#sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
  
  // reset ranges to defaults
  document.getElementById("filter-prepTime").value = 60;
  document.getElementById("filter-ingredients").value = 10;
  
  // clear search
  document.getElementById("filter-search").value = "";
  
  // reapply filters
  applyFilters();
  });

});
