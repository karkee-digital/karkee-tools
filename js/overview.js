
async function verifyAdmin() {
    try {
        const { data: { user }, error } =
            await supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        // Corrected: use user_id (UUID), not id (BIGINT)
        const { data: admin, error: adminError } = await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (!admin) {
            document.getElementById("loadingMessage").style.display = "none";

            const errorBox = document.getElementById("overviewError");
            errorBox.textContent =
                "Admin access could not be verified. Please check your admin account.";
            errorBox.style.display = "block";

            return false;
        }

        return true;

    } catch (error) {
        console.error("Verification failed:", error);

        const loadingMessage = document.getElementById("loadingMessage");
        const errorBox = document.getElementById("overviewError");

        loadingMessage.style.display = "none";
        errorBox.textContent =
            "Unable to verify admin access: " + error.message;
        errorBox.style.display = "block";

        return false;
    }
}


async function getCount(table, filters = []) {
    let query = supabaseClient
        .from(table)
        .select("*", { count: "exact", head: true });

    filters.forEach(filter => {
        query = query.eq(filter.column, filter.value);
    });

    const { count, error } = await query;

    if (error) {
        throw error;
    }

    return count || 0;
}


async function loadStatistics() {
    const loadingMessage = document.getElementById("loadingMessage");
    const statisticsSection = document.getElementById("statisticsSection");
    const overviewError = document.getElementById("overviewError");
    const refreshBtn = document.getElementById("refreshStatsBtn");

    loadingMessage.style.display = "block";
    statisticsSection.style.display = "none";
    overviewError.style.display = "none";
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading...";

    try {
        const [
            totalTools,
            publishedTools,
            draftTools,
            totalCategories,
            featuredTools,
            totalContactMessages,
            unreadContactMessages,
            readContactMessages
        ] = await Promise.all([
            getCount("tools"),

            getCount("tools", [
                { column: "is_published", value: true }
            ]),

            getCount("tools", [
                { column: "is_published", value: false }
            ]),

            getCount("categories"),

            getCount("tools", [
                { column: "is_featured", value: true }
            ]),

            getCount("contact_messages"),

            getCount("contact_messages", [
                { column: "is_read", value: false }
            ]),

            getCount("contact_messages", [
                { column: "is_read", value: true }
            ])
        ]);

        document.getElementById("totalTools").textContent = totalTools;
        document.getElementById("publishedTools").textContent = publishedTools;
        document.getElementById("draftTools").textContent = draftTools;
        document.getElementById("totalCategories").textContent = totalCategories;
        document.getElementById("featuredTools").textContent = featuredTools;

        document.getElementById("totalContactMessages").textContent =
            totalContactMessages;

        document.getElementById("unreadContactMessages").textContent =
            unreadContactMessages;

        document.getElementById("readContactMessages").textContent =
            readContactMessages;

        loadingMessage.style.display = "none";
        statisticsSection.style.display = "flex";

    } catch (error) {
        console.error("Statistics loading error:", error);

        loadingMessage.style.display = "none";
        overviewError.textContent =
            "Unable to load statistics: " + error.message;

        overviewError.style.display = "block";

    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "Refresh Statistics";
    }
}


async function initializeOverview() {
    const isAdmin = await verifyAdmin();

    if (!isAdmin) {
        return;
    }

    await loadStatistics();
}


document.getElementById("refreshStatsBtn")
    .addEventListener("click", loadStatistics);

initializeOverview();
