console.log("Main Page ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());
// Common.js

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrfToken = getCookie('csrftoken');

function replaceMainContent(html, url, messageToDisplay = null) {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, "text/html");

  const newNavbar = newDoc.getElementById("navbar");
  const currentNavbar = document.getElementById("navbar");
  if (newNavbar && currentNavbar) currentNavbar.innerHTML = newNavbar.innerHTML;

  const newContent = newDoc.getElementById("main-content");
  if (!newContent) return;

  mainContent.style.opacity = "0";

  setTimeout(() => {
    mainContent.innerHTML = newContent.innerHTML;
    window.history.pushState({}, "", url);
    mainContent.style.opacity = "1";
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Display the message if one was passed
    if (messageToDisplay) {
      showAlert(messageToDisplay.message, messageToDisplay.type);
    }

    // Initialize all page scripts
    if (typeof initLoginPage === "function") initLoginPage();
    if (typeof initRegisterPage === "function") initRegisterPage();
    if (typeof initArticlePage === "function") initArticlePage();
    if (typeof initAddArticlePage === "function") initAddArticlePage();
    if (typeof initDraftPage === "function") initDraftPage();
  }, 100);
}

window.onpopstate = () => {
  fetch(window.location.pathname + "?format=html", { headers: { "X-Requested-With": "XMLHttpRequest" } })
    .then(r => r.text())
    .then(html => replaceMainContent(html, window.location.pathname))
    .catch(err => console.error("SPA Popstate Error:", err));
};

function loadSearchResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query) {
        fetch(`/api/articles/?search=${query}`)
            .then(response => response.json())
            .then(data => {
                const container = document.getElementById('articles-container');
                if (!container) return; // Skip if container doesn't exist
                container.innerHTML = ''; // Clear previous content

                data.forEach(article => {
                    const div = document.createElement('div');
                    div.className = 'article';
                    div.innerHTML = `<h2>${article.title}</h2><p>${article.content}</p>`;
                    container.appendChild(div);
                });
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSearchResults();
});