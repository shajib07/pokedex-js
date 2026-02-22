const pokemonInput = document.getElementById("pokemonInput");
const searchButton = document.getElementById("searchButton");
const searchForm = document.getElementById("searchForm");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("pokemonGrid");
const loadMoreButton = document.getElementById("loadMoreButton");

const spinnerEl = document.getElementById("spinner");

const overlayEl = document.getElementById("overlay");
const overlayCloseBtn = document.getElementById("overlayClose");
const overlayContentEl = document.getElementById("overlayContent");

const overlayPrevBtn = document.getElementById("overlayPrev");
const overlayNextBtn = document.getElementById("overlayNext");

const overlayCardTemplate = document.getElementById("overlayCardTemplate");
const cardTemplate = document.getElementById("cardTemplate");

let offset = 0;
const limit = 20;
let isLoading = false;
let currentOverlayIndex = -1;
let currentDisplayList = [];
const allLoadedPokemon = [];
const detailsCache = new Map();
const evoCache = new Map();

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

function filterPokemon(query) {
  return allLoadedPokemon.filter((p) => p.name.includes(query));
}

function showSearchResults(query) {
  const results = filterPokemon(query);
  if (results.length === 0) {
    setStatus("No pokemon found!");
    return;
  }
  currentDisplayList = results;
  setStatus(`Search result for: ${query}`);
  renderCards(results);
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
  showSearchResults(query);
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

const typeColors = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

function getTypeColor(types) {
  const primaryType = types[0].type.name;
  return typeColors[primaryType] || "#6890f0";
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

function applyCardDetails(card, clone, details) {
  const color = getTypeColor(details.types);
  clone.querySelector(".card__types").textContent = formatTypes(details.types);
  card.style.background = color + "30";
  card.style.borderColor = color + "50";
}

function createCard(pokemon, details) {
  const id = getIdFromPokemonUrl(pokemon.url);
  const clone = cardTemplate.content.cloneNode(true);
  const card = clone.querySelector(".card");
  card.dataset.id = id;
  clone.querySelector(".card__id").textContent = formatId(id);
  const img = clone.querySelector(".card__img");
  img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  img.alt = pokemon.name;
  clone.querySelector(".card__name").textContent = pokemon.name;
  if (details) applyCardDetails(card, clone, details);
  return clone;
}

function renderCards(items) {
  if (items.length === 0) return;
  const fragment = document.createDocumentFragment();
  items.forEach((p) => {
    const id = Number(getIdFromPokemonUrl(p.url));
    const details = detailsCache.get(id) || null;
    fragment.appendChild(createCard(p, details));
  });
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

async function prefetchBatchDetails(results) {
  const promises = results.map((p) => {
    const id = Number(getIdFromPokemonUrl(p.url));
    return fetchPokemonDetails(id).catch(() => null);
  });
  await Promise.all(promises);
}

async function loadAndRenderBatch() {
  const data = await fetchPokemonList();
  offset += limit;
  await prefetchBatchDetails(data.results);
  allLoadedPokemon.push(...data.results);
  currentDisplayList = allLoadedPokemon;
  renderCards(data.results);
}

async function loadNextBatch() {
  if (isLoading) return;
  isLoading = true;
  loadMoreButton.disabled = true;
  spinnerEl.classList.remove("hidden");
  setStatus("");
  try {
    await loadAndRenderBatch();
    setStatus("");
  } catch (err) {
    setStatus("Failed to load Pokemon. Please try again!");
  }
  spinnerEl.classList.add("hidden");
  isLoading = false;
  loadMoreButton.disabled = false;
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

function updateOverlayNav() {
  overlayPrevBtn.disabled = currentOverlayIndex <= 0;
  overlayNextBtn.disabled =
    currentOverlayIndex >= currentDisplayList.length - 1;
}

async function showCardDetails() {
  const pokemon = currentDisplayList[currentOverlayIndex];
  const id = Number(getIdFromPokemonUrl(pokemon.url));
  updateOverlayNav();
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

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createStatTrack(percent) {
  const track = createElement("div", "statBar__track");
  const fill = createElement("div", "statBar__fill");
  fill.style.width = `${percent}%`;
  track.appendChild(fill);
  return track;
}

function createStatRow(entry) {
  const row = createElement("div", "statBar");
  const percent = (entry.base_stat / 255) * 100;
  row.appendChild(createElement("span", "statBar__label", entry.stat.name));
  row.appendChild(createStatTrack(percent));
  row.appendChild(createElement("span", "statBar__value", entry.base_stat));
  return row;
}

function buildStatBars(stats, container) {
  stats.forEach((entry) => container.appendChild(createStatRow(entry)));
}

function setOverlayImage(card, imgUrl, name) {
  const imgEl = card.querySelector(".overlayCard__img");
  if (imgUrl) {
    imgEl.src = imgUrl;
    imgEl.alt = name;
  } else {
    imgEl.remove();
  }
}

function applyOverlayColor(card, color) {
  card.style.setProperty("--type-color", color);
  const header = card.querySelector(".overlayCard__header");
  header.style.background = `linear-gradient(135deg, ${color}90, ${color}40)`;
}

function createAboutRow(label, value) {
  const row = createElement("div", "aboutRow");
  row.appendChild(createElement("span", "aboutRow__label", label));
  row.appendChild(createElement("span", "aboutRow__value", value));
  return row;
}

function buildAboutTab(details, container) {
  const abilities = details.abilities.map((a) => a.ability.name).join(", ");
  container.appendChild(createAboutRow("Height", details.height));
  container.appendChild(createAboutRow("Weight", details.weight));
  container.appendChild(createAboutRow("Base Exp", details.base_experience));
  container.appendChild(createAboutRow("Abilities", abilities));
}

function buildMovesTab(details, container) {
  details.moves.forEach((m) => {
    container.appendChild(createElement("span", "moveTag", m.move.name));
  });
}

async function fetchEvolutionChain(speciesUrl) {
  if (evoCache.has(speciesUrl)) return evoCache.get(speciesUrl);
  const specRes = await fetch(speciesUrl);
  const specData = await specRes.json();
  const evoRes = await fetch(specData.evolution_chain.url);
  const evoData = await evoRes.json();
  evoCache.set(speciesUrl, evoData.chain);
  return evoData.chain;
}

function parseEvoChain(chain) {
  const stages = [];
  let current = chain;
  while (current) {
    const id = getIdFromPokemonUrl(current.species.url);
    stages.push({ name: current.species.name, id });
    current = current.evolves_to[0] || null;
  }
  return stages;
}

function createEvoStage(stage) {
  const el = createElement("div", "evoStage");
  const img = document.createElement("img");
  img.className = "evoStage__img";
  img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${stage.id}.png`;
  img.alt = stage.name;
  el.appendChild(img);
  el.appendChild(createElement("div", "", stage.name));
  return el;
}

async function buildEvolutionTab(details, container) {
  container.textContent = "Loading...";
  try {
    const chain = await fetchEvolutionChain(details.species.url);
    const stages = parseEvoChain(chain);
    container.textContent = "";
    const evoEl = createElement("div", "evoChain");
    stages.forEach((stage, i) => {
      if (i > 0) evoEl.appendChild(createElement("span", "evoArrow", "→"));
      evoEl.appendChild(createEvoStage(stage));
    });
    container.appendChild(evoEl);
  } catch {
    container.textContent = "Failed to load evolution data.";
  }
}

function switchTab(tabs, panels, name) {
  tabs.forEach((t) => t.classList.toggle("tab--active", t.dataset.tab === name));
  panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== name));
}

function setupTabs(card, details) {
  const tabs = card.querySelectorAll(".tab");
  const panels = card.querySelectorAll(".tabPanel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tabs, panels, tab.dataset.tab);
      if (tab.dataset.tab === "evolution" && !tab.dataset.loaded) {
        tab.dataset.loaded = "true";
        buildEvolutionTab(details, card.querySelector('[data-panel="evolution"]'));
      }
    });
  });
}

function fillOverlayHeader(card, details, id) {
  card.querySelector(".overlayCard__name").textContent = details.name;
  card.querySelector(".overlayCard__info").textContent =
    `${formatId(id)} . ${formatTypes(details.types)}`;
  setOverlayImage(card, details.sprites?.front_default, details.name);
}

function buildOverlayContent(details, id) {
  const clone = overlayCardTemplate.content.cloneNode(true);
  const card = clone.querySelector(".overlayCard");
  const color = getTypeColor(details.types);
  fillOverlayHeader(card, details, id);
  applyOverlayColor(card, color);
  buildAboutTab(details, card.querySelector('[data-panel="about"]'));
  buildStatBars(details.stats, card.querySelector('[data-panel="stats"]'));
  buildMovesTab(details, card.querySelector('[data-panel="moves"]'));
  setupTabs(card, details);
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
