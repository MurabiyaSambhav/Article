// add.js
function initAddArticlePage() {
  const articleForm = document.getElementById("addArticleForm");
  if (!articleForm) return;

  articleForm.addEventListener("click", e => {
    // Only handle clicks on buttons within the form
    if (e.target.tagName !== "BUTTON") return;

    e.preventDefault();
    const btn = e.target;
    const action = btn.dataset.action || "cancel";
    const redirectUrl = btn.dataset.redirect;

    // Handle cancel button click
    if (action === "cancel") {
      if (redirectUrl) {
        fetch(redirectUrl + "?format=html", { headers: { "X-Requested-With": "XMLHttpRequest" } })
          .then(r => r.text())
          .then(html => replaceMainContent(html, redirectUrl))
          .catch(err => console.error("Cancel Redirect Error:", err));
      }
      return;
    }

    // For publish, draft, and delete actions
    if (!articleForm.checkValidity()) {
      articleForm.reportValidity();
      return;
    }

    const formData = new FormData(articleForm);
    // Correctly append the action to the form data
    formData.append("action", action);

    // Submit via AJAX
    fetch(articleForm.action, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrfToken // Assumes csrfToken is globally available
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAlert(data.message, "success", true);

          // Use the redirect URL directly from the Django response
          if (data.redirect) {
            const newUrl = `/${data.redirect}/`;
            fetch(newUrl + "?format=html", { headers: { "X-Requested-With": "XMLHttpRequest" } })
              .then(r => r.text())
              .then(html => replaceMainContent(html, newUrl))
              .catch(err => console.error("Redirect After Submit Error:", err));
          }
        } else {
          showAlert(data.message || "Error occurred", "error");
        }
      })
      .catch(err => {
        console.error("Article Form Error:", err);
        showAlert("An unexpected error occurred.", "error");
      });
  });
}