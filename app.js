const pokemonInput = document.getElementById("pokemonInput");
const searchButton = document.getElementById("searchButton");
const searchForm = document.getElementById("searchForm");

const statusEl = document.getElementById("status");
const gridEl = document.getElementById("pokemonGrid");
const loadMoreButton = document.getElementById("loadMoreButton");

const overlayEl = document.getElementById("overlay");
const overlayCloseBtn = document.getElementById("overlayClose");
const overlayContentEl = document.getElementById("overlayContent");

let offset = 0;
const limit = 20;
let isLoading = false;

const detailsCache = new Map();

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

async function fetchPokemonDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id);

  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  detailsCache.set(id, data);
  return data;
}

function formatTypes(types) {
  return types.map((t) => t.type.name).join(", ");
}

function getIdFromPokemonUrl(url) {
  return url.split("/").filter(Boolean).pop();
}

function formatId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function renderCards(items) {
  console.log("render == ", items);
  const html = items
    .map((p) => {
      const id = getIdFromPokemonUrl(p.url);
      const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
      return `
      <article class="card" data-id="${id}">
        <div class="card__top">
          <span class="card__id">${formatId(id)}</span>
          <img class="card__img" src="${imgUrl}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="card__name">${p.name}</div>
      </article>
      `;
    })
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
    renderCards(data.results);
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

async function onGridClick(event) {
  const card = event.target.closest(".card");
  if (!card) return;

  const id = card.dataset.id;
  if (!id) return;

  setStatus("Loading details...");

  try {
    const details = await fetchPokemonDetails(id);
    openOverlay(buildOverlayHtml(details, id));
    setStatus("");
  } catch (err) {
    setStatus("Failed to load details. Please try again!");
  }
}

function openOverlay(html) {
  overlayContentEl.innerHTML = html;
  overlayEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeOverlay() {
  overlayEl.classList.add("hidden");
  overlayContentEl.innerHTML = "";
  document.body.style.overflow = "";
}

function buildOverlayHtml(details, id) {
  const types = formatTypes(details.types);
  const img = details.sprites?.front_default || "";
  const name = details.name;

  return `
    <div class="overlayCard">
        <div class="overlayCard__top">
            <div>
                <div class="overlayCard__name">${name}</div>
                <div class="overlayCard__meta">${formatId(id)} . ${types}</div>
            </div>
            ${img ? `<img class="overlayCard__img" src="${img}" alt=""${name}" />` : ""}
        </div>
        <div class="overlayCard__meta">Height: ${details.height} . Weight: ${details.weight}</div>
    </div>
    `;
}

pokemonInput.addEventListener("input", updateSearchState);
searchForm.addEventListener("submit", onSearchSubmit);
loadMoreButton.addEventListener("click", loadnextBatch);
gridEl.addEventListener("click", onGridClick);
overlayCloseBtn.addEventListener("click", closeOverlay);
overlayEl.addEventListener("click", (event) => {
  if (event.target.dataset.close === "true") closeOverlay();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlayEl.classList.contains("hidden")) {
    closeOverlay();
  }
});

updateSearchState();
loadnextBatch();
