
const messagesTable = document.getElementById("messagesTable");
const totalMessages = document.getElementById("totalMessages");
const unreadMessages = document.getElementById("unreadMessages");
const loadingMessage = document.getElementById("loadingMessage");
const emptyMessage = document.getElementById("emptyMessage");
const errorMessage = document.getElementById("errorMessage");
const refreshBtn = document.getElementById("refreshBtn");

let contactMessages = [];

const messageModal = new bootstrap.Modal(
    document.getElementById("messageModal")
);

// Escape HTML to safely display visitor-submitted content.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

// Verify admin access.
async function verifyContactAdmin() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return false;
    }

    const { data, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError || !data) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// Load messages.
async function loadContactMessages() {
    loadingMessage.classList.remove("d-none");
    errorMessage.classList.add("d-none");
    emptyMessage.classList.add("d-none");

    messagesTable.innerHTML = "";

    refreshBtn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from("contact_messages")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        contactMessages = data || [];

        displayContactMessages();

    } catch (error) {
        console.error("Loading messages failed:", error);

        errorMessage.textContent =
            "Unable to load messages: " + error.message;

        errorMessage.classList.remove("d-none");

    } finally {
        loadingMessage.classList.add("d-none");
        refreshBtn.disabled = false;
    }
}

// Display messages.
function displayContactMessages() {

    totalMessages.textContent = contactMessages.length;

    const unreadCount = contactMessages.filter(
        message => !message.is_read
    ).length;

    unreadMessages.textContent = unreadCount;

    messagesTable.innerHTML = "";

    if (contactMessages.length === 0) {
        emptyMessage.classList.remove("d-none");
        return;
    }

    emptyMessage.classList.add("d-none");

    contactMessages.forEach(message => {

        const row = document.createElement("tr");

        const statusBadge = message.is_read
            ? '<span class="badge bg-success">Read</span>'
            : '<span class="badge bg-warning text-dark">Unread</span>';

        row.innerHTML = `
            <td>${escapeHTML(message.name)}</td>

            <td>${escapeHTML(message.email)}</td>

            <td>${escapeHTML(message.subject)}</td>

            <td>${new Date(message.created_at).toLocaleString()}</td>

            <td>${statusBadge}</td>

            <td>
                <button class="btn btn-sm btn-primary mb-1"
                    onclick="viewMessage(${message.id})">
                    View
                </button>

                <button class="btn btn-sm btn-outline-secondary mb-1"
                    onclick="toggleReadStatus(${message.id})">
                    ${message.is_read ? "Mark Unread" : "Mark Read"}
                </button>

                <button class="btn btn-sm btn-danger mb-1"
                    onclick="deleteMessage(${message.id})">
                    Delete
                </button>
            </td>
        `;

        messagesTable.appendChild(row);

    });
}

// View message.
window.viewMessage = function(id) {

    const message = contactMessages.find(
        item => item.id === id
    );

    if (!message) return;

    document.getElementById("viewName").textContent = message.name;
    document.getElementById("viewEmail").textContent = message.email;
    document.getElementById("viewSubject").textContent = message.subject;
    document.getElementById("viewDate").textContent =
        new Date(message.created_at).toLocaleString();

    document.getElementById("viewMessage").textContent =
        message.message;

    messageModal.show();
};

// Mark read or unread.
window.toggleReadStatus = async function(id) {

    const message = contactMessages.find(
        item => item.id === id
    );

    if (!message) return;

    const newStatus = !message.is_read;

    const { error } = await supabaseClient
        .from("contact_messages")
        .update({ is_read: newStatus })
        .eq("id", id);

    if (error) {
        alert("Update failed: " + error.message);
        return;
    }

    await loadContactMessages();
};

// Delete message.
window.deleteMessage = async function(id) {

    if (!confirm("Are you sure you want to delete this message?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("contact_messages")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Delete failed: " + error.message);
        return;
    }

    await loadContactMessages();
};

// Refresh button.
refreshBtn.addEventListener("click", loadContactMessages);

// Initialize.
async function initializeContactMessages() {

    const isAdmin = await verifyContactAdmin();

    if (!isAdmin) return;

    await loadContactMessages();
}

initializeContactMessages();
