const pokemonInput = document.getElementById("pokemonInput");
const searchButton = document.getElementById("searchButton");
const searchForm = document.getElementById("searchForm");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("pokemonGrid");
const loadMoreButton = document.getElementById("loadMoreButton");

const overlayEl = document.getElementById("overlay");
const overlayCloseBtn = document.getElementById("overlayClose");
const overlayContentEl = document.getElementById("overlayContent");

const overlayPrevBtn = document.getElementById("overlayPrev");
const overlayNextBtn = document.getElementById("overlayNext");

let offset = 0;
const limit = 20;
let isLoading = false;
let currentOverlayIndex = -1;
let currentDisplayList = [];
const allLoadedPokemon = [];
const detailsCache = new Map();

function setStatus(message = "") {
  statusEl.textContent = message;
}

function updateSearchState() {
  const value = pokemonInput.value.trim();
  searchButton.disabled = value.length < 3;

  if (value.length == 0) {
    setStatus("");
    gridEl.innerHTML = "";
    loadMoreButton.style.display = "";
    currentDisplayList = allLoadedPokemon;
    if (allLoadedPokemon.length > 0) renderCards(allLoadedPokemon);
  }
}

function getQuery() {
  return pokemonInput.value.trim().toLowerCase();
}

function onSearchSubmit(event) {
  event.preventDefault();

  const query = getQuery();
  if (query.length < 3) {
    setStatus("Type at least 3 letters to initate search!");
    return;
  }

  gridEl.innerHTML = "";
  loadMoreButton.style.display = "none";

  const searchResults = allLoadedPokemon.filter((pokemon) =>
    pokemon.name.includes(query),
  );

  if (searchResults.length === 0) {
    setStatus("No pokemon found!");
    return;
  }

  currentDisplayList = searchResults;
  setStatus(`Search result for: ${query}`);
  renderCards(searchResults);
}

async function fetchPokemonDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id);

  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  console.log("details == ", data);
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

const cardTemplate = document.getElementById("cardTemplate");

function createCard(pokemon) {
  const id = getIdFromPokemonUrl(pokemon.url);
  const clone = cardTemplate.content.cloneNode(true);
  const card = clone.querySelector(".card");
  card.dataset.id = id;
  clone.querySelector(".card__id").textContent = formatId(id);
  const img = clone.querySelector(".card__img");
  img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  img.alt = pokemon.name;
  clone.querySelector(".card__name").textContent = pokemon.name;
  return clone;
}

function renderCards(items) {
  if (items.length === 0) return;
  const fragment = document.createDocumentFragment();
  items.forEach((p) => fragment.appendChild(createCard(p)));
  gridEl.appendChild(fragment);
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

async function loadNextBatch() {
  if (isLoading) return;
  isLoading = true;
  loadMoreButton.disabled = true;
  setStatus("Loading Pokemon...");

  try {
    const data = await fetchPokemonList();
    allLoadedPokemon.push(...data.results);
    currentDisplayList = allLoadedPokemon;
    renderCards(data.results);
    offset += limit;

    const detailPromises = data.results.map((p) => {
      const id = Number(getIdFromPokemonUrl(p.url));
      return fetchPokemonDetails(id).catch(() => null);
    });
    await Promise.all(detailPromises);

    setStatus("");
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

  currentOverlayIndex = currentDisplayList.findIndex(
    (p) => getIdFromPokemonUrl(p.url) === id,
  );
  showCardDetails();
}

async function showCardDetails() {
  const pokemon = currentDisplayList[currentOverlayIndex];
  const id = Number(getIdFromPokemonUrl(pokemon.url));

  overlayPrevBtn.disabled = currentOverlayIndex <= 0;
  overlayNextBtn.disabled = currentOverlayIndex >= currentDisplayList.length - 1;

  try {
    const details = await fetchPokemonDetails(id);
    openOverlay(buildOverlayContent(details, id));
    setStatus("");
  } catch (err) {
    setStatus("Failed to load details. Please try again!");
  }
}

function openOverlay(content) {
  overlayContentEl.innerHTML = "";
  overlayContentEl.appendChild(content);
  overlayEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeOverlay() {
  overlayEl.classList.add("hidden");
  overlayContentEl.innerHTML = "";
  document.body.style.overflow = "";
}

const overlayCardTemplate = document.getElementById("overlayCardTemplate");

function buildOverlayContent(details, id) {
  const clone = overlayCardTemplate.content.cloneNode(true);
  const name = details.name;
  const img = details.sprites?.front_default || "";

  clone.querySelector(".overlayCard__name").textContent = name;
  clone.querySelector(".overlayCard__info").textContent =
    `${formatId(id)} . ${formatTypes(details.types)}`;
  clone.querySelector(".overlayCard__stats").textContent =
    `Height: ${details.height} . Weight: ${details.weight}`;

  const imgEl = clone.querySelector(".overlayCard__img");
  if (img) {
    imgEl.src = img;
    imgEl.alt = name;
  } else {
    imgEl.remove();
  }

  return clone;
}

pokemonInput.addEventListener("input", updateSearchState);
searchForm.addEventListener("submit", onSearchSubmit);
loadMoreButton.addEventListener("click", loadNextBatch);
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

overlayNextBtn.addEventListener("click", () => {
  currentOverlayIndex += 1;
  showCardDetails();
});
overlayPrevBtn.addEventListener("click", () => {
  currentOverlayIndex -= 1;
  showCardDetails();
});

updateSearchState();
loadNextBatch();
