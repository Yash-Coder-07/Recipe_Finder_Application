
const SEARCH_API_URL = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const RANDOM_API_URL = "https://www.themealdb.com/api/json/v1/1/random.php";
const LOOKUP_API_URL = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";
const CATEGORY_LIST_API_URL = "https://www.themealdb.com/api/json/v1/1/list.php?c=list";
const AREA_LIST_API_URL = "https://www.themealdb.com/api/json/v1/1/list.php?a=list";
const FILTER_BY_CATEGORY_API_URL = "https://www.themealdb.com/api/json/v1/1/filter.php?c=";
const FILTER_BY_AREA_API_URL = "https://www.themealdb.com/api/json/v1/1/filter.php?a=";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsGrid = document.getElementById("results-grid");
const messageArea = document.getElementById("message-area");
const randomButton = document.getElementById("random-button");
const modal = document.getElementById("recipe-modal");
const modalContent = document.getElementById("recipe-details-content");
const modalCloseBtn = document.getElementById("modal-close-btn");
const categoryFilter = document.getElementById("category-filter");
const areaFilter = document.getElementById("area-filter");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

// === EVENT LISTENERS ===
document.addEventListener("DOMContentLoaded", () => {
    populateFilters();
    applyInitialTheme();
});

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();

    if (searchTerm) {
        categoryFilter.value = "";
        areaFilter.value = "";
        searchRecipes(searchTerm);
    } else {
        showMessage("Please enter a search term", true);
    }
});

randomButton.addEventListener("click", getRandomRecipe);
resultsGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".recipe-item");
    if (card) getRecipeDetails(card.dataset.id);
});

modalCloseBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

categoryFilter.addEventListener("change", () => handleFilterChange("category"));
areaFilter.addEventListener("change", () => handleFilterChange("area"));
themeToggleBtn.addEventListener("click", toggleTheme);

// === THEME FUNCTIONS ===
function applyInitialTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggleBtn.textContent = "☀️";
    } else {
        document.body.classList.remove("dark-mode");
        themeToggleBtn.textContent = "🌙";
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
        themeToggleBtn.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    } else {
        themeToggleBtn.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
}

async function populateFilters() {
    try {
        const [catResponse, areaResponse] = await Promise.all([
            fetch(CATEGORY_LIST_API_URL),
            fetch(AREA_LIST_API_URL)
        ]);
        const catData = await catResponse.json();
        const areaData = await areaResponse.json();

        catData.meals
            .filter(category => category.strCategory !== "Beef")
            .forEach(category => {
                const option = new Option(category.strCategory, category.strCategory);
                categoryFilter.appendChild(option);
            });

        areaData.meals.forEach(area => {
            const option = new Option(area.strArea, area.strArea);
            areaFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to populate filters:", error);
    }
}

function handleFilterChange(filterType) {
    let filterValue, url;
    if (filterType === "category") {
        filterValue = categoryFilter.value;
        url = `${FILTER_BY_CATEGORY_API_URL}${filterValue}`;
        areaFilter.value = "";
    } else {
        filterValue = areaFilter.value;
        url = `${FILTER_BY_AREA_API_URL}${filterValue}`;
        categoryFilter.value = "";
    }

    if (filterValue) {
        searchInput.value = "";
        fetchFilteredRecipes(url, filterValue);
    }
}

async function fetchFilteredRecipes(url, filterName) {
    showMessage(`Fetching recipes for "${filterName}"...`, false, true);
    resultsGrid.innerHTML = "";

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error");

        const data = await response.json();
        clearMessage();
        
        if (data.meals) {
            displayRecipes(data.meals);
        } else {
            showMessage(`No recipes found for "${filterName}".`);
        }
    } catch (error) {
        showMessage("Something went wrong, Please try again.", true);
    }
}


// === CORE RECIPE FUNCTIONS ===
async function searchRecipes(query) {
    showMessage(`Searching for "${query}"...`, false, true);
    resultsGrid.innerHTML = "";

    try {
        const response = await fetch(`${SEARCH_API_URL}${query}`);
        if (!response.ok) throw new Error("Network error");

        const data = await response.json();
        clearMessage();

        if (data.meals) {
            displayRecipes(data.meals);
        } else {
            showMessage(`No recipes found for "${query}"`);
        }
    } catch (error) {
        showMessage("Something went wrong, Please try again.", true);
    }
}

async function getRandomRecipe() {
    showMessage("Fetching a random recipe...", false, true);
    resultsGrid.innerHTML = "";

    try {
        const response = await fetch(RANDOM_API_URL);
        if (!response.ok) throw new Error("Something went wrong.");
        const data = await response.json();
        clearMessage();

        if (data.meals && data.meals.length > 0) {
            // Random API returns full details, but displayRecipes expects a list
            displayRecipes(data.meals);
        } else {
            showMessage("Could not fetch a random recipe. Please try again.", true);
        }
    } catch (error) {
        showMessage("Failed to fetch a random recipe. Check your connection.", true);
    }
}

async function getRecipeDetails(id) {
    modalContent.innerHTML = '<p class="message loading">Loading details...</p>';
    showModal();

    try {
        const response = await fetch(`${LOOKUP_API_URL}${id}`);
        if (!response.ok) throw new Error("Failed to fetch recipe details.");
        const data = await response.json();

        if (data.meals && data.meals.length > 0) {
            displayRecipeDetails(data.meals[0]);
        } else {
            modalContent.innerHTML = '<p class="message error">Could not load recipe details.</p>';
        }
    } catch (error) {
        modalContent.innerHTML = '<p class="message error">Failed to load recipe details. Check your connection.</p>';
    }
}

// === DISPLAY & UI FUNCTIONS ===
function displayRecipes(recipes) {
    resultsGrid.innerHTML = "";
    if (!recipes || recipes.length === 0) {
        showMessage("No recipes to display");
        return;
    }

    recipes.forEach((recipe) => {
        const recipeDiv = document.createElement("div");
        recipeDiv.classList.add("recipe-item");
        recipeDiv.dataset.id = recipe.idMeal;
        recipeDiv.innerHTML = `
            <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" loading="lazy">
            <h3>${recipe.strMeal}</h3>
        `;
        resultsGrid.appendChild(recipeDiv);
    });
}

function displayRecipeDetails(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = recipe[`strIngredient${i}`]?.trim();
        const measure = recipe[`strMeasure${i}`]?.trim();
        if (ingredient) {
            ingredients.push(`<li>${measure ? `${measure} ` : ""}${ingredient}</li>`);
        } else {
            break;
        }
    }

    modalContent.innerHTML = `
        <h2>${recipe.strMeal}</h2>
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
        ${recipe.strCategory ? `<h3>Category: ${recipe.strCategory}</h3>` : ""}
        ${recipe.strArea ? `<h3>Area: ${recipe.strArea}</h3>` : ""}
        ${ingredients.length ? `<h3>Ingredients</h3><ul>${ingredients.join("")}</ul>` : ""}
        <h3>Instructions</h3>
        <p>${recipe.strInstructions ? recipe.strInstructions.replace(/\r?\n/g, "<br>") : "Instructions not available."}</p>
        ${recipe.strYoutube ? `<h3>Video Recipe</h3><div class="video-wrapper"><a href="${recipe.strYoutube}" target="_blank">Watch on YouTube</a></div>` : ""}
        ${recipe.strSource ? `<div class="source-wrapper"><a href="${recipe.strSource}" target="_blank">View Original Source</a></div>` : ""}
    `;
}

function showMessage(message, isError = false, isLoading = false) {
    messageArea.textContent = message;
    messageArea.className = "message"; // Reset classes
    if (isError) messageArea.classList.add("error");
    if (isLoading) messageArea.classList.add("loading");
}

function clearMessage() {
    messageArea.textContent = "";
    messageArea.className = "message";
}

function showModal() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}