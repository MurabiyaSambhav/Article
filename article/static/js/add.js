// add.js
console.log("Add Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

function initAddArticlePage() {
  const articleForm = document.getElementById("addArticleForm");
  if (!articleForm) return;

  articleForm.addEventListener("click", e => {
    // Only handle clicks on buttons within the form
    if (e.target.tagName !== "BUTTON") return;

    // Prevent the default form submission for all buttons initially
    // We will selectively re-enable it.
    e.preventDefault();

    const btn = e.target;
    const action = btn.dataset.action;

    // Handle cancel button click by redirecting
    if (action === "cancel") {
      const redirectUrl = btn.dataset.redirect;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
      return;
    }

    // For "publish," "draft," and "delete" actions,
    // we'll append a hidden input to the form and submit it.
    // This allows the server to handle the action.

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'action';
    hiddenInput.value = action;
    articleForm.appendChild(hiddenInput);

    // Now, submit the form normally. The browser will handle the redirect
    // returned by the Django view.
    articleForm.submit();
  });
}