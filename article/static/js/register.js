// register.js
console.log("Register Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return console.warn("Register form not found.");

  const csrfToken = getCookie("csrftoken");
  if (!csrfToken) return showAlert("Security token missing. Please refresh.", "error");

  const submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Registering...";

      const res = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Registration failed");

      handleAjaxResponse(result);

    } catch (err) {
      console.error("Registration AJAX Error:", err);
      showAlert("Registration failed. Please check your details.", "error");

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Register";
    }
  });
});
