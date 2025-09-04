// register.js

console.log("Register Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) {
    console.warn("Register form not found. Skipping event listener attachment.");
    return;
  }

  const csrfToken = getCookie("csrftoken");
  if (!csrfToken) {
    console.error("CSRF token not found!");
    showAlert("Security token missing. Please refresh the page.", "error");
    return;
  }

  const submitBtn = registerForm.querySelector("button[type='submit']");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Convert form data to JSON
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    try {
      // Disable submit button during request
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Registering...";
      }

      const response = await fetch(registerForm.action, {
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
      console.error("Registration AJAX Error:", err);
      showAlert("Registration failed. Please check your details and try again.", "error");

    } finally {
      // Re-enable button after request
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register";
      }
    }
  });
});
