
(function () {
  // Do not track admin pages.
  if (window.location.pathname.startsWith("/admin/")) {
    return;
  }

  // Create or reuse a pseudonymous browser ID.
  let visitorId = localStorage.getItem("karkee_visitor_id");

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("karkee_visitor_id", visitorId);
  }

  const pagePath = window.location.pathname;

  // Detect tool pages such as /tools/word-counter.html.
  const toolMatch = pagePath.match(/^\/tools\/([^/]+)\.html$/);
  const toolSlug = toolMatch ? toolMatch[1] : null;

  async function recordVisit() {
    if (typeof supabaseClient === "undefined") {
      console.error("Supabase client is not available.");
      return;
    }

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
    }
  }

  recordVisit();
})();
