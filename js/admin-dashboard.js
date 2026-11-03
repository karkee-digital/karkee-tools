
const adminMessage = document.getElementById("adminMessage");
const logoutBtn = document.getElementById("logoutBtn");

async function checkAdminAccess() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: admin, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return;
    }

    adminMessage.textContent = "Welcome! Admin access verified.";
    adminMessage.className = "mt-4 text-success";
}

logoutBtn.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
});

checkAdminAccess();
