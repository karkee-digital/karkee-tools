
// ==========================================
// KARKEE TOOLS - HOMEPAGE JAVASCRIPT
// ==========================================

let allTools = [];
let allCategories = [];

// ==========================================
// LOAD CATEGORIES
// ==========================================

async function loadCategories() {

    const categoryList = document.getElementById("category-list");

    if (!categoryList) return;

    const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Category loading error:", error.message);

        categoryList.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Unable to load categories.</p>
            </div>
        `;
        return;
    }

    allCategories = data || [];

    displayCategories(allCategories);
}


// ==========================================
// DISPLAY CATEGORY CARDS
// ==========================================

function displayCategories(categories) {

    const categoryList = document.getElementById("category-list");

    if (!categoryList) return;

    if (!categories || categories.length === 0) {

        categoryList.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">No categories available.</p>
            </div>
        `;

        return;
    }

    categoryList.innerHTML = categories.map(category => {

        const image = category.thumbnail_url || "images/default-category.png";

        const slug = encodeURIComponent(category.slug);

        return `
            <div class="col-12 col-sm-6 col-lg-3">

                <a href="tools/category.html?slug=${slug}"
                   class="category-card-link">

                    <div class="category-card">

                        <div class="category-thumbnail">

                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(category.name)}"
                                loading="lazy"
                                onerror="this.onerror=null; this.src='images/default-category.png';"
                            >

                        </div>

                        <div class="category-card-content">

                            <h5>${escapeHTML(category.name)}</h5>

                            <p>
                                ${escapeHTML(category.description || "Explore useful tools in this category.")}
                            </p>

                            <span class="category-explore">
                                Explore Tools →
                            </span>

                        </div>

                    </div>

                </a>

            </div>
        `;

    }).join("");
}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function(character) {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


// ==========================================
// LOAD TOOLS
// ==========================================

async function loadTools() {

    const toolList = document.getElementById("tool-list");

    if (!toolList) return;

    const { data, error } = await supabaseClient
        .from("tools")
        .select("id, name, description, category, tool_url, thumbnail_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (error) {

        console.error("Tool loading error:", error.message);

        toolList.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Unable to load tools.</p>
            </div>
        `;

        return;
    }

    allTools = data || [];

    displayTools(allTools);
}


// ==========================================
// DISPLAY TOOL CARDS
// ==========================================

function displayTools(tools) {

    const toolList = document.getElementById("tool-list");

    if (!toolList) return;

    if (!tools || tools.length === 0) {

        toolList.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">No tools found.</p>
            </div>
        `;

        return;
    }

    toolList.innerHTML = tools.map(tool => {

        const image = tool.thumbnail_url || "images/default-tool.png";

        return `
            <div class="col-12 col-sm-6 col-lg-4">

                <div class="tool-card h-100">

                    <div class="tool-thumbnail">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(tool.name)}"
                            loading="lazy"
                            onerror="this.onerror=null; this.src='images/default-tool.png';"
                        >

                    </div>

                    <div class="tool-card-content">

                        <h5>${escapeHTML(tool.name)}</h5>

                        <p>
                            ${escapeHTML(tool.description || "")}
                        </p>

                        <a
                            href="${escapeHTML(tool.tool_url)}"
                            class="btn btn-primary"
                        >
                            Open Tool
                        </a>

                    </div>

                </div>

            </div>
        `;

    }).join("");
}


// ==========================================
// SEARCH TOOLS
// ==========================================

function searchTools() {

    const searchInput = document.getElementById("tool-search");

    if (!searchInput) return;

    const searchText = searchInput.value.trim().toLowerCase();

    if (!searchText) {

        displayTools(allTools);

        return;
    }

    const filteredTools = allTools.filter(tool => {

        const name = (tool.name || "").toLowerCase();

        const description = (tool.description || "").toLowerCase();

        const category = (tool.category || "").toLowerCase();

        const matchingCategory = allCategories.find(
            item => item.slug === tool.category
        );

        const categoryName = (
            matchingCategory?.name || ""
        ).toLowerCase();

        return (
            name.includes(searchText) ||
            description.includes(searchText) ||
            category.includes(searchText) ||
            categoryName.includes(searchText)
        );

    });

    displayTools(filteredTools);
}


// ==========================================
// INITIALIZE SEARCH
// ==========================================

function initializeToolSearch() {

    const searchInput = document.getElementById("tool-search");

    const searchButton = document.getElementById("search-button");

    if (!searchInput || !searchButton) return;

    searchButton.addEventListener("click", searchTools);

    searchInput.addEventListener("keydown", function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            searchTools();

        }

    });
}


// ==========================================
// INITIALIZE HOMEPAGE
// ==========================================

async function initializeHomepage() {

    await loadCategories();

    await loadTools();

    initializeToolSearch();

}


// ==========================================
// START
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    initializeHomepage();

});
