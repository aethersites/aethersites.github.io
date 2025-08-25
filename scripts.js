(() => {
  // Utility: simple debounce
  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Utility: create element with classes and optional text
  function el(tag, { cls = "", text = null, attrs = {} } = {}) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text !== null) d.textContent = text;
    for (const [k, v] of Object.entries(attrs)) {
      d.setAttribute(k, v);
    }
    return d;
  }

  // Focusable selector for trap
  const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  document.addEventListener("DOMContentLoaded", () => {
    // --- required DOM
    const recipeGrid = document.getElementById("recipeGrid");
    const modal = document.getElementById("recipeModal");
    const closeModal = document.getElementById("closeModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalImage = document.getElementById("modalImage");
    const modalIngredients = document.getElementById("modalIngredients");
    const modalInstructions = document.getElementById("modalInstructions");
    const modalTags = document.getElementById("modalTags");
    const modalFilters = document.getElementById("modalFilters");
    const totalRecipesEl = document.getElementById("totalRecipes");

    // early exit if crucial things missing
    if (!recipeGrid) {
      console.warn("recipeGrid not found. Aborting render.");
      return;
    }
    if (!modal) {
      console.warn("recipeModal not found. Modal features disabled.");
    }

    // --- cached filters (avoid repeated querySelector)
    const filterSearch = document.getElementById("filter-search");
    const filterPrepTime = document.getElementById("filter-prepTime");
    const filterIngredients = document.getElementById("filter-ingredients");
    const clearFiltersBtn = document.getElementById("clearFilters");
    const sidebarInputs = document.querySelectorAll("#sidebar input");

    // verify recipes exists
    if (!Array.isArray(window.recipes)) {
      console.warn("window.recipes is not available or not an array. Nothing to render.");
      recipeGrid.innerHTML = "<p class='muted'>No recipes available.</p>";
      return;
    }

    // ---- render functions (safe: use createElement / textContent)
    function createCard(recipe) {
      const article = el("article", { cls: "card" });

      // media
      const media = el("div", { cls: "card-media" });
      const img = el("img", { attrs: { src: recipe.image || "", alt: recipe.title || "Recipe image" } });
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "inherit";
      media.appendChild(img);

      // body
      const body = el("div", { cls: "card-body" });
      const header = el("div", { cls: "flex items-center justify-between" });
      const h3 = el("h3", { text: recipe.title || "" });
      h3.className = "mb-1";
      const rating = el("div", { cls: "small", text: `⭐ ${recipe.rating ?? "-"}` });
      header.appendChild(h3);
      header.appendChild(rating);

      const ingredientPreview = el("p", { cls: "muted small clamp-2" });
      const previewList = (recipe.ingredients || []).slice(0, 3).join(", ");
      ingredientPreview.textContent = previewList ? previewList + "…" : "";

      const meta = el("div", { cls: "muted small mt-2 mb-2", text: `⏱️ ${recipe.time ?? "-"} min · 👥 ${recipe.servings ?? "-"} · 🔥 ${recipe.calories ?? "-"} cal` });

      const tagWrap = el("div", { cls: "mb-2" });
      (recipe.tags || []).forEach(t => {
        const badge = el("span", { cls: "badge small", text: t });
        tagWrap.appendChild(badge);
        tagWrap.appendChild(document.createTextNode(" "));
      });

      const controls = el("div", { cls: "flex gap-2" });
      const viewBtn = el("button", { cls: "btn w-100 primary", text: "View Recipe", attrs: { "data-id": String(recipe.id), "aria-label": `View recipe ${recipe.title}` } });
      viewBtn.type = "button"; // prevent accidental form submit
      controls.appendChild(viewBtn);

      // assemble
      body.appendChild(header);
      body.appendChild(ingredientPreview);
      body.appendChild(meta);
      body.appendChild(tagWrap);
      body.appendChild(controls);

      article.appendChild(media);
      article.appendChild(body);
      return article;
    }

    function renderRecipes(list) {
      // clear
      recipeGrid.innerHTML = "";
      // small fragment append for performance
      const frag = document.createDocumentFragment();
      list.forEach(r => frag.appendChild(createCard(r)));
      recipeGrid.appendChild(frag);
      if (totalRecipesEl) totalRecipesEl.textContent = list.length;
    }

    // initial render
    applyFilters(); // defined below will call renderRecipes

    // --- Modal open/close + accessibility
    let lastFocused = null;

    function openModalForRecipe(r, triggerElement) {
      if (!modal) return;
      lastFocused = triggerElement || document.activeElement;

      // set content safely
      modalTitle.textContent = r.title || "";
      modalImage.src = r.image || "";
      modalImage.alt = r.title || "Recipe image";

      // Ingredients with checkboxes (build nodes)
      modalIngredients.innerHTML = "";
      const ingList = el("ul");
      (r.ingredients || []).forEach((ingredient, idx) => {
        const li = el("li");
        const label = el("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.cursor = "pointer";

        const cb = el("input", { attrs: { type: "checkbox", "data-ingredient-index": String(idx) } });
        cb.style.transform = "scale(1.2)";
        const span = el("span", { text: ingredient });

        label.appendChild(cb);
        label.appendChild(span);
        li.appendChild(label);
        ingList.appendChild(li);
      });
      modalIngredients.appendChild(ingList);

      // Instructions: assume newline-separated plaintext; render ordered list
      modalInstructions.innerHTML = "";
      const instRaw = r.instructions ?? "";
      // accept both <br> separators or newline; normalize
      const normalized = instRaw.replace(/<br\s*\/?>/gi, "\n");
      const steps = normalized.split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (steps.length) {
        const ol = el("ol");
        steps.forEach(step => {
          const li = el("li", { text: step });
          ol.appendChild(li);
        });
        modalInstructions.appendChild(ol);
      } else {
        modalInstructions.textContent = "";
      }

      // Tags
      modalTags.innerHTML = "";
      (r.tags || []).forEach((t, i) => {
        const span = el("span", { cls: `tag tag-${i+1}`, text: t });
        modalTags.appendChild(span);
        modalTags.appendChild(document.createTextNode(" "));
      });

      // Filters/metadata
      modalFilters.textContent = `⏱ ${r.time ?? "-"} min | 🍽 ${r.servings ?? "-"} servings | 🔥 ${r.calories ?? "-"} cal | ⭐ ${r.rating ?? "-"}`;

      // show modal
      modal.classList.add("open");
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");

      // focus management: focus first focusable inside modal (close button)
      const focusable = modal.querySelectorAll(FOCUSABLE);
      if (focusable && focusable.length) {
        focusable[0].focus();
      }

      // set up focus trap
      trapFocus(modal);
    }

    function closeModalFn() {
      if (!modal) return;
      modal.classList.remove("open");
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      releaseFocusTrap();
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    // click delegation: open modal when View Recipe clicked
    recipeGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const id = Number(btn.getAttribute("data-id"));
      const r = window.recipes.find(x => Number(x.id) === id);
      if (!r) return;
      openModalForRecipe(r, btn);
    });

    // support keyboard activation (Enter/Space) on recipe buttons (if not naturally a button, left for safety)
    recipeGrid.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("button[data-id]")) {
        e.preventDefault();
        e.target.click();
      }
    });

    // modal close handlers
    if (closeModal) closeModal.addEventListener("click", closeModalFn);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModalFn();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
          closeModalFn();
        }
      });
    }

    // Focus trap implementation
    let trap = null;
    function trapFocus(root) {
      const focusables = Array.from(root.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      trap = function(e) {
        if (e.key !== "Tab") return;
        if (e.shiftKey) {
          // shift+tab
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener("keydown", trap);
    }
    function releaseFocusTrap() {
      if (trap) {
        document.removeEventListener("keydown", trap);
        trap = null;
      }
    }

    // --- Filters logic
    function parseCheckedValues(selector) {
      return Array.from(document.querySelectorAll(selector + ":checked")).map(i => i.value);
    }

    function applyFilters() {
      let filtered = [...window.recipes];

      // Search (debounced input will call this, but be safe)
      const searchVal = (filterSearch?.value || "").trim().toLowerCase();
      if (searchVal) {
        filtered = filtered.filter(r =>
          (r.title || "").toLowerCase().includes(searchVal) ||
          (Array.isArray(r.ingredients) ? r.ingredients.join(" ").toLowerCase() : "").includes(searchVal)
        );
      }

      // Rating: choose highest selected rating checkbox to act as minimum
      const ratingChecks = Array.from(document.querySelectorAll('input[data-filter="rating"]:checked'));
      if (ratingChecks.length > 0) {
        const minRating = Math.max(...ratingChecks.map(i => Number(i.value) || 0));
        filtered = filtered.filter(r => Number(r.rating) >= minRating);
      }

      // Calories (multi-select ranges)
      const calorieChecks = parseCheckedValues('input[data-filter="calories"]');
      if (calorieChecks.length > 0) {
        filtered = filtered.filter(r => {
          const cal = Number(r.calories) || 0;
          return calorieChecks.some(c => {
            switch (c) {
              case "under-200": return cal < 200;
              case "200-400": return cal >= 200 && cal <= 400;
              case "400-600": return cal >= 400 && cal <= 600;
              case "600-800": return cal >= 600 && cal <= 800;
              case "800-plus": return cal > 800;
              default: return false;
            }
          });
        });
      }

      // Tags (diet)
      const tagChecks = parseCheckedValues('input[data-filter="tags"]');
      if (tagChecks.length > 0) {
        filtered = filtered.filter(r => (r.tags || []).some(tag => tagChecks.includes(tag)));
      }

      // Prep time (value may be empty)
      const prepLimit = Number(filterPrepTime?.value);
      if (!Number.isNaN(prepLimit)) {
        filtered = filtered.filter(r => Number(r.time) <= prepLimit);
      }

      // Ingredients count limit
      const ingLimit = Number(filterIngredients?.value);
      if (!Number.isNaN(ingLimit)) {
        filtered = filtered.filter(r => (r.ingredients || []).length <= ingLimit);
      }

      // Render results
      renderRecipes(filtered);
    }

    // debounce search for performance
    const debouncedApplyFilters = debounce(applyFilters, 200);

    // attach listeners to filters
    sidebarInputs.forEach(input => input.addEventListener("change", applyFilters));
    if (filterPrepTime) filterPrepTime.addEventListener("input", debouncedApplyFilters);
    if (filterIngredients) filterIngredients.addEventListener("input", debouncedApplyFilters);
    if (filterSearch) filterSearch.addEventListener("input", debouncedApplyFilters);

    // Clear filters
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        document.querySelectorAll("#sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
        if (filterPrepTime) filterPrepTime.value = filterPrepTime.getAttribute("data-default") || "";
        if (filterIngredients) filterIngredients.value = filterIngredients.getAttribute("data-default") || "";
        if (filterSearch) filterSearch.value = "";
        applyFilters();
      });
    }

    // In case recipes array changes later, expose a small updater
    window.updateRecipeList = function(newList) {
      if (!Array.isArray(newList)) return;
      window.recipes = newList;
      applyFilters();
    };
  }); // DOMContentLoaded
})(); // IIFE
