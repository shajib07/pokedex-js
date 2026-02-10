const pokemonInput = document.getElementById("pokemonInput");
const searchButton = document.getElementById("searchButton");
const searchForm = document.getElementById("searchForm");

const statusEl = document.getElementById("status");
const gridEl = document.getElementById("pokemonGrid");
const loadMoreButton = document.getElementById("loadMoreButton");

let offset = 0;
const limit = 12;
let isLoading = false;

function setStatus(message = "") {
  statusEl.textContent = message;
}

function updateSearchState() {
  const value = pokemonInput.value.trim();
  searchButton.disabled = value.length < 3;
  if (value.length == 0) setStatus("");
}

function getQuery() {
  return pokemonInput.value.trim().toLowerCase();
}

function onSearchSubmit(event) {
  event.preventDefault();
  const q = getQuery();
  if (q.length < 3) {
    setStatus("Type at least 3 letters to initate search!");
    return;
  }

  setStatus(`Searching later: ${q}`);
}

function renderCards(items) {
    console.log("render == ", items)
  const html = items
    .map(
      (p) =>
        `<article class="card"><div class="card__name">${p.name}</div></article>`
    )
    .join("");

  gridEl.insertAdjacentHTML("beforeend", html);
}

async function fetchPokemonList() {
  const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}`);
  }
  const data = await result.json();
  return data;
}

async function loadnextBatch() {
  if (isLoading) return;
  isLoading = true;
  loadMoreButton.disabled = true;
  setStatus("Loading Pokemon...");

  try {
    const data = await fetchPokemonList();
    renderCards(data.results)
    offset += limit;
    setStatus("");
    console.log(data);
  } catch (err) {
    setStatus("Failed to load Pokemon. Please try again!");
  } finally {
    isLoading = false;
    loadMoreButton.disabled = false;
  }
}

pokemonInput.addEventListener("input", updateSearchState);
searchForm.addEventListener("submit", onSearchSubmit);
loadMoreButton.addEventListener("click", loadnextBatch)

updateSearchState();
loadnextBatch();
