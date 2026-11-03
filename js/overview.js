
async function verifyAdmin() {
    try {
        const { data: { user }, error } =
            await supabaseClient.auth.getUser();

        if (error) throw error;

        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        const { data: admin, error: adminError } = await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError) throw adminError;

        if (!admin) {
            document.getElementById("loadingMessage").style.display = "none";

            const errorBox = document.getElementById("overviewError");
            errorBox.textContent = "Admin access could not be verified.";
            errorBox.style.display = "block";

            return false;
        }

        return true;

    } catch (error) {
        console.error("Verification failed:", error);

        document.getElementById("loadingMessage").style.display = "none";

        const errorBox = document.getElementById("overviewError");
        errorBox.textContent = "Unable to verify admin access: " + error.message;
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

    if (error) throw error;

    return count || 0;
}


// Load website analytics
async function loadWebsiteAnalytics() {

    const { data: visits, error } = await supabaseClient
        .from("site_visits")
        .select("page_path, tool_slug, visitor_id, visited_at")
        .order("visited_at", { ascending: false })
        .limit(10000);

    if (error) throw error;

    const records = visits || [];

    const totalViews = records.length;

    const uniqueVisitorCount = new Set(
        records.map(item => item.visitor_id)
    ).size;

    // Today's date in India.
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    const todayViews = records.filter(item => {
        const visitDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date(item.visited_at));

        return visitDate === today;
    }).length;

    document.getElementById("totalPageViews").textContent = totalViews;
    document.getElementById("uniqueVisitors").textContent = uniqueVisitorCount;
    document.getElementById("todayPageViews").textContent = todayViews;

    // Count popular pages.
    const pageCounts = {};

    records.forEach(item => {
        const page = item.page_path || "Unknown";
        pageCounts[page] = (pageCounts[page] || 0) + 1;
    });

    const popularPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    document.getElementById("popularPages").innerHTML =
        popularPages.length
            ? popularPages.map(([page, count]) => `
                <div class="d-flex justify-content-between border-bottom py-2 gap-3">
                    <span class="text-break">${escapeHTML(page)}</span>
                    <strong>${count}</strong>
                </div>
            `).join("")
            : '<p class="text-muted">No page visits yet.</p>';

    // Count popular tools.
    const toolCounts = {};

    records.forEach(item => {
        if (item.tool_slug) {
            toolCounts[item.tool_slug] =
                (toolCounts[item.tool_slug] || 0) + 1;
        }
    });

    const popularTools = Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    document.getElementById("popularTools").innerHTML =
        popularTools.length
            ? popularTools.map(([tool, count]) => `
                <div class="d-flex justify-content-between border-bottom py-2 gap-3">
                    <span class="text-break">${escapeHTML(tool)}</span>
                    <strong>${count}</strong>
                </div>
            `).join("")
            : '<p class="text-muted">No tool visits yet.</p>';
}


// Escape text before inserting it into HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
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

        // Load analytics separately.
        await loadWebsiteAnalytics();

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

    if (!isAdmin) return;

    await loadStatistics();
}


document.getElementById("refreshStatsBtn")
    .addEventListener("click", loadStatistics);

initializeOverview();
