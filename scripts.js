document.addEventListener("DOMContentLoaded", () => {
  const recipeGrid = document.getElementById("recipeGrid");
  const modal = document.getElementById("recipeModal");
  const closeModal = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalIngredients = document.getElementById("modalIngredients");
  const modalInstructions = document.getElementById("modalInstructions");

  // Extra selectors for new features
  const mainSearchInput = document.querySelector('.hero .searchbar input');
  const mainSearchBtn = document.querySelector('.hero .searchbar .btn');
  const cuisineCards = document.querySelectorAll('.section .grid.cols-3 .card');
  const loadMoreBtn = document.querySelector('.text-center.mt-4 .btn');

  // State for filters and paging
  let filterState = {
    search: "",
    cuisine: null,
    offset: 0,
    limit: 9 // Adjust to however many you want per page
  };

  // Render all recipe cards
  function renderRecipes(list, resetPaging = true) {
    if (resetPaging) filterState.offset = 0;
    recipeGrid.innerHTML = "";
    let subset = list.slice(filterState.offset, filterState.offset + filterState.limit);
    subset.forEach(r => {
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
    // Show/hide Load More button
    if (list.length > filterState.offset + filterState.limit) {
      loadMoreBtn.style.display = "";
    } else {
      loadMoreBtn.style.display = "none";
    }
  }

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

  // 🔥 Filtering logic
  function applyFilters(resetPaging = true) {
    let filtered = [...recipes];

    // Search (sidebar and/or main search bar)
    const sidebarSearchVal = document.getElementById("filter-search").value.toLowerCase();
    const mainSearchVal = mainSearchInput ? mainSearchInput.value.toLowerCase() : "";
    filterState.search = mainSearchVal || sidebarSearchVal;
    if (filterState.search) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(filterState.search) ||
        r.ingredients.join(" ").toLowerCase().includes(filterState.search)
      );
    }

    // Cuisine
    if (filterState.cuisine) {
      filtered = filtered.filter(r => {
        // Guess cuisine from tags/title, since your data doesn't have a .cuisine field
        const cuisineLookup = filterState.cuisine.toLowerCase();
        return r.tags.some(tag => tag.toLowerCase() === cuisineLookup) ||
               (r.title.toLowerCase().includes(cuisineLookup));
      });
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

    // Render results (with paging)
    renderRecipes(filtered, resetPaging);
    // Update the counter for filtered and total recipes
  const recipeCounter = document.getElementById("recipeCounter");
  const totalCount = recipes.length;
  const filteredCount = filtered.length;
  if (recipeCounter) {
    recipeCounter.textContent = `Showing ${filteredCount} of ${totalCount} recipe${totalCount !== 1 ? "s" : ""}`;
   } 
    // Save filtered list for paging
    filterState.filteredList = filtered;
  }

  // Attach listeners for all filters
  const allFilterInputs = document.querySelectorAll("#sidebar input");
  allFilterInputs.forEach(input => input.addEventListener("change", () => applyFilters()));
  document.getElementById("filter-prepTime").addEventListener("input", () => applyFilters());
  document.getElementById("filter-ingredients").addEventListener("input", () => applyFilters());
  document.getElementById("filter-search").addEventListener("input", () => applyFilters());

  // Main search bar events
  if (mainSearchInput) {
    mainSearchInput.addEventListener("input", () => {
      // Clear sidebar search to avoid confusion
      document.getElementById("filter-search").value = "";
      applyFilters();
    });
    if (mainSearchBtn) {
      mainSearchBtn.addEventListener("click", () => {
        document.getElementById("filter-search").value = "";
        applyFilters();
      });
    }
  }

  // Clear filters button
  document.getElementById("clearFilters").addEventListener("click", () => {
    // clear checkboxes
    document.querySelectorAll("#sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
    // reset ranges to defaults
    document.getElementById("filter-prepTime").value = 60;
    document.getElementById("filter-ingredients").value = 10;
    // clear both search bars
    document.getElementById("filter-search").value = "";
    if (mainSearchInput) mainSearchInput.value = "";
    // reset cuisine
    filterState.cuisine = null;
    // reapply filters
    applyFilters();
  });

  // Cuisine cards (Browse by Cuisine)
  cuisineCards.forEach(card => {
    card.addEventListener("click", () => {
      const name = card.querySelector('.mb-1')?.textContent?.trim();
      if (name) {
        filterState.cuisine = name;
        // Clear search bars and all checkboxes
        document.getElementById("filter-search").value = "";
        if (mainSearchInput) mainSearchInput.value = "";
        document.querySelectorAll("#sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
        // Reset other filters
        document.getElementById("filter-prepTime").value = 60;
        document.getElementById("filter-ingredients").value = 10;
        applyFilters();
        // Scroll to recipes grid
        recipeGrid.scrollIntoView({behavior: 'smooth'});
      }
    });
  });

  // Paging: Load More Recipes button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      filterState.offset += filterState.limit;
      // Use the saved filteredList for paging
      const list = filterState.filteredList || [...recipes];
      renderRecipes(list, false);
    });
  }

  // Initial render
  applyFilters();
});
