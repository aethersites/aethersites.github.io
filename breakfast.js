
<script src="recipes.js"></script>
<script>
  // Only keep breakfast recipes for this page
  const breakfastRecipes = recipes.filter(r => {
    const v = (r.mealtype ?? r.mealType ?? '').toString().trim().toLowerCase();
    return v === 'breakfast';
  });
  // Assign to 'recipes' so your filter UI works as usual
  window.recipes = breakfastRecipes;
</script>
<script src="scripts.js"></script>
