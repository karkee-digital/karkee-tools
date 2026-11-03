

const SUPABASE_URL = "https://kejeavqtfyqtldbcosrx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5U_dO2U1c4FGeqPch7k6gw_yzmtBN_K";

const { createClient } = supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("name, slug");

    if (error) {
        console.error("Supabase connection failed:", error.message);
        return;
    }

    console.log("Supabase connected successfully!");
    console.log("Available categories:", data);
}

testSupabaseConnection();


async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("*")
        .order("name");

    if (error) {
        console.error("Category loading failed:", error.message);
        return;
    }

    console.log("Categories loaded:", data);

    data.forEach(category => {
        console.log(category.name, category.slug);
    });
}

loadCategories();

