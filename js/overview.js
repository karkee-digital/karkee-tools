let pageViewsChart = null;
let monthlyPageViewsChart = null;


// ==========================================
// VERIFY ADMIN ACCESS
// ==========================================

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
        errorBox.textContent =
            "Unable to verify admin access: " + error.message;
        errorBox.style.display = "block";

        return false;
    }
}


// ==========================================
// DATABASE COUNT
// ==========================================

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


// ==========================================
// INDIA DATE HELPERS
// ==========================================

function getIndiaDate(date) {

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}


function getDateLabel(date) {

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short"
    }).format(date);
}


function getIndiaMonth(date) {

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit"
    }).formatToParts(date);

    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;

    return `${year}-${month}`;
}


function getMonthLabel(date) {

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        year: "numeric"
    }).format(date);
}


// ==========================================
// DATE RANGE FILTER
// ==========================================

function getSelectedDateRange() {

    const range = document.getElementById("analyticsDateRange").value;

    const today = getIndiaDate(new Date());

    let startDate;
    let endDate = today;

    if (range === "today") {

        startDate = today;

    } else if (range === "custom") {

        startDate = document.getElementById("analyticsStartDate").value;
        endDate = document.getElementById("analyticsEndDate").value;

        if (!startDate || !endDate) {
            throw new Error("Please select both start and end dates.");
        }

        if (startDate > endDate) {
            throw new Error("Start date cannot be after end date.");
        }

        if (endDate > today) {
            throw new Error("End date cannot be in the future.");
        }

    } else {

        const days = Number(range);

        if (![7, 30, 90].includes(days)) {
            throw new Error("Invalid date range.");
        }

        const start = new Date(`${today}T12:00:00+05:30`);
        start.setDate(start.getDate() - (days - 1));

        startDate = getIndiaDate(start);
    }

    return {
        startDate,
        endDate,
        range
    };
}


// ==========================================
// FILTER CONTROLS
// ==========================================

function initializeDateFilter() {

    const rangeSelect = document.getElementById("analyticsDateRange");
    const startWrapper = document.getElementById("customStartDateWrapper");
    const endWrapper = document.getElementById("customEndDateWrapper");
    const applyButton = document.getElementById("applyDateFilterBtn");

    if (!rangeSelect || !applyButton) return;

    const today = getIndiaDate(new Date());

    const startInput = document.getElementById("analyticsStartDate");
    const endInput = document.getElementById("analyticsEndDate");

    startInput.max = today;
    endInput.max = today;

    rangeSelect.addEventListener("change", function () {

        const custom = rangeSelect.value === "custom";

        startWrapper.style.display = custom ? "block" : "none";
        endWrapper.style.display = custom ? "block" : "none";

    });

    applyButton.addEventListener("click", async function () {

        await loadWebsiteAnalytics();

    });
}


// ==========================================
// FILTER VISITS BY DATE
// ==========================================

function filterVisitsByDate(records, startDate, endDate) {

    return records.filter(item => {

        if (!item.visited_at) return false;

        const visitDate = getIndiaDate(new Date(item.visited_at));

        return visitDate >= startDate && visitDate <= endDate;

    });
}


// ==========================================
// 7-DAY PAGE VIEWS CHART
// ==========================================

function renderPageViewsChart(records) {

    const labels = [];
    const dailyCounts = {};

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

    records.forEach(item => {

        if (!item.visited_at) return;

        const visitDate = getIndiaDate(new Date(item.visited_at));

        if (Object.prototype.hasOwnProperty.call(dailyCounts, visitDate)) {
            dailyCounts[visitDate]++;
        }
    });

    const canvas = document.getElementById("pageViewsChart");

    if (!canvas) return;

    if (pageViewsChart) pageViewsChart.destroy();

    pageViewsChart = new Chart(canvas, {

        type: "line",

        data: {
            labels: labels.map(item => item.label),

            datasets: [{
                label: "Page Views",
                data: labels.map(item => dailyCounts[item.key]),
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


// ==========================================
// 12-MONTH PAGE VIEWS CHART
// ==========================================

function renderMonthlyPageViewsChart(records) {

    const monthlyCounts = {};
    const labels = [];

    const currentMonth = getIndiaMonth(new Date());

    const [year, month] = currentMonth.split("-").map(Number);

    for (let i = 11; i >= 0; i--) {

        const date = new Date(
            Date.UTC(year, month - 1 - i, 1, 12)
        );

        const monthKey = getIndiaMonth(date);

        labels.push({
            key: monthKey,
            label: getMonthLabel(date)
        });

        monthlyCounts[monthKey] = 0;
    }

    records.forEach(item => {

        if (!item.visited_at) return;

        const visitMonth = getIndiaMonth(new Date(item.visited_at));

        if (Object.prototype.hasOwnProperty.call(monthlyCounts, visitMonth)) {
            monthlyCounts[visitMonth]++;
        }
    });

    const canvas = document.getElementById("monthlyPageViewsChart");

    if (!canvas) return;

    if (monthlyPageViewsChart) monthlyPageViewsChart.destroy();

    monthlyPageViewsChart = new Chart(canvas, {

        type: "bar",

        data: {
            labels: labels.map(item => item.label),

            datasets: [{
                label: "Monthly Page Views",
                data: labels.map(item => monthlyCounts[item.key]),
                backgroundColor: "rgba(13, 110, 253, 0.75)",
                borderColor: "#0d6efd",
                borderWidth: 1,
                borderRadius: 6
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
                        text: "Month"
                    }
                }
            }
        }
    });
}


// ==========================================
// LOAD WEBSITE ANALYTICS
// ==========================================

async function loadWebsiteAnalytics() {

    const filterMessage = document.getElementById("analyticsFilterMessage");
    const applyButton = document.getElementById("applyDateFilterBtn");

    if (applyButton) {
        applyButton.disabled = true;
        applyButton.textContent = "Loading...";
    }

    try {

        const { startDate, endDate, range } = getSelectedDateRange();

        const { data: visits, error } = await supabaseClient
            .from("site_visits")
            .select("page_path, tool_slug, visitor_id, visited_at")
            .order("visited_at", { ascending: false })
            .limit(10000);

        if (error) throw error;

        const allRecords = visits || [];

        const records = filterVisitsByDate(
            allRecords,
            startDate,
            endDate
        );

        const totalViews = records.length;

        const uniqueVisitorCount = new Set(
            records.map(item => item.visitor_id).filter(Boolean)
        ).size;

        const today = getIndiaDate(new Date());

        const todayViews = records.filter(item => {
            return getIndiaDate(new Date(item.visited_at)) === today;
        }).length;

        document.getElementById("totalPageViews").textContent = totalViews;
        document.getElementById("uniqueVisitors").textContent = uniqueVisitorCount;
        document.getElementById("todayPageViews").textContent = todayViews;

        // Keep the two charts on their original fixed periods.
        renderPageViewsChart(allRecords);
        renderMonthlyPageViewsChart(allRecords);


        // Popular pages for selected date range
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
                : '<p class="text-muted">No page visits in this period.</p>';


        // Most-used tools for selected date range
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
                : '<p class="text-muted">No tool visits in this period.</p>';


        // Filter information
        if (filterMessage) {

            const labels = {
                today: "Today",
                "7": "Last 7 days",
                "30": "Last 30 days",
                "90": "Last 90 days",
                custom: "Custom date range"
            };

            filterMessage.textContent =
                `Showing analytics: ${labels[range]} (${startDate} to ${endDate}).`;
        }

    } finally {

        if (applyButton) {
            applyButton.disabled = false;
            applyButton.textContent = "Apply Filter";
        }
    }
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// ==========================================
// LOAD ALL STATISTICS
// ==========================================

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


// ==========================================
// INITIALIZE OVERVIEW
// ==========================================

async function initializeOverview() {

    const isAdmin = await verifyAdmin();

    if (!isAdmin) return;

    initializeDateFilter();

    await loadStatistics();
}


// ==========================================
// REFRESH BUTTON
// ==========================================

document.getElementById("refreshStatsBtn")
    .addEventListener("click", loadStatistics);


// ==========================================
// START
// ==========================================

initializeOverview();