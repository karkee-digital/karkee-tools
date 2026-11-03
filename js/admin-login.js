
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    loginMessage.textContent = "";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent = error.message;
        loginMessage.className = "text-center mt-3 text-danger";
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        return;
    }

    const { data: admin, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseClient.auth.signOut();

        loginMessage.textContent = "You are not authorized as an admin.";
        loginMessage.className = "text-center mt-3 text-danger";
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        return;
    }

    window.location.href = "dashboard.html";
});
