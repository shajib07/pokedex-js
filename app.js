const pokemonInput = document.getElementById("pokemonInput")
const searchButton = document.getElementById("searchButton")
const searchForm = document.getElementById("searchForm")
const statusEl = document.getElementById("status")

function setStatus(message = "") {
    statusEl.textContent = message
}

function updateSearchState() {
    const value = pokemonInput.value.trim();
    searchButton.disabled = value.length < 3;
    if (value.length == 0) setStatus("");
}

function getQuery() {
    return pokemonInput.value.trim().toLowerCase()
}

function onSearchSubmit() {
    event.preventDefault()
    const q = getQuery()
    if (q.length < 3) {
        setStatus("Type at least 3 letters to initate search!")
        return
    }

    setStatus("Searching later: ${q}")
}

pokemonInput.addEventListener("input", updateSearchState)
searchForm.addEventListener("submit", onSearchSubmit)

updateSearchState()
