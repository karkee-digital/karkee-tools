
// KARKEE TOOLS - Word Counter

const textInput = document.getElementById("text-input");

const wordCount = document.getElementById("word-count");
const characterCount = document.getElementById("character-count");
const noSpaceCount = document.getElementById("no-space-count");
const sentenceCount = document.getElementById("sentence-count");
const paragraphCount = document.getElementById("paragraph-count");

const clearButton = document.getElementById("clear-btn");
const copyButton = document.getElementById("copy-btn");

// Calculate text statistics
function updateCounts() {
    const text = textInput.value;

    // Word count
    const words = text.trim()
        ? text.trim().split(/\s+/).length
        : 0;

    // Character count
    const characters = text.length;

    // Character count without spaces
    const charactersWithoutSpaces = text.replace(/\s/g, "").length;

    // Sentence count
    const sentences = text.trim()
        ? text.split(/[.!?]+/).filter(sentence => sentence.trim()).length
        : 0;

    // Paragraph count
    const paragraphs = text.trim()
        ? text.split(/\n\s*\n/).filter(paragraph => paragraph.trim()).length
        : 0;

    wordCount.textContent = words;
    characterCount.textContent = characters;
    noSpaceCount.textContent = charactersWithoutSpaces;
    sentenceCount.textContent = sentences;
    paragraphCount.textContent = paragraphs;
}

// Update counts while typing
textInput.addEventListener("input", updateCounts);

// Clear text
clearButton.addEventListener("click", function () {
    textInput.value = "";
    updateCounts();
    textInput.focus();
});

// Copy text
copyButton.addEventListener("click", async function () {
    if (!textInput.value) {
        copyButton.textContent = "Enter text first";
        return;
    }

    try {
        await navigator.clipboard.writeText(textInput.value);
        copyButton.textContent = "Copied!";

        setTimeout(() => {
            copyButton.textContent = "Copy Text";
        }, 1500);
    } catch (error) {
        copyButton.textContent = "Copy failed";
    }
});

// Initial count
updateCounts();
