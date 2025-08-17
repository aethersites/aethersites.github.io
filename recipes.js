const recipes = [
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
    image: "https://media.istockphoto.com/id/1194750269/photo/fresh-quinoa-tabbouleh-salad.jpg?s=612x612&w=0&k=20&c=Jo7y2fl9RKIMBXteG83NZUpl57HpvEd4GiCfj-gh8yM="
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
    image: "https://images.pexels.com/photos/33435594/pexels-photo-33435594.jpeg"
  }
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
    image: "https://images.pexels.com/photos/33457994/pexels-photo-33457994.jpeg"
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
    image: "https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg"
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
    image: "https://images.pexels.com/photos/30459912/pexels-photo-30459912.jpeg"
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
    image: "https://images.pexels.com/photos/13887558/pexels-photo-13887558.jpeg"
  }
  // 👉 Add more recipes here...
];
