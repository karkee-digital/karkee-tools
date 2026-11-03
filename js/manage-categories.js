
const categoryForm = document.getElementById("categoryForm");
const categoriesTableBody = document.getElementById("categoriesTableBody");
const categoryMessage = document.getElementById("categoryMessage");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Verify admin access
async function verifyAdmin() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return false;
    }

    const { data: admin, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// Load categories
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .order("name");

    if (error) {
        categoriesTableBody.innerHTML = `
            <tr><td colspan="4" class="text-danger">
                ${escapeHTML(error.message)}
            </td></tr>
        `;
        return;
    }

    if (!data.length) {
        categoriesTableBody.innerHTML = `
            <tr><td colspan="4" class="text-center">No categories found.</td></tr>
        `;
        return;
    }

    categoriesTableBody.innerHTML = data.map(category => `
        <tr>
            <td>${escapeHTML(category.icon || "📁")}</td>
            <td>${escapeHTML(category.name)}</td>
            <td>${escapeHTML(category.slug)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary"
                    onclick="editCategory(${Number(category.id)})">
                    Edit
                </button>

                <button class="btn btn-sm btn-outline-danger"
                    onclick="deleteCategory(${Number(category.id)})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

// Save category
categoryForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const button = document.getElementById("saveCategoryBtn");
    button.disabled = true;
    button.textContent = "Saving...";

    const id = document.getElementById("categoryId").value;

    const categoryData = {
        name: document.getElementById("categoryName").value.trim(),
        slug: document.getElementById("categorySlug").value.trim(),
        icon: document.getElementById("categoryIcon").value.trim(),
        description: document.getElementById("categoryDescription").value.trim()
    };

    try {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categoryData.slug)) {
            throw new Error("Slug must use lowercase letters, numbers and hyphens.");
        }

        const { error } = id
            ? await supabaseClient.from("categories").update(categoryData).eq("id", id)
            : await supabaseClient.from("categories").insert([categoryData]);

        if (error) throw error;

        categoryMessage.textContent = "Category saved successfully!";
        categoryMessage.className = "mt-3 text-success";

        resetCategoryForm();
        await loadCategories();

    } catch (error) {
        categoryMessage.textContent = error.message;
        categoryMessage.className = "mt-3 text-danger";
    } finally {
        button.disabled = false;
        button.textContent = "Save Category";
    }
});

// Edit category
async function editCategory(id) {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("categoryId").value = data.id;
    document.getElementById("categoryName").value = data.name;
    document.getElementById("categorySlug").value = data.slug;
    document.getElementById("categoryIcon").value = data.icon || "";
    document.getElementById("categoryDescription").value = data.description || "";

    document.getElementById("formTitle").textContent = "Edit Category";
    document.getElementById("saveCategoryBtn").textContent = "Update Category";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete category
async function deleteCategory(id) {
    const confirmed = confirm(
        "Delete this category? Make sure no tools are assigned to it."
    );

    if (!confirmed) return;

    // Prevent deleting categories that still contain tools
    const { count, error: countError } = await supabaseClient
        .from("tools")
        .select("id", { count: "exact", head: true })
        .eq("category", (await supabaseClient
            .from("categories")
            .select("slug")
            .eq("id", id)
            .single()).data?.slug);

    if (countError) {
        alert(countError.message);
        return;
    }

    if (count > 0) {
        alert("This category contains tools. Move those tools to another category first.");
        return;
    }

    const { error } = await supabaseClient
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Category deleted successfully.");
    await loadCategories();
}

// Reset form
function resetCategoryForm() {
    categoryForm.reset();
    document.getElementById("categoryId").value = "";
    document.getElementById("formTitle").textContent = "Add New Category";
    document.getElementById("saveCategoryBtn").textContent = "Save Category";
}

// Clear button
document.getElementById("clearCategoryBtn").addEventListener("click", function() {
    resetCategoryForm();
    categoryMessage.textContent = "";
});

// Start
async function initializeCategories() {
    const allowed = await verifyAdmin();

    if (!allowed) return;

    await loadCategories();
}

initializeCategories();
