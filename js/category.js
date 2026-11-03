
// KARKEE TOOLS - Category Page

const params = new URLSearchParams(window.location.search);
const categorySlug = params.get("slug");

async function loadCategory() {
    const title = document.getElementById("category-title");
    const description = document.getElementById("category-description");
    const toolsContainer = document.getElementById("category-tools");

    if (!categorySlug) {
        title.textContent = "Category not found";
        toolsContainer.innerHTML = "";
        return;
    }

    // Load category details
    const { data: category, error: categoryError } = await supabaseClient
        .from("categories")
        .select("name, description")
        .eq("slug", categorySlug)
        .maybeSingle();

    if (categoryError || !category) {
        title.textContent = "Category not found";
        toolsContainer.innerHTML = "";
        return;
    }

    title.textContent = category.name;
    description.textContent = category.description || "";

    // Load published tools in this category
    const { data: tools, error: toolsError } = await supabaseClient
        .from("tools")
        .select("id, name, description, thumbnail_url, tool_url")
        .eq("category", categorySlug)
        .eq("is_published", true)
        .order("name");

    if (toolsError) {
        console.error("Tools loading error:", toolsError.message);
        toolsContainer.innerHTML = "<p>Unable to load tools.</p>";
        return;
    }

    if (!tools || tools.length === 0) {
        toolsContainer.innerHTML =
            '<div class="col-12"><p>No tools published in this category yet.</p></div>';
        return;
    }

    toolsContainer.innerHTML = tools.map(tool => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="category-card h-100">
                ${tool.thumbnail_url
                    ? `<img src="${escapeHTML(tool.thumbnail_url)}"
                            alt="${escapeHTML(tool.name)}"
                            class="img-fluid rounded mb-3">`
                    : ""}
                <h5>${escapeHTML(tool.name)}</h5>
                <p>${escapeHTML(tool.description || "")}</p>
                <a href="${escapeHTML(tool.tool_url)}"
                   class="btn btn-primary"
                   target="_blank"
                   rel="noopener noreferrer">
                    Open Tool
                </a>
            </div>
        </div>
    `).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

loadCategory();
