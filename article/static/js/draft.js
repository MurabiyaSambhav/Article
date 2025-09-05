// drafts.js
console.log("Draft js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

function initDraftsPage() {
  const draftsLink = document.getElementById("draftsLink");

  // 🔹 Reusable fetch helper
  async function fetchData(url, options = {}) {
    try {
      const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" }, ...options });
      if (!res.ok) throw new Error(res.statusText);
      return res;
    } catch (err) {
      console.error("Fetch Error:", err);
      showAlert("Something went wrong. Please try again.", "error");
      throw err;
    }
  }

  // 🔹 Handle "Drafts" link (SPA)
  draftsLink?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (draftsLink.dataset.hasDrafts !== "true") return showAlert("You have no drafts yet!", "warning", true);

    const url = draftsLink.href + "?format=html";
    const html = await (await fetchData(url)).text();
    replaceMainContent(html, draftsLink.href);
  });

  // 🔹 Handle delete draft (event delegation)
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-article-btn");
    if (!btn) return;

    e.preventDefault();
    const csrfToken = getCookie("csrftoken");
    if (!csrfToken) return showAlert("CSRF token missing. Please refresh.", "error");

    const res = await fetchData(btn.dataset.url, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
    });
    const data = await res.json();

    if (data.success) {
      showAlert(data.message || "Article deleted!", "success", true);
      const html = await (await fetchData("/article/?format=html")).text();
      replaceMainContent(html, "/article/");
    } else {
      showAlert(data.message || "Delete failed", "error");
    }
  });
}
