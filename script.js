const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const searchBox = document.querySelector(".search-box");
const searchInput = searchBox.querySelector("input");
const categoryGrid = document.querySelector(".category-grid");
const filterTabs = document.querySelector(".games-section > .filter-tabs");
const freeGameFilters = document.querySelector(".free-game-filters");
const freeGamesGrid = document.querySelector(".free-games-grid");
const freeGamesStatus = document.querySelector(".free-games-status");
const freeGamesEmpty = document.querySelector(".free-games-empty");
const freeGamesSearch = document.querySelector("#free-games-search");
const labForm = document.querySelector(".lab-form");
const labGenre = document.querySelector("#lab-genre");
const labExperience = document.querySelector("#lab-experience");
const labPrice = document.querySelector("#lab-price");
const labMultiplayer = document.querySelector("#lab-multiplayer");
const labResultsGrid = document.querySelector(".lab-results-grid");
const labResultsTitle = document.querySelector(".lab-results-title");
const labResultsStatus = document.querySelector(".lab-results-status");
const labEmptyState = document.querySelector(".lab-empty-state");
const mysteryButton = document.querySelector(".button-mystery");
const mysteryResult = document.querySelector(".mystery-result");
const labQuestList = document.querySelector(".lab-quest-list");
const labPoints = document.querySelector(".lab-points strong");
const labQuestStatus = document.querySelector(".lab-quest-status");
const labResetProgress = document.querySelector(".lab-reset-progress");
const catalogueGrid = document.querySelector(".catalogue-grid");
const trendingGrid = document.querySelector(".trending-grid");
const emptyState = document.querySelector(".empty-state");
const catalogueStatus = document.querySelector(".catalogue-status");
const detailView = document.querySelector("#game-detail-view");
const detailContent = detailView.querySelector(".game-detail-content");
const catalogueSections = [...document.querySelectorAll("main > section:not(#game-detail-view)")];
const games = window.SIMOO_GAMES;
const categories = window.SIMOO_CATEGORIES;
const gameDetails = window.SIMOO_GAME_DETAILS;
const verifiedFreeGames = window.SIMOO_FREE_GAMES;
const favoriteStorageKey = "simoo-favorite-games";
const questStorageKey = "simoo-game-lab-quests";

if (!Array.isArray(games) || !Array.isArray(categories) || !gameDetails || !Array.isArray(verifiedFreeGames)) {
  throw new Error("SIMOO game catalogue failed to load.");
}

const uniqueIds = new Set(games.map((game) => game.steamAppId));
if (games.length < 50 || uniqueIds.size !== games.length) {
  throw new Error("SIMOO catalogue must contain at least 50 games with unique Steam IDs.");
}

const verifiedFreeGameIds = new Set();
verifiedFreeGames.forEach(({ steamAppId, verifiedAt }) => {
  const game = games.find((entry) => entry.steamAppId === steamAppId);
  if (
    !game
    || verifiedFreeGameIds.has(steamAppId)
    || !/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)
    || gameDetails[steamAppId]?.platforms?.windows !== true
  ) {
    throw new Error(`Invalid verified free-game entry: ${steamAppId}.`);
  }
  verifiedFreeGameIds.add(steamAppId);
});

const categoryCounts = new Map(categories.map(({ name }) => [
  name,
  games.filter((game) => game.categories.includes(name)).length,
]));
const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const steamImage = (steamAppId, imageName) =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/${imageName}.jpg`;
const steamStoreUrl = (game) => `https://store.steampowered.com/app/${game.steamAppId}/`;

let activeCategory = "All";
let query = "";
let activeFreeGameCategory = "All";
let freeGamesQuery = "";
let previousMysteryGameId = null;
let mysteryRevealTimer = null;
let questProgress = { discoveredGames: [], exploredCategories: [], mysteryGames: [] };
let questStorageAvailable = true;

function createFilterButton(label, value, selected = false) {
  const button = document.createElement("button");
  button.className = `filter-tab${selected ? " is-selected" : ""}`;
  button.type = "button";
  button.dataset.filter = value;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(selected));
  return button;
}

function renderFilters() {
  const fragment = document.createDocumentFragment();
  fragment.append(createFilterButton("All games", "All", true));
  categories.forEach(({ name }) => fragment.append(createFilterButton(name, name)));
  filterTabs.replaceChildren(fragment);

  const categoryCards = document.createDocumentFragment();
  categories.forEach(({ name, icon }, index) => {
    const firstGame = games.find((game) => game.categories.includes(name));
    const card = document.createElement("a");
    card.className = "category-card";
    card.href = "#games";
    card.dataset.filter = name;

    const art = document.createElement("img");
    art.className = "category-art";
    art.src = steamImage(firstGame.steamAppId, "header");
    art.alt = "";
    art.loading = "lazy";
    art.addEventListener("error", () => art.remove(), { once: true });

    const number = document.createElement("span");
    number.className = "category-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const symbol = document.createElement("span");
    symbol.className = "category-icon";
    symbol.textContent = icon;

    const title = document.createElement("span");
    title.className = "category-name";
    title.textContent = name;

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = `${categoryCounts.get(name)} GAMES`;

    card.append(art, number, symbol, title, count);
    categoryCards.append(card);
  });
  categoryGrid.replaceChildren(categoryCards);
}

function createGameCard(game, isEditorialPick = false) {
  const card = document.createElement("article");
  card.className = "game-card";
  card.dataset.categories = game.categories.join(" ");
  card.dataset.search = normalize(`${game.title} ${game.genre} ${game.categories.join(" ")}`);

  const detailLink = document.createElement("a");
  detailLink.className = "game-card-main";
  detailLink.href = `?game=${game.steamAppId}`;
  detailLink.setAttribute("aria-label", `View details for ${game.title}`);

  const cover = document.createElement("span");
  cover.className = "game-cover is-loading";

  const image = document.createElement("img");
  image.alt = `Artwork for ${game.title}, provided by Steam`;
  image.loading = "lazy";
  image.decoding = "async";
  image.src = steamImage(game.steamAppId, "library_600x900_2x");
  image.dataset.fallback = steamImage(game.steamAppId, "header");
  image.addEventListener("load", () => cover.classList.remove("is-loading"), { once: true });
  image.addEventListener("error", () => {
    if (image.dataset.fallback) {
      image.src = image.dataset.fallback;
      delete image.dataset.fallback;
      return;
    }
    cover.classList.remove("is-loading");
    cover.classList.add("is-image-missing");
    image.remove();
  });

  const fallback = document.createElement("span");
  fallback.className = "cover-fallback";
  fallback.textContent = "Artwork unavailable";
  fallback.setAttribute("aria-hidden", "true");

  cover.append(image, fallback);

  if (isEditorialPick) {
    const badge = document.createElement("span");
    badge.className = "game-badge badge-editorial";
    badge.textContent = "SIMOO PICK";
    cover.append(badge);
  }

  const overlay = document.createElement("span");
  overlay.className = "cover-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const playMark = document.createElement("span");
  playMark.className = "cover-play";
  playMark.textContent = "↗";
  overlay.append(playMark);
  cover.append(overlay);

  const info = document.createElement("div");
  info.className = "game-info";
  const details = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = game.title;
  const genre = document.createElement("span");
  genre.className = "game-genre";
  genre.textContent = game.genre;
  details.append(title, genre);
  info.append(details);

  const footer = document.createElement("div");
  footer.className = "game-footer";
  const categoriesLabel = document.createElement("span");
  categoriesLabel.textContent = game.categories.slice(0, 2).join(" · ");
  footer.append(categoriesLabel);

  detailLink.append(cover, info);
  card.append(detailLink, footer);

  const storeLink = document.createElement("a");
  storeLink.className = "platforms";
  storeLink.href = steamStoreUrl(game);
  storeLink.target = "_blank";
  storeLink.rel = "noopener noreferrer";
  storeLink.textContent = "STEAM ↗";
  storeLink.setAttribute("aria-label", `Open ${game.title} on Steam (opens in a new tab)`);
  footer.replaceChildren(categoriesLabel, storeLink);

  return card;
}

function visibleInCatalogue(game) {
  const matchesCategory = activeCategory === "All" || game.categories.includes(activeCategory);
  const matchesSearch = !query || normalize(`${game.title} ${game.genre} ${game.categories.join(" ")}`).includes(query);
  return matchesCategory && matchesSearch;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function attachImageFallback(image, fallbackSources, onFailure) {
  let fallbackIndex = 0;
  image.addEventListener("error", () => {
    if (fallbackIndex < fallbackSources.length) {
      image.src = fallbackSources[fallbackIndex];
      fallbackIndex += 1;
      return;
    }
    onFailure();
  });
}

function getFavoriteIds() {
  const storedFavorites = localStorage.getItem(favoriteStorageKey);
  if (storedFavorites === null) return [];

  const favorites = JSON.parse(storedFavorites);
  if (!Array.isArray(favorites) || !favorites.every(Number.isSafeInteger)) {
    throw new Error("Saved favorites have an invalid format.");
  }
  return [...new Set(favorites)];
}

function createInfoItem(label, value) {
  if (!value) return null;
  const wrapper = createElement("div", "detail-info-item");
  wrapper.append(createElement("dt", "", label), createElement("dd", "", value));
  return wrapper;
}

function renderGameDetail(game) {
  detailContent.replaceChildren();
  detailContent.dataset.gameId = String(game.steamAppId);
  document.title = `${game.title} | SIMOO`;

  const backButton = createElement("button", "button button-quiet detail-back", "← Back to catalogue");
  backButton.type = "button";
  backButton.addEventListener("click", returnToCatalogue);

  const hero = createElement("div", "detail-hero");
  const heroImage = createElement("img", "detail-hero-image");
  heroImage.alt = `${game.title} banner artwork, provided by Steam`;
  heroImage.decoding = "async";
  heroImage.src = steamImage(game.steamAppId, "header");
  attachImageFallback(
    heroImage,
    [steamImage(game.steamAppId, "library_600x900_2x")],
    () => {
      heroImage.hidden = true;
      hero.classList.add("detail-hero-no-image");
    },
  );
  const heroShade = createElement("div", "detail-hero-shade");
  const heroCopy = createElement("div", "detail-hero-copy");
  heroCopy.append(
    createElement("span", "section-kicker", game.categories.join(" · ").toUpperCase()),
    createElement("h1", "", game.title),
    createElement("p", "", game.genre),
  );
  hero.append(heroImage, heroShade, heroCopy);

  const sourceStatus = createElement("p", "detail-source-status", "Game information is provided by Steam when available; unavailable fields are omitted.");
  sourceStatus.setAttribute("role", "status");

  const detailBody = createElement("div", "detail-body");
  const coverPanel = createElement("aside", "detail-cover-panel");
  const coverImage = createElement("img", "detail-cover");
  coverImage.alt = `${game.title} cover artwork, provided by Steam`;
  coverImage.loading = "lazy";
  coverImage.decoding = "async";
  coverImage.src = steamImage(game.steamAppId, "library_600x900_2x");
  const coverFallback = createElement("span", "detail-cover-fallback", "Cover artwork unavailable");
  coverImage.addEventListener("error", () => {
    if (coverImage.dataset.fallbackUsed !== "true") {
      coverImage.dataset.fallbackUsed = "true";
      coverImage.src = steamImage(game.steamAppId, "header");
      return;
    }
    coverImage.hidden = true;
    coverFallback.hidden = false;
  });
  coverFallback.hidden = true;
  coverPanel.append(coverImage, coverFallback);

  const mainDetails = createElement("div", "detail-main");
  const actions = createElement("div", "detail-actions");
  const favoriteButton = createElement("button", "button button-favorite");
  favoriteButton.type = "button";
  favoriteButton.setAttribute("aria-pressed", "false");
  const favoriteStatus = createElement("span", "favorite-status");
  favoriteStatus.setAttribute("role", "status");
  const steamLink = createElement("a", "button button-primary detail-steam-link", "Open on Steam ↗");
  steamLink.href = steamStoreUrl(game);
  steamLink.target = "_blank";
  steamLink.rel = "noopener noreferrer";
  actions.append(favoriteButton, steamLink);
  if (verifiedFreeGameIds.has(game.steamAppId)) {
    const downloadLink = createElement("a", "button button-primary button-download-free", "DOWNLOAD FREE ↗");
    downloadLink.href = steamStoreUrl(game);
    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";
    downloadLink.setAttribute("aria-label", `Get ${game.title} free on Steam (opens in a new tab)`);
    actions.append(downloadLink);
  }

  const descriptionSection = createElement("section", "detail-section");
  descriptionSection.append(createElement("h2", "", "About this game"));
  const description = createElement("p", "detail-description", "A description is not available in the local catalogue.");
  descriptionSection.append(description);

  const infoSection = createElement("section", "detail-section");
  infoSection.append(createElement("h2", "", "Game information"));
  const infoList = createElement("dl", "detail-info-grid");
  infoSection.append(infoList);

  const requirementsSection = createElement("section", "detail-section detail-requirements");
  requirementsSection.append(createElement("h2", "", "PC system requirements"));
  const requirementsList = createElement("div", "requirements-list");
  requirementsSection.append(requirementsList);
  requirementsSection.hidden = true;

  const relatedSection = createElement("section", "detail-related");
  const relatedHeading = createElement("div", "section-heading");
  const relatedHeadingText = createElement("div");
  relatedHeadingText.append(createElement("span", "section-kicker", "KEEP EXPLORING"));
  const relatedTitle = createElement("h2");
  relatedTitle.append(document.createTextNode("Related "));
  relatedTitle.append(createElement("span", "", "games"));
  relatedHeadingText.append(relatedTitle);
  relatedHeading.append(relatedHeadingText);
  const relatedGrid = createElement("div", "games-grid trending-grid");
  const relatedGames = games
    .filter((candidate) => candidate.steamAppId !== game.steamAppId)
    .map((candidate) => ({
      candidate,
      overlap: candidate.categories.filter((category) => game.categories.includes(category)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((first, second) => second.overlap - first.overlap || Number(second.candidate.trending) - Number(first.candidate.trending))
    .slice(0, 4);
  relatedGames.forEach(({ candidate }) => relatedGrid.append(createGameCard(candidate)));
  relatedSection.append(relatedHeading, relatedGrid);

  let initialFavoriteIds;
  try {
    initialFavoriteIds = getFavoriteIds();
  } catch (error) {
    favoriteStatus.textContent = `Favorites are unavailable: ${error.message}`;
  }

  const updateFavoriteButton = (favoriteIds) => {
    const isFavorite = favoriteIds.includes(game.steamAppId);
    favoriteButton.textContent = isFavorite ? "♥ Remove from favorites" : "♡ Add to favorites";
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  };
  if (initialFavoriteIds) updateFavoriteButton(initialFavoriteIds);
  favoriteButton.addEventListener("click", () => {
    try {
      const favoriteIds = getFavoriteIds();
      const isFavorite = favoriteIds.includes(game.steamAppId);
      const updatedFavorites = isFavorite
        ? favoriteIds.filter((id) => id !== game.steamAppId)
        : [...favoriteIds, game.steamAppId];
      localStorage.setItem(favoriteStorageKey, JSON.stringify(updatedFavorites));
      updateFavoriteButton(updatedFavorites);
      favoriteStatus.textContent = isFavorite ? "Removed from favorites." : "Added to favorites on this device.";
    } catch (error) {
      favoriteStatus.textContent = `Favorites could not be saved: ${error.message}`;
    }
  });

  mainDetails.append(actions, favoriteStatus, descriptionSection, infoSection, requirementsSection);
  detailBody.append(coverPanel, mainDetails);
  detailContent.append(backButton, hero, sourceStatus, detailBody, relatedSection);

  const data = gameDetails[game.steamAppId] || {};
  if (typeof data.description === "string" && data.description.trim()) {
    description.textContent = data.description.trim();
  } else {
    descriptionSection.hidden = true;
  }

  const steamGenres = Array.isArray(data.genres) ? data.genres.filter(Boolean) : [];
  const platformLabels = data.platforms
    ? [
      data.platforms.windows && "Windows",
      data.platforms.mac && "macOS",
      data.platforms.linux && "Linux",
    ].filter(Boolean).join(", ")
    : "";
  const information = [
    createInfoItem("Genre", steamGenres.join(", ") || game.genre),
    createInfoItem("Release date", data.releaseDate || (data.comingSoon ? "Coming soon" : "")),
    createInfoItem("Developer", Array.isArray(data.developers) ? data.developers.filter(Boolean).join(", ") : ""),
    createInfoItem("Publisher", Array.isArray(data.publishers) ? data.publishers.filter(Boolean).join(", ") : ""),
    createInfoItem("Supported platforms", platformLabels),
  ].filter(Boolean);
  infoList.replaceChildren(...information);

  const requirementFields = [
    data.pcRequirements?.minimum && ["Minimum", data.pcRequirements.minimum],
    data.pcRequirements?.recommended && ["Recommended", data.pcRequirements.recommended],
  ].filter(Boolean);
  requirementFields.forEach(([label, text]) => {
    const requirement = createElement("div", "requirement-item");
    requirement.append(createElement("h3", "", label), createElement("p", "", text));
    requirementsList.append(requirement);
  });
  requirementsSection.hidden = requirementFields.length === 0;
  awardQuestAction(questProgress.discoveredGames, game.steamAppId, `New game discovered: ${game.title}. Quest progress saved in this browser.`);
}

function renderInvalidGame() {
  detailContent.replaceChildren();
  detailContent.dataset.gameId = "";
  document.title = "Game not found | SIMOO";
  const message = createElement("div", "detail-not-found");
  message.append(
    createElement("span", "section-kicker", "CATALOGUE"),
    createElement("h1", "", "Game not found"),
    createElement("p", "", "That game link is invalid or the game is no longer in the catalogue."),
  );
  const backButton = createElement("button", "button button-primary", "Back to catalogue");
  backButton.type = "button";
  backButton.addEventListener("click", returnToCatalogue);
  detailContent.append(message, backButton);
}

function returnToCatalogue() {
  const url = new URL(window.location.href);
  url.searchParams.delete("game");
  window.history.replaceState(null, "", url);
  renderRoute();
}

function renderRoute() {
  const url = new URL(window.location.href);
  const isGameRoute = url.searchParams.has("game");
  catalogueSections.forEach((section) => {
    section.hidden = isGameRoute;
  });
  detailView.hidden = !isGameRoute;

  if (!isGameRoute) {
    detailContent.replaceChildren();
    document.title = "Nexus Play — Find your next obsession";
    return;
  }

  const gameId = url.searchParams.get("game");
  const game = games.find((entry) => String(entry.steamAppId) === gameId);
  if (game) renderGameDetail(game);
  else renderInvalidGame();
}

function getFreeGamePlatforms(game) {
  const platforms = gameDetails[game.steamAppId]?.platforms;
  return [
    platforms?.windows && "Windows",
    platforms?.mac && "macOS",
    platforms?.linux && "Linux",
  ].filter(Boolean).join(", ");
}

function renderFreeGameFilters() {
  const freeGames = games.filter((game) => verifiedFreeGameIds.has(game.steamAppId));
  const freeCategories = [...new Set(freeGames.flatMap((game) => game.categories))];
  const fragment = document.createDocumentFragment();
  fragment.append(createFilterButton("All free games", "All", true));
  freeCategories.forEach((category) => fragment.append(createFilterButton(category, category)));
  freeGameFilters.replaceChildren(fragment);
}

function setFreeGameCategory(category) {
  activeFreeGameCategory = category;
  freeGameFilters.querySelectorAll(".filter-tab").forEach((button) => {
    const selected = button.dataset.filter === category;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderFreeGames();
}

function renderFreeGameCard(game) {
  const metadata = gameDetails[game.steamAppId] || {};
  const card = createElement("article", "free-game-card");
  const detailLink = createElement("a", "free-game-art-link");
  detailLink.href = `?game=${game.steamAppId}`;
  detailLink.setAttribute("aria-label", `View details for ${game.title}`);

  const cover = createElement("div", "free-game-cover");
  const image = createElement("img", "free-game-image");
  image.src = steamImage(game.steamAppId, "library_600x900_2x");
  image.alt = `${game.title} cover artwork, provided by Steam`;
  image.loading = "lazy";
  image.decoding = "async";
  const coverFallback = createElement("span", "free-game-cover-fallback", "Artwork unavailable");
  coverFallback.hidden = true;
  attachImageFallback(
    image,
    [steamImage(game.steamAppId, "header")],
    () => {
      image.hidden = true;
      coverFallback.hidden = false;
    },
  );
  cover.append(image, coverFallback);

  const cardContent = createElement("div", "free-game-content");
  const heading = createElement("h3");
  const titleLink = createElement("a", "", game.title);
  titleLink.href = `?game=${game.steamAppId}`;
  heading.append(titleLink);
  cardContent.append(
    heading,
    createElement("p", "free-game-genre", `${game.genre} · ${game.categories.join(" · ")}`),
    createElement("p", "free-game-description", metadata.description || "Description is not available in the local game data."),
    createElement("p", "free-game-platforms", `PC: ${getFreeGamePlatforms(game) || "Windows"}`),
  );

  const requirements = metadata.pcRequirements || {};
  const requirementEntries = [
    ["Minimum", requirements.minimum],
    ["Recommended", requirements.recommended],
  ].filter(([, value]) => typeof value === "string" && value.trim());
  if (requirementEntries.length > 0) {
    const requirementsDetails = createElement("details", "free-game-requirements");
    requirementsDetails.append(createElement("summary", "", "PC system requirements"));
    requirementEntries.forEach(([label, value]) => {
      const requirement = createElement("div", "free-game-requirement");
      requirement.append(createElement("h4", "", label));
      const list = createElement("ul");
      value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
        list.append(createElement("li", "", line.replace(/^[-•]\s*/, "")));
      });
      requirement.append(list);
      requirementsDetails.append(requirement);
    });
    cardContent.append(requirementsDetails);
  }

  const actions = createElement("div", "free-game-actions");
  const downloadLink = createElement("a", "button button-primary button-download-free", "DOWNLOAD FREE ↗");
  downloadLink.href = steamStoreUrl(game);
  downloadLink.target = "_blank";
  downloadLink.rel = "noopener noreferrer";
  downloadLink.setAttribute("aria-label", `Get ${game.title} free on Steam (opens in a new tab)`);
  actions.append(downloadLink);

  const verifiedEntry = verifiedFreeGames.find((entry) => entry.steamAppId === game.steamAppId);
  const verifiedLabel = createElement("span", "free-game-verified", `Steam free-to-play · verified ${verifiedEntry.verifiedAt}`);
  card.append(detailLink, cardContent, actions, verifiedLabel);
  detailLink.append(cover);
  return card;
}

function renderFreeGames() {
  const matches = games.filter((game) => {
    if (!verifiedFreeGameIds.has(game.steamAppId)) return false;
    const matchesCategory = activeFreeGameCategory === "All" || game.categories.includes(activeFreeGameCategory);
    const metadata = gameDetails[game.steamAppId] || {};
    const searchable = normalize([
      game.title,
      game.genre,
      ...game.categories,
      metadata.description || "",
      getFreeGamePlatforms(game),
    ].join(" "));
    return matchesCategory && (!freeGamesQuery || searchable.includes(freeGamesQuery));
  });
  const fragment = document.createDocumentFragment();
  matches.forEach((game) => fragment.append(renderFreeGameCard(game)));
  freeGamesGrid.replaceChildren(fragment);
  freeGamesGrid.hidden = matches.length === 0;
  freeGamesEmpty.hidden = matches.length > 0;
  freeGamesStatus.textContent = `${matches.length} verified free-to-play ${matches.length === 1 ? "game" : "games"}${activeFreeGameCategory === "All" ? "" : ` in ${activeFreeGameCategory}`}${freeGamesQuery ? " matching your search" : ""}.`;
}

function populateLabGenres() {
  const genres = [...new Set(games.map((game) => game.genre).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
  genres.forEach((genre) => {
    const option = createElement("option", "", genre);
    option.value = genre;
    labGenre.append(option);
  });
}

function matchesExperience(game, experience) {
  const genre = normalize(game.genre);
  switch (experience) {
    case "action":
      return game.categories.includes("Action") || /action|shooter|combat|moba/.test(genre);
    case "adventure":
      return game.categories.includes("Adventure") || /adventure|exploration|open.world/.test(genre);
    case "story":
      return /story|narrative/.test(genre);
    case "strategy":
      return game.categories.includes("Strategy") || game.categories.includes("Simulation");
    case "puzzle":
      return game.categories.includes("Puzzle") || game.categories.includes("Indie");
    default:
      return true;
  }
}

function renderLabResult(game, reasons) {
  const card = createElement("article", "lab-result-card");
  const link = createElement("a", "lab-result-link");
  link.href = `?game=${game.steamAppId}`;
  link.setAttribute("aria-label", `Open details for ${game.title}`);
  const image = createElement("img", "lab-result-image");
  image.src = steamImage(game.steamAppId, "header");
  image.alt = `${game.title} artwork, provided by Steam`;
  image.loading = "lazy";
  image.decoding = "async";
  const imageFallback = createElement("span", "lab-result-image-fallback", "Artwork unavailable");
  imageFallback.hidden = true;
  attachImageFallback(image, [steamImage(game.steamAppId, "library_600x900_2x")], () => {
    image.hidden = true;
    imageFallback.hidden = false;
  });
  link.append(image, imageFallback);

  const copy = createElement("div", "lab-result-copy");
  copy.append(
    createElement("h4", "", game.title),
    createElement("p", "", game.genre),
  );
  if (verifiedFreeGameIds.has(game.steamAppId)) {
    copy.append(createElement("span", "lab-result-free", "FREE TO PLAY"));
  }

  const reasonList = createElement("ul", "lab-result-reasons");
  reasons.forEach((reason) => reasonList.append(createElement("li", "", reason)));
  const openLink = createElement("a", "lab-result-open", "View game details ↗");
  openLink.href = `?game=${game.steamAppId}`;
  openLink.className = "lab-result-open lab-result-link";
  card.append(link, copy, reasonList, openLink);
  return card;
}

function recommendLabGames() {
  const preferredGenre = labGenre.value;
  const preferredExperience = labExperience.value;
  const freeOnly = labPrice.value === "free";
  const multiplayer = labMultiplayer.value;
  const matches = games.map((game, index) => {
    if (freeOnly && !verifiedFreeGameIds.has(game.steamAppId)) return null;
    if (preferredGenre && game.genre !== preferredGenre) return null;
    if (preferredExperience && !matchesExperience(game, preferredExperience)) return null;
    if (multiplayer === "exclude" && game.categories.includes("Multiplayer")) return null;

    const reasons = [];
    let score = 0;
    if (preferredGenre) {
      reasons.push(`${game.genre} match`);
      score += 4;
    }
    if (preferredExperience) {
      reasons.push(labExperience.selectedOptions[0].textContent);
      score += 2;
    }
    if (freeOnly) {
      reasons.push("Verified free-to-play");
      score += 4;
    }
    if (multiplayer === "prefer" && game.categories.includes("Multiplayer")) {
      reasons.push("Multiplayer-tagged");
      score += 2;
    }
    if (reasons.length === 0) reasons.push(...game.categories.slice(0, 2));
    return { game, index, reasons, score };
  }).filter(Boolean);

  matches.sort((first, second) => second.score - first.score || first.index - second.index);
  const recommendations = matches.slice(0, 4);
  labResultsGrid.replaceChildren(...recommendations.map(({ game, reasons }) => renderLabResult(game, reasons)));
  labEmptyState.hidden = recommendations.length > 0;
  labResultsGrid.hidden = recommendations.length === 0;
  labResultsTitle.textContent = recommendations.length
    ? "Your next worlds"
    : "Ready when you are";
  labResultsStatus.textContent = recommendations.length
    ? `Showing ${recommendations.length} of ${matches.length} ${matches.length === 1 ? "match" : "matches"}, ranked by how closely they fit your choices.`
    : "No games fit every selected filter. Loosen a choice and give it another go.";
}

function newQuestProgress() {
  return { discoveredGames: [], exploredCategories: [], mysteryGames: [] };
}

function loadQuestProgress() {
  const stored = localStorage.getItem(questStorageKey);
  if (stored === null) return newQuestProgress();

  const parsed = JSON.parse(stored);
  const knownCategories = new Set(categories.map(({ name }) => name));
  if (
    !parsed
    || !Array.isArray(parsed.discoveredGames)
    || !Array.isArray(parsed.exploredCategories)
    || !Array.isArray(parsed.mysteryGames)
    || !parsed.discoveredGames.every((id) => Number.isSafeInteger(id) && uniqueIds.has(id))
    || !parsed.mysteryGames.every((id) => Number.isSafeInteger(id) && uniqueIds.has(id))
    || !parsed.exploredCategories.every((category) => knownCategories.has(category))
  ) {
    throw new Error("Saved Game Lab quest progress has an invalid format.");
  }
  return {
    discoveredGames: [...new Set(parsed.discoveredGames)],
    exploredCategories: [...new Set(parsed.exploredCategories)],
    mysteryGames: [...new Set(parsed.mysteryGames)],
  };
}

function renderQuestProgress() {
  const discovered = questProgress.discoveredGames.length;
  const explored = questProgress.exploredCategories.length;
  const mysteries = questProgress.mysteryGames.length;
  const quests = [
    { title: "First contact", description: "Open details for 3 different games.", progress: discovered, target: 3, xp: discovered * 10, badge: "WORLD HOPPER" },
    { title: "Map the multiverse", description: "Explore 3 different catalogue categories.", progress: explored, target: 3, xp: explored * 5, badge: "CATEGORY SCOUT" },
    { title: "Into the unknown", description: "Reveal 3 different mystery games.", progress: mysteries, target: 3, xp: mysteries * 5, badge: "WILD CARD" },
  ];
  labPoints.textContent = String(quests.reduce((total, quest) => total + quest.xp, 0));
  labQuestList.replaceChildren(...quests.map((quest) => {
    const complete = quest.progress >= quest.target;
    const row = createElement("article", `lab-quest${complete ? " is-complete" : ""}`);
    const icon = createElement("span", "lab-quest-icon", complete ? "✦" : "◇");
    icon.setAttribute("aria-hidden", "true");
    const copy = createElement("div", "lab-quest-copy");
    copy.append(
      createElement("h4", "", quest.title),
      createElement("p", "", quest.description),
      createElement("span", "lab-quest-badge", complete ? `BADGE EARNED · ${quest.badge}` : `BADGE · ${quest.badge}`),
    );
    const progress = createElement("div", "lab-quest-progress");
    const progressLabel = createElement("span", "", `${Math.min(quest.progress, quest.target)} / ${quest.target}`);
    progressLabel.setAttribute("aria-label", `${Math.min(quest.progress, quest.target)} of ${quest.target} completed`);
    const bar = createElement("span", "lab-quest-track");
    const fill = createElement("span", "lab-quest-fill");
    fill.style.width = `${Math.min(100, quest.progress / quest.target * 100)}%`;
    bar.append(fill);
    progress.append(progressLabel, bar);
    row.append(icon, copy, progress);
    return row;
  }));
}

function saveQuestProgress(message) {
  try {
    localStorage.setItem(questStorageKey, JSON.stringify(questProgress));
    questStorageAvailable = true;
    labQuestStatus.textContent = message || "Quest progress saved in this browser.";
  } catch (error) {
    questStorageAvailable = false;
    labQuestStatus.textContent = `Quest progress could not be saved: ${error.message}`;
  }
  renderQuestProgress();
}

function awardQuestAction(collection, value, message) {
  if (collection.includes(value)) return;
  collection.push(value);
  saveQuestProgress(message);
}

function awardCategoryQuest(category) {
  if (category !== "All") {
    awardQuestAction(questProgress.exploredCategories, category, `Category explored: ${category}. Progress saved in this browser.`);
  }
}

function revealMysteryGame() {
  if (mysteryRevealTimer !== null) return;
  const validGames = games.filter((game) => uniqueIds.has(game.steamAppId) && game.title && game.genre && game.categories.length > 0);
  const candidates = validGames.filter((game) => game.steamAppId !== previousMysteryGameId);
  if (candidates.length === 0) {
    labQuestStatus.textContent = "No valid games are available for a mystery reveal.";
    return;
  }
  const game = candidates[Math.floor(Math.random() * candidates.length)];
  previousMysteryGameId = game.steamAppId;
  mysteryButton.disabled = true;
  mysteryResult.hidden = false;
  mysteryResult.setAttribute("aria-busy", "true");
  mysteryResult.classList.remove("is-revealed", "is-rolling");
  mysteryResult.classList.add("is-rolling");
  mysteryResult.replaceChildren(createElement("p", "mystery-scanning", "CALIBRATING THE GAME GRID…"));

  const reveal = () => {
    mysteryResult.classList.remove("is-rolling");
    const content = createElement("div", "mystery-game");
    const image = createElement("img", "mystery-game-image");
    image.src = steamImage(game.steamAppId, "header");
    image.alt = `${game.title} artwork, provided by Steam`;
    const imageFallback = createElement("span", "mystery-image-fallback", "Artwork unavailable");
    imageFallback.hidden = true;
    attachImageFallback(image, [steamImage(game.steamAppId, "library_600x900_2x")], () => {
      image.hidden = true;
      content.classList.add("mystery-no-image");
      imageFallback.hidden = false;
    });
    const copy = createElement("div", "mystery-game-copy");
    copy.append(
      createElement("span", "section-kicker", game.categories.join(" · ").toUpperCase()),
      createElement("h4", "", game.title),
      createElement("p", "", game.genre),
    );
    const actions = createElement("div", "mystery-actions");
    const detailLink = createElement("a", "button button-primary mystery-detail-link", "Open game details ↗");
    detailLink.href = `?game=${game.steamAppId}`;
    const againButton = createElement("button", "button button-quiet mystery-again", "Try another");
    againButton.type = "button";
    againButton.addEventListener("click", revealMysteryGame);
    actions.append(detailLink, againButton);
    content.append(image, imageFallback, copy, actions);
    mysteryResult.replaceChildren(content);
    mysteryResult.setAttribute("aria-busy", "false");
    mysteryResult.classList.add("is-revealed");
    mysteryButton.disabled = false;
    mysteryRevealTimer = null;
    awardQuestAction(questProgress.mysteryGames, game.steamAppId, `Mystery revealed: ${game.title}. Quest progress saved in this browser.`);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    reveal();
  } else {
    mysteryRevealTimer = window.setTimeout(reveal, 620);
  }
}

function renderGames() {
  const matches = games.filter(visibleInCatalogue);
  const catalogueFragment = document.createDocumentFragment();
  matches.forEach((game) => catalogueFragment.append(createGameCard(game)));
  catalogueGrid.replaceChildren(catalogueFragment);

  const editorialMatches = games.filter((game) => game.trending && (!query || normalize(`${game.title} ${game.genre} ${game.categories.join(" ")}`).includes(query)));
  const editorialFragment = document.createDocumentFragment();
  editorialMatches.forEach((game) => editorialFragment.append(createGameCard(game, true)));
  trendingGrid.replaceChildren(editorialFragment);
  trendingGrid.closest(".trending-section").hidden = query.length > 0 && editorialMatches.length === 0;

  emptyState.hidden = matches.length > 0;
  catalogueGrid.hidden = matches.length === 0;
  catalogueStatus.textContent = query
    ? `${matches.length} ${matches.length === 1 ? "game" : "games"} found${activeCategory === "All" ? "" : ` in ${activeCategory}`}.`
    : `${matches.length} ${matches.length === 1 ? "game" : "games"}${activeCategory === "All" ? " in the catalogue" : ` in ${activeCategory}`}.`;
}

function setCategory(category) {
  activeCategory = category;
  filterTabs.querySelectorAll(".filter-tab").forEach((button) => {
    const selected = button.dataset.filter === category;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderGames();
  awardCategoryQuest(category);
}

renderFilters();
renderFreeGameFilters();
populateLabGenres();
try {
  questProgress = loadQuestProgress();
} catch (error) {
  questStorageAvailable = false;
  labQuestStatus.textContent = `Saved Game Lab progress could not be read: ${error.message}`;
}
renderQuestProgress();
document.querySelector("#catalogue-total").textContent = String(games.length);
document.querySelector("#category-total").textContent = String(categories.length);
document.querySelector("#store-total").textContent = String(games.length);
renderGames();
renderFreeGames();

labForm.addEventListener("submit", (event) => {
  event.preventDefault();
  recommendLabGames();
});

labForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    labResultsGrid.replaceChildren();
    labResultsGrid.hidden = false;
    labEmptyState.hidden = true;
    labResultsTitle.textContent = "Ready when you are";
    labResultsStatus.textContent = "Set any combination of filters to shape your shortlist.";
  }, 0);
});

document.querySelector(".lab-empty-reset").addEventListener("click", () => {
  labForm.reset();
});

mysteryButton.addEventListener("click", revealMysteryGame);

labResetProgress.addEventListener("click", () => {
  if (!window.confirm("Reset all SIMOO Game Lab quest progress saved in this browser? This cannot be undone.")) return;
  questProgress = newQuestProgress();
  saveQuestProgress("Quest progress reset in this browser.");
});

filterTabs.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-tab");
  if (button) setCategory(button.dataset.filter);
});

freeGameFilters.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-tab");
  if (button) setFreeGameCategory(button.dataset.filter);
});

freeGamesSearch.addEventListener("input", () => {
  freeGamesQuery = normalize(freeGamesSearch.value.trim());
  renderFreeGames();
});

categoryGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".category-card");
  if (card) setCategory(card.dataset.filter);
});

searchBox.addEventListener("submit", (event) => event.preventDefault());
searchBox.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 620px)").matches) {
    searchBox.classList.add("is-open");
    searchInput.focus();
  }
});

searchInput.addEventListener("input", () => {
  query = normalize(searchInput.value.trim());
  renderGames();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    query = "";
    searchInput.blur();
    searchBox.classList.remove("is-open");
    setCategory("All");
  }
  if (event.key === "Escape" && document.activeElement === freeGamesSearch) {
    freeGamesSearch.value = "";
    freeGamesQuery = "";
    freeGamesSearch.blur();
    setFreeGameCategory("All");
  }
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  mainNav.classList.toggle("is-open", !isOpen);
});

mainNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }
});

document.querySelector(".carousel-button").addEventListener("click", () => {
  searchInput.value = "";
  query = "";
  setCategory("All");
  document.querySelector("#games").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector(".reset-catalogue").addEventListener("click", () => {
  searchInput.value = "";
  query = "";
  setCategory("All");
  document.querySelector("#games").scrollIntoView({ behavior: "smooth", block: "start" });
});

searchInput.placeholder = `Search ${games.length} games...`;

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const destination = new URL(link.href, window.location.href);
  if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname) {
    return;
  }

  if (
    link.matches(".game-card-main, .free-game-art-link, .free-game-content h3 a, .lab-result-link, .mystery-detail-link")
    && destination.searchParams.has("game")
  ) {
    event.preventDefault();
    window.history.pushState({ simooGameDetail: true }, "", destination);
    renderRoute();
    window.scrollTo(0, 0);
    return;
  }

  if (!detailView.hidden && (destination.hash || link.classList.contains("brand"))) {
    destination.searchParams.delete("game");
    window.history.replaceState(null, "", destination);
    renderRoute();
  }
});

window.addEventListener("popstate", renderRoute);
renderRoute();

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -40px 0px", threshold: 0.04 });

  document.querySelectorAll("main > section:not(.hero):not(#game-detail-view)").forEach((section) => {
    section.classList.add("cinematic-reveal");
    sectionObserver.observe(section);
  });
}
