
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
                        visitor_id: visitorId
                    }
                }
            );

            if (error) {
                console.error("Analytics tracking failed:", error);
            } else {
                console.log(
                    "Analytics visit recorded:",
                    pagePath,
                    toolSlug
                );
            }
        } catch (error) {
            console.error("Analytics error:", error);
        }
    }

    recordVisit();
})();
