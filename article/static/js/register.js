// register.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("Register Page js----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

  const registerForm = document.getElementById("registerForm");
  if (!registerForm) {
    console.warn("Register form not found. Skipping event listener attachment.");
    return;
  }

  const csrfToken = getCookie('csrftoken');

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      const response = await fetch(registerForm.action, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrfToken
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok (${response.status}): ${errorText}`);
      }
      const result = await response.json();
      handleAjaxResponse(result);
    } catch (err) {
      console.error("Registration AJAX Error:", err);
      showAlert("An error occurred. Please try again.", 'error');
    }
  });
});