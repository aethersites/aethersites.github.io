  var recipes = [
  {
    id: 1,
    title: "Mediterranean Quinoa Bowl",
    rating: 4.8,
    time: 25,
    servings: 4,
    calories: 420,
    ingredients: [
      "1 cup quinoa",
      "2 cups vegetable broth",
      "1 cucumber, diced",
      "1 cup cherry tomatoes, halved",
      "1/4 cup tahini"
    ],
    instructions: `
      1. Cook quinoa in vegetable broth.<br>
      2. Mix with chopped vegetables.<br>
      3. Drizzle with tahini dressing and serve.
    `,
    tags: ["Vegetarian", "Gluten-Free"],
    image: "https://media.istockphoto.com/id/1194750269/photo/fresh-quinoa-tabbouleh-salad.jpg?s=612x612&w=0&k=20&c=Jo7y2fl9RKIMBXteG83NZUpl57HpvEd4GiCfj-gh8yM=",
    cuisine: "Mediterranean",
    mealtype: "Lunch"
  },
  {
    id: 2,
    title: "Spicy Thai Green Curry",
    rating: 4.9,
    time: 30,
    servings: 3,
    calories: 380,
    ingredients: [
      "1 can coconut milk",
      "2 tbsp green curry paste",
      "1 zucchini, sliced",
      "1 red bell pepper, sliced",
      "Fresh basil leaves"
    ],
    instructions: `
      1. Heat coconut milk and curry paste.<br>
      2. Add vegetables and simmer until tender.<br>
      3. Garnish with fresh basil and serve.
    `,
    tags: ["Spicy", "Dairy-Free"],
    image: "https://images.pexels.com/photos/33435594/pexels-photo-33435594.jpeg",
    cuisine: "Asian",
    mealtype: "Dinner"
  },
  {
    id: 3,
    title: "Classic Margherita Pizza",
    rating: 4.7,
    time: 45,
    servings: 2,
    calories: 520,
    ingredients: [
      "Pizza dough",
      "1/2 cup tomato sauce",
      "Fresh mozzarella",
      "Fresh basil leaves",
      "Olive oil"
    ],
    instructions: `
      1. Preheat oven to 475°F (245°C).<br>
      2. Roll out dough and spread with tomato sauce.<br>
      3. Top with mozzarella and basil leaves.<br>
      4. Drizzle with olive oil and bake for 10–12 minutes.
    `,
    tags: ["Vegetarian", "Italian"],
    image: "https://images.pexels.com/photos/33457994/pexels-photo-33457994.jpeg",
    cuisine: "European",
    mealtype: "Dinner"
  },
  {
    id: 4,
    title: "Grilled Salmon with Herbs",
    rating: 4.8,
    time: 20,
    servings: 2,
    calories: 450,
    ingredients: [
      "2 salmon fillets",
      "2 tbsp olive oil",
      "Fresh dill",
      "Fresh parsley",
      "1 lemon (for juice)"
    ],
    instructions: `
      1. Preheat grill to medium-high.<br>
      2. Brush salmon with olive oil and season with herbs.<br>
      3. Grill for 4–5 minutes per side.<br>
      4. Drizzle with lemon juice and serve.
    `,
    tags: ["High Protein", "Keto"],
    image: "https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg",
    cuisine: "American",
    mealtype: "Dinner"
  },
  {
    id: 5,
    title: "Moroccan Tagine",
    rating: 4.9,
    time: 120,
    servings: 6,
    calories: 380,
    ingredients: [
      "2 lbs lamb or chicken",
      "2 onions, sliced",
      "2 carrots, chopped",
      "1/2 cup dried apricots",
      "2 tbsp Moroccan spice mix"
    ],
    instructions: `
      1. Sauté onions and spices in olive oil.<br>
      2. Add meat and brown on all sides.<br>
      3. Add vegetables, dried fruits, and water.<br>
      4. Cover and simmer for 2 hours until tender.
    `,
    tags: ["Traditional", "Halal"],
    image: "https://images.pexels.com/photos/30459912/pexels-photo-30459912.jpeg",
    cuisine: "African",
    mealtype: "Dinner"
  },
  {
    id: 6,
    title: "Vegan Buddha Bowl",
    rating: 4.6,
    time: 35,
    servings: 2,
    calories: 350,
    ingredients: [
      "1 cup quinoa",
      "1 cup roasted sweet potatoes",
      "1 cup broccoli florets",
      "1 avocado, sliced",
      "Tahini sauce"
    ],
    instructions: `
      1. Cook quinoa according to package instructions.<br>
      2. Roast sweet potatoes and steam broccoli.<br>
      3. Arrange quinoa, veggies, and avocado in a bowl.<br>
      4. Drizzle with tahini sauce and serve.
    `,
    tags: ["Vegan", "Healthy"],
    image: "https://images.pexels.com/photos/13887558/pexels-photo-13887558.jpeg",
    cuisine: "Fusion / Global Contemporary",
    mealtype: "Lunch"
  },
  {
  id: 7,
  title: "Fluffy Blueberry Pancakes",
  rating: 4.8,
  time: 25,
  servings: 4,
  calories: 380,
  ingredients: [
    "1 1/2 cups all-purpose flour",
    "3 1/2 tsp baking powder",
    "1/2 tsp salt",
    "1 tbsp sugar",
    "1 1/4 cups milk",
    "1 egg",
    "3 tbsp melted butter",
    "1 cup fresh or frozen blueberries",
    "Butter or oil for cooking"
  ],
  instructions: `
    1. In a large bowl, whisk together the flour, baking powder, salt, and sugar until evenly combined.<br>
    2. In a separate bowl, whisk the milk, egg, and melted butter until smooth.<br>
    3. Gradually pour the wet ingredients into the dry mixture, stirring gently with a spatula until just combined (batter should be slightly lumpy — do not overmix).<br>
    4. Gently fold in the blueberries.<br>
    5. Heat a lightly greased skillet or griddle over medium heat. Pour about 1/4 cup batter for each pancake.<br>
    6. Cook until bubbles appear on the surface (about 2–3 minutes), then flip and cook the other side until golden brown.<br>
    7. Serve warm with maple syrup, butter, or extra blueberries on top.
  `,
  tags: ["Breakfast", "Family Favorite"],
  image: "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg",
  cuisine: "American",
  mealtype: "Breakfast"
},
{
  id: 8,
  title: "Avocado Toast with Poached Egg",
  rating: 4.7,
  time: 15,
  servings: 2,
  calories: 320,
  ingredients: [
    "2 slices sourdough bread",
    "1 ripe avocado",
    "2 large eggs",
    "1 tbsp white vinegar (for poaching)",
    "Salt and pepper to taste",
    "Chili flakes (optional)",
    "Olive oil (optional drizzle)"
  ],
  instructions: `
    1. Toast the sourdough bread slices until golden brown and crisp.<br>
    2. While the bread is toasting, bring a medium pot of water to a gentle simmer. Add the vinegar.<br>
    3. Crack each egg into a small ramekin. Stir the water to create a gentle whirlpool, then carefully lower one egg into the center. Poach for about 3 minutes for a runny yolk, or longer if you prefer a firmer yolk. Repeat with the second egg.<br>
    4. Halve the avocado, remove the pit, and mash the flesh in a bowl with a fork. Season with salt and pepper.<br>
    5. Spread the mashed avocado generously on the toasted bread.<br>
    6. Top each slice with a poached egg. Sprinkle with chili flakes and drizzle with olive oil if desired.<br>
    7. Serve immediately while warm.
  `,
  tags: ["Healthy", "Protein-Packed"],
  image: "https://www.shutterstock.com/image-photo/benedict-eggs-on-avocado-toast-600nw-2439635221.jpg",
  cuisine: "Modern European",
  mealtype: "Breakfast"
},
{
  id: 9,
  title: "Greek Yogurt Parfait",
  rating: 4.5,
  time: 10,
  servings: 2,
  calories: 280,
  ingredients: [
    "2 cups Greek yogurt (plain or vanilla)",
    "1 cup granola",
    "1 cup mixed berries (strawberries, blueberries, raspberries)",
    "2 tbsp honey or maple syrup",
    "Chia seeds or flax seeds (optional topping)"
  ],
  instructions: `
    1. Wash and pat dry the berries. Slice strawberries if using.<br>
    2. In two serving glasses or bowls, add a spoonful of yogurt as the first layer.<br>
    3. Sprinkle a layer of granola evenly over the yogurt.<br>
    4. Add a layer of fresh berries, distributing them evenly.<br>
    5. Repeat the layers until all ingredients are used, finishing with berries on top.<br>
    6. Drizzle with honey or maple syrup for added sweetness.<br>
    7. Optionally sprinkle chia seeds or flax seeds for extra nutrition. Serve immediately for crunch or let chill for 10 minutes for softer granola.
  `,
  tags: ["Quick", "Healthy", "No-Cook"],
  image: "https://images.pexels.com/photos/1435894/pexels-photo-1435894.jpeg",
  cuisine: "Mediterranean",
  mealtype: "Breakfast"
},
{
  id: 10,
  title: "Savory Breakfast Burrito",
  rating: 4.9,
  time: 30,
  servings: 2,
  calories: 450,
  ingredients: [
    "2 large flour tortillas",
    "4 large eggs",
    "1/4 cup milk",
    "1/2 cup cheddar cheese, shredded",
    "1/2 cup black beans, drained and rinsed",
    "1/2 cup diced bell peppers",
    "1/4 cup diced onions",
    "1/4 cup salsa",
    "1 tbsp olive oil",
    "Salt and pepper to taste"
  ],
  instructions: `
    1. In a medium bowl, whisk together the eggs, milk, salt, and pepper until smooth and well combined.<br>
    2. Heat olive oil in a skillet over medium heat. Add onions and bell peppers and sauté until softened (about 4–5 minutes).<br>
    3. Add the black beans and stir until warmed through.<br>
    4. Pour the egg mixture into the skillet and cook, stirring frequently, until scrambled and fully set.<br>
    5. Warm the tortillas in a dry pan or microwave for 20–30 seconds until pliable.<br>
    6. Divide the scrambled egg mixture between the tortillas. Sprinkle with shredded cheese and spoon over some salsa.<br>
    7. Roll the tortillas tightly into burritos by folding in the sides first, then rolling from the bottom up.<br>
    8. Serve warm, optionally with extra salsa or sour cream on the side.
  `,
  tags: ["Savory", "High-Protein", "On-the-Go"],
  image: "https://images.pexels.com/photos/5908002/pexels-photo-5908002.jpeg",
  cuisine: "Mexican-American",
  mealtype: "Breakfast"
   }
  // 👉 Add more recipes here...
];


document.addEventListener("DOMContentLoaded", () => {
  // 💡 Grab only lunch recipes from the global list (recipes.js must be loaded first)
  // This makes the rest of the code only use lunch recipes for all filters, searches, etc.
  const lunchRecipes = (recipes || []).filter(r =>
    (r.mealtype ?? r.mealType ?? '').toString().trim().toLowerCase() === 'lunch'
  );
  // Overwrite the global recipes variable so the rest of the code works as before
  window.recipes = lunchRecipes;

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
