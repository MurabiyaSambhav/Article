// add.js
console.log("Add Page js ----------->",window.location.pathname,"at",new Date().toLocaleTimeString());

function initAddArticlePage() {
  const articleForm = document.getElementById("addArticleForm");
  if (!articleForm) return;

  articleForm.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;

    const btn = e.target;
    const action = btn.dataset.action;

    if (!action) return; // ignore buttons without action

    // Cancel button: just redirect
    if (action === "cancel") {
      e.preventDefault();
      const redirectUrl = btn.dataset.redirect;
      if (redirectUrl) {
        console.log("Redirecting to:", redirectUrl);
        window.location.href = redirectUrl;
      }
      return;
    }

    // Publish / Draft / Delete actions
    // Remove any previous hidden action inputs
    const oldHidden = articleForm.querySelector("input[name='action']");
    if (oldHidden) oldHidden.remove();

    // Create new hidden input
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "action";
    hiddenInput.value = action;
    articleForm.appendChild(hiddenInput);

    console.log(`Submitting form with action: ${action}`);
    // Let the browser submit normally
    // Django view will handle redirection
    articleForm.submit();
  });
}
