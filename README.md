# SIMOO Gaming Catalogue

A responsive, static gaming catalogue built with plain HTML, CSS, and JavaScript. It has no build step, package dependencies, authentication, or cloud-service configuration.

## Run locally

From the project folder, start a local static server with `python -m http.server 8000`, then open `http://localhost:8000/`. For example, test a shareable game detail with `http://localhost:8000/?game=730`. The same static files can be deployed directly to GitHub Pages.

## Project files

- `index.html` contains the page structure and navigation.
- `styles.css` contains the responsive visual design.
- `games.js` contains the curated game and category data.
- `script.js` renders the catalogue and handles search, filters, mobile navigation, game details, favorites, free-game listings, and artwork fallbacks.

## Catalogue and trending picks

Game cards and category counts are generated from `games.js`. Each entry includes a Steam app ID, title, genre, and searchable categories. Store links and Steam artwork are derived from that app ID. The catalogue uses official Steam store pages; availability may vary by region. Artwork tries Steam's portrait image and then its header image before showing an unavailable-artwork fallback.

The “Trending picks” section contains only games explicitly marked `trending: true` in `games.js`. This is a manually curated editorial selection, not a ranking of live player counts, sales, reviews, or other real-time popularity data. Update those flags to change the selections.

## Game details and favorites

Select a game card to open its shareable detail URL (`?game=STEAM_APP_ID`). The detail page reuses the catalogue entry and its Steam app ID to show the Steam Store metadata snapshot in `games.js`: descriptions, release dates, developers, publishers, platforms, and PC requirements when Steam provides them. Missing fields are omitted rather than filled with invented data; system requirements appear only when Steam provides them. The page links to the official Steam store listing and suggests related catalogue games based on shared categories.

Use the detail page's Back button or the browser's Back button to return to the catalogue. Favorites are saved in the current browser using localStorage and do not require an account. A network connection is needed for Steam artwork; catalogue browsing, details, search, and category filters work from the static files.

## Free Games

The **Free Games** navigation section filters the existing catalogue; it does not add duplicate game records. Its seven entries were checked on October 19, 2026 against Steam's public Store API (`https://store.steampowered.com/api/appdetails?appids=APP_ID&l=english&cc=us`) for `type: game`, `is_free: true`, and Windows support. The verification list is `SIMOO_FREE_GAMES` in `games.js`. Entries link to their official Steam store pages, which may require the Steam client to install. SIMOO does not host game files. Check each store page for current regional availability and terms; free offers can change. The section has its own search and catalogue-category filters, and lists PC requirements only when available in the saved Steam details. A separate download size is not shown because none is recorded in the project data.

## GitHub Pages

This is a static site and can be served directly from the repository root:

1. Push the project to GitHub.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the `main` branch and `/ (root)`, and save.

No build command or GitHub Actions workflow is required. This project does not implement Google sign-in or cloud synchronization.