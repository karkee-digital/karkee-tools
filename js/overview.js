
let pageViewsChart = null;


// Verify admin access
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


// Get database count
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


// Get date in India timezone
function getIndiaDate(date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}


// Format date label
function getDateLabel(date) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short"
    }).format(date);
}


// Load 7-day page views chart
function renderPageViewsChart(records) {

    const labels = [];
    const dailyCounts = {};

    // Prepare the last 7 dates in India timezone.
    const today = getIndiaDate(new Date());

    const todayDate = new Date(`${today}T00:00:00+05:30`);

    for (let i = 6; i >= 0; i--) {

        const date = new Date(todayDate);
        date.setDate(date.getDate() - i);

        const dateKey = getIndiaDate(date);

        labels.push({
            key: dateKey,
            label: getDateLabel(date)
        });

        dailyCounts[dateKey] = 0;
    }

    // Count visits for each day.
    records.forEach(item => {

        if (!item.visited_at) return;

        const visitDate = getIndiaDate(
            new Date(item.visited_at)
        );

        if (Object.prototype.hasOwnProperty.call(dailyCounts, visitDate)) {
            dailyCounts[visitDate]++;
        }
    });

    const chartLabels = labels.map(item => item.label);

    const chartData = labels.map(
        item => dailyCounts[item.key]
    );

    const canvas = document.getElementById("pageViewsChart");

    if (!canvas) return;

    // Remove previous chart before refreshing.
    if (pageViewsChart) {
        pageViewsChart.destroy();
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js is not loaded.");
        return;
    }

    pageViewsChart = new Chart(canvas, {

        type: "line",

        data: {
            labels: chartLabels,

            datasets: [{
                label: "Page Views",

                data: chartData,

                borderColor: "#0d6efd",

                backgroundColor: "rgba(13, 110, 253, 0.12)",

                borderWidth: 3,

                fill: true,

                tension: 0.35,

                pointRadius: 5,

                pointHoverRadius: 7
            }]
        },

        options: {
            responsive: true,

            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true,
                    position: "top"
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    },

                    title: {
                        display: true,
                        text: "Page Views"
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                }
            }
        }
    });
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

    const today = getIndiaDate(new Date());

    const todayViews = records.filter(item => {
        return getIndiaDate(new Date(item.visited_at)) === today;
    }).length;

    document.getElementById("totalPageViews").textContent = totalViews;
    document.getElementById("uniqueVisitors").textContent = uniqueVisitorCount;
    document.getElementById("todayPageViews").textContent = todayViews;

    // Render 7-day chart.
    renderPageViewsChart(records);


    // Popular pages
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


    // Popular tools
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


// Escape HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// Load all statistics
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


// Initialize overview
async function initializeOverview() {

    const isAdmin = await verifyAdmin();

    if (!isAdmin) return;

    await loadStatistics();
}


// Refresh button
document.getElementById("refreshStatsBtn")
    .addEventListener("click", loadStatistics);


// Start
initializeOverview();
