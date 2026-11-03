
const toolForm = document.getElementById("toolForm");
const toolsTableBody = document.getElementById("toolsTableBody");
const categorySelect = document.getElementById("toolCategory");
const formMessage = document.getElementById("formMessage");

let currentThumbnailUrl = "";

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
        .select("name, slug")
        .order("name");

    if (error) {
        console.error("Category error:", error.message);
        return;
    }

    categorySelect.innerHTML =
        '<option value="">Select Category</option>';

    data.forEach(category => {
        categorySelect.innerHTML += `
            <option value="${escapeHTML(category.slug)}">
                ${escapeHTML(category.name)}
            </option>
        `;
    });
}

// Load tools
async function loadTools() {
    toolsTableBody.innerHTML = `
        <tr><td colspan="4" class="text-center">Loading tools...</td></tr>
    `;

    const { data, error } = await supabaseClient
        .from("tools")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        toolsTableBody.innerHTML = `
            <tr><td colspan="4" class="text-danger">
                ${escapeHTML(error.message)}
            </td></tr>
        `;
        return;
    }

    if (!data.length) {
        toolsTableBody.innerHTML = `
            <tr><td colspan="4" class="text-center">No tools found.</td></tr>
        `;
        return;
    }

    toolsTableBody.innerHTML = data.map(tool => `
        <tr>
            <td>
                <strong>${escapeHTML(tool.name)}</strong>
                <br>
                <small class="text-muted">${escapeHTML(tool.slug)}</small>
            </td>
            <td>${escapeHTML(tool.category)}</td>
            <td>
                ${tool.is_published
                    ? '<span class="badge bg-success">Published</span>'
                    : '<span class="badge bg-secondary">Draft</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary"
                    onclick="editTool(${Number(tool.id)})">
                    Edit
                </button>

                <button class="btn btn-sm btn-outline-danger"
                    onclick="deleteTool(${Number(tool.id)})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

// Upload thumbnail
async function uploadThumbnail(file) {
    if (!file) return currentThumbnailUrl;

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
        throw new Error("Choose a PNG, JPG or WebP image under 2 MB.");
    }

    const extension = file.name.split(".").pop().toLowerCase();
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseClient.storage
        .from("tool-thumbnails")
        .upload(filePath, file, {
            upsert: false
        });

    if (error) throw error;

    const { data } = supabaseClient.storage
        .from("tool-thumbnails")
        .getPublicUrl(filePath);

    return data.publicUrl;
}

// Save tool
toolForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const saveButton = document.getElementById("saveToolBtn");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const id = document.getElementById("toolId").value;

        const thumbnailFile =
            document.getElementById("toolThumbnail").files[0];

        const thumbnailUrl = await uploadThumbnail(thumbnailFile);

        const toolData = {
            name: document.getElementById("toolName").value.trim(),
            slug: document.getElementById("toolSlug").value.trim(),
            description: document.getElementById("toolDescription").value.trim(),
            category: categorySelect.value,
            tool_url: document.getElementById("toolUrl").value.trim(),
            thumbnail_url: thumbnailUrl || null,
            is_featured: document.getElementById("isFeatured").checked,
            is_published: document.getElementById("isPublished").checked,
            updated_at: new Date().toISOString()
        };

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(toolData.slug)) {
            throw new Error("Slug must use lowercase letters, numbers and hyphens.");
        }

        const { error } = id
            ? await supabaseClient.from("tools").update(toolData).eq("id", id)
            : await supabaseClient.from("tools").insert([toolData]);

        if (error) throw error;

        formMessage.textContent = "Tool saved successfully!";
        formMessage.className = "mt-3 text-success";

        resetForm();
        await loadTools();

    } catch (error) {
        formMessage.textContent = error.message;
        formMessage.className = "mt-3 text-danger";
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Tool";
    }
});

// Edit tool
async function editTool(id) {
    const { data, error } = await supabaseClient
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("toolId").value = data.id;
    document.getElementById("toolName").value = data.name;
    document.getElementById("toolSlug").value = data.slug;
    document.getElementById("toolDescription").value = data.description || "";
    categorySelect.value = data.category;
    document.getElementById("toolUrl").value = data.tool_url;
    document.getElementById("isFeatured").checked = data.is_featured;
    document.getElementById("isPublished").checked = data.is_published;

    currentThumbnailUrl = data.thumbnail_url || "";

    const preview = document.getElementById("thumbnailPreview");

    if (currentThumbnailUrl) {
        preview.src = currentThumbnailUrl;
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }

    document.getElementById("formTitle").textContent = "Edit Tool";
    document.getElementById("saveToolBtn").textContent = "Update Tool";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete tool
async function deleteTool(id) {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    const { error } = await supabaseClient
        .from("tools")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Tool deleted successfully.");
    await loadTools();
}

// Reset form
function resetForm() {
    toolForm.reset();

    document.getElementById("toolId").value = "";
    document.getElementById("formTitle").textContent = "Add New Tool";
    document.getElementById("saveToolBtn").textContent = "Save Tool";
    document.getElementById("thumbnailPreview").style.display = "none";

    currentThumbnailUrl = "";
}

// Clear button
document.getElementById("cancelEditBtn").addEventListener("click", function() {
    resetForm();
    formMessage.textContent = "";
});

// Thumbnail preview
document.getElementById("toolThumbnail").addEventListener("change", function() {
    const file = this.files[0];
    const preview = document.getElementById("thumbnailPreview");

    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }
});

// Start
async function initializeManageTools() {
    const allowed = await verifyAdmin();

    if (!allowed) return;

    await loadCategories();
    await loadTools();
}

initializeManageTools();
