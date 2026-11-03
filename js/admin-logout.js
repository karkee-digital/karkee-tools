
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Logout failed: " + error.message);
            logoutBtn.disabled = false;
            logoutBtn.textContent = "Logout";
            return;
        }

        window.location.href = "login.html";
    });
}
