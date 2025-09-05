// login.js
console.log("Login Page js ----------->",window.location.pathname,"at",new Date().toLocaleTimeString());


document.addEventListener("DOMContentLoaded", () => {
const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.warn("Login form not found. Skipping event listener attachment.");
    return;
  }

  const csrfToken = getCookie("csrftoken");
  if (!csrfToken) {
    console.error("CSRF token not found!");
    showAlert("Security token missing. Please refresh the page.", "error");
    return;
  }

  const submitBtn = loginForm.querySelector("button[type='submit']");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Convert form data to JSON
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    try {
      // Disable submit button to prevent double clicks
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";
      }

      const response = await fetch(loginForm.action, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrfToken,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Network error (${response.status}): ${errorText || "Unknown"}`
        );
      }

      const result = await response.json();
      handleAjaxResponse(result);

    } catch (err) {
      console.error("Login AJAX Error:", err);
      showAlert("Login failed. Please check your credentials and try again.", "error");

    } finally {
      // Re-enable the button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    }
  });
});
