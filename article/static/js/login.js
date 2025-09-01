console.log("Login Page ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());
// login.js
async function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const csrfToken = getCsrfToken();

    // Add CSRF token to formData directly if not already present
    if (csrfToken && !formData.has('csrfmiddlewaretoken')) {
      formData.append('csrfmiddlewaretoken', csrfToken);
    }

    try {
      const response = await fetch(loginForm.action, {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          // Note: CSRF token is now sent in the form data, not as a header, which is standard for form submissions
        }
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data.success) {
        showMessage(data.message || "Login successful!", 'success');
        // Use a short delay before redirecting for a better UX
        setTimeout(() => {
          window.location.href = `/${data.redirect}`;
        }, 1000);
      } else {
        showMessage(data.message || "Login failed", 'error');
      }
    } catch (err) {
      console.error("Login AJAX Error:", err);
      showMessage("An error occurred. Please try again.", 'error');
    }
  };
}

// You would call this function when the page loads
initLoginPage();