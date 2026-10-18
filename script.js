const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const searchBox = document.querySelector(".search-box");
const searchInput = document.querySelector(".search-box input");
const filterButtons = [...document.querySelectorAll(".filter-tab")];
const gameCards = [...document.querySelectorAll(".game-card")];
const emptyState = document.querySelector(".empty-state");
const categoryCards = [...document.querySelectorAll(".category-card")];

function setFilter(filter) {
  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  let visibleCount = 0;
  gameCards.forEach((card) => {
    const matchesCategory = filter === "All" || card.dataset.category === filter;
    const query = searchInput.value.trim().toLowerCase();
    const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
    const visible = matchesCategory && matchesSearch;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  emptyState.hidden = visibleCount > 0;
}

filterButtons.forEach((button) => {
  button.setAttribute("aria-pressed", String(button.classList.contains("is-selected")));
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

categoryCards.forEach((card) => {
  card.addEventListener("click", () => {
    const matchingTab = filterButtons.find((button) => button.dataset.filter === card.dataset.filter);
    if (matchingTab) setFilter(matchingTab.dataset.filter);
  });
});

searchBox.addEventListener("submit", (event) => event.preventDefault());
searchBox.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 620px)").matches) {
    searchBox.classList.add("is-open");
    searchInput.focus();
  }
});

searchInput.addEventListener("input", () => {
  const selectedFilter = filterButtons.find((button) => button.classList.contains("is-selected"));
  setFilter(selectedFilter ? selectedFilter.dataset.filter : "All");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    searchInput.blur();
    searchBox.classList.remove("is-open");
    setFilter("All");
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
  setFilter("All");
  searchInput.value = "";
  document.querySelector(".games-grid").scrollIntoView({ behavior: "smooth", block: "center" });
});
