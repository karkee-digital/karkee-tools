(function () {
    // Do not track admin pages.
    if (window.location.pathname.includes("/admin/")) {
        return;
    }

    // Create or reuse a pseudonymous browser ID.
    let visitorId = localStorage.getItem("karkee_visitor_id");

    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("karkee_visitor_id", visitorId);
    }

    // Get the current page path.
    let pagePath = window.location.pathname;

    // Remove the local project folder from the path.
    pagePath = pagePath.replace(/^\/karkee-tools/, "");

    // Normalize homepage URLs.
    if (
        pagePath === "" ||
        pagePath === "/" ||
        pagePath === "/index.html"
    ) {
        pagePath = "/";
    }

    // Detect tool pages with or without .html.
    const toolMatch = pagePath.match(
        /^\/tools\/([^/]+?)(?:\.html)?\/?$/
    );

    const toolSlug = toolMatch ? toolMatch[1] : null;

    // Detect device type.
    function getDeviceType() {
        const userAgent = navigator.userAgent;

        if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) {
            return "Tablet";
        }

        if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
            return "Mobile";
        }

        return "Desktop";
    }

    // Detect browser.
    function getBrowser() {
        const userAgent = navigator.userAgent;

        if (/Edg\//i.test(userAgent)) return "Edge";
        if (/OPR\/|Opera/i.test(userAgent)) return "Opera";
        if (/Firefox\//i.test(userAgent)) return "Firefox";
        if (/SamsungBrowser/i.test(userAgent)) return "Samsung Internet";
        if (/Chrome\//i.test(userAgent)) return "Chrome";
        if (/Safari\//i.test(userAgent)) return "Safari";

        return "Other";
    }

    // Detect operating system.
    function getOperatingSystem() {
        const userAgent = navigator.userAgent;

        if (/Windows/i.test(userAgent)) return "Windows";
        if (/Android/i.test(userAgent)) return "Android";
        if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
        if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
        if (/Linux/i.test(userAgent)) return "Linux";

        return "Other";
    }

    // Record the visit.
    async function recordVisit() {
        if (typeof supabaseClient === "undefined") {
            console.error("Supabase client is not available.");
            return;
        }

        try {
            const { error } = await supabaseClient.functions.invoke(
                "track-visit",
                {
                    body: {
                        page_path: pagePath,
                        tool_slug: toolSlug,
                        visitor_id: visitorId,
                        device_type: getDeviceType(),
                        browser: getBrowser(),
                        operating_system: getOperatingSystem()
                    }
                }
            );

            if (error) {
                console.error("Analytics tracking failed:", error);
            } else {
                console.log("Analytics visit recorded:", {
                    page: pagePath,
                    tool: toolSlug,
                    device: getDeviceType(),
                    browser: getBrowser(),
                    operatingSystem: getOperatingSystem()
                });
            }
        } catch (error) {
            console.error("Analytics error:", error);
        }
    }

    recordVisit();
})();