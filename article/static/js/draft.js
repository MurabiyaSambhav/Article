// drafts.js
console.log("Draft js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

function initDraftsPage() {
  const draftsLink = document.getElementById("draftsLink");

  // Handle "Drafts" navigation (SPA style)
  if (draftsLink) {
    draftsLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const hasDrafts = draftsLink.dataset.hasDrafts === "true";

      if (!hasDrafts) {
        showAlert("You have no drafts yet!", "warning", true);
        return;
      }

      const targetUrl = draftsLink.getAttribute("href");
      try {
        const response = await fetch(targetUrl + "?format=html", {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (!response.ok) throw new Error("Failed to load drafts page");

        const html = await response.text();
        replaceMainContent(html, targetUrl);

      } catch (err) {
        console.error("Drafts SPA Error:", err);
        showAlert("Failed to load drafts. Please try again.", "error");
      }
    });
  }

  // Handle "Delete draft" buttons
  document.querySelectorAll(".delete-article-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const deleteUrl = btn.dataset.url;
      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        showAlert("CSRF token missing. Please refresh the page.", "error");
        return;
      }

      try {
        const res = await fetch(deleteUrl, {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrfToken
          }
        });

        if (!res.ok) throw new Error("Failed to delete draft");

        const data = await res.json();

        if (data.success) {
          showAlert(data.message || "Article deleted!", "success", true);

          // Reload article list after delete
          const articleRes = await fetch("/article/?format=html", {
            headers: { "X-Requested-With": "XMLHttpRequest" }
          });

          const html = await articleRes.text();
          replaceMainContent(html, "/article/");

        } else {
          showAlert(data.message || "Delete failed", "error");
        }

      } catch (err) {
        console.error("Delete Draft Error:", err);
        showAlert("An error occurred while deleting draft.", "error");
      }
    });
  });
}
