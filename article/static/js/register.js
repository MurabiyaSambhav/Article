// register.js
console.log("Register Page ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());
function initRegisterPage() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;

  registerForm.onsubmit = e => {
    e.preventDefault();

    // --- Validation Logic ---
    let name = document.getElementById("name").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();
    let phone = document.getElementById("phone").value.trim();

    let nameRegex = /^[A-Za-z\s]{3,90}$/;
    let emailRegex = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
    let passwordRegex = /^(?=.*\d).{2,}$/;
    let phoneRegex = /^[0-9]{10}$/;

    if (!nameRegex.test(name)) {
      alert("Name must be 3-30 letters only & Only Characters.");
      return;
    }
    if (!emailRegex.test(email)) {
      alert("Enter a valid email address.");
      return;
    }
    if (!passwordRegex.test(password)) {
      alert("Password must be at least 2 characters and include a number.");
      return;
    }
    if (!phoneRegex.test(phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    const formData = new FormData(registerForm);

    fetch(registerForm.action, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrfToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Display the alert and then redirect
          alert(data.message || "Registration successful!");
          window.location.href = `/${data.redirect}/`;
        } else {
          // Show an error alert
          alert(data.message || "Registration failed");
        }
      })
      .catch(err => console.error("Register AJAX Error:", err));
  };
}