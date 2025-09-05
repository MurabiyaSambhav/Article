console.log("Common js----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

//  Get cookie value
function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(c => c.startsWith(name + "="))
    ?.split("=")[1] || null;
}

//  Show alert (auto-dismiss)
function showAlert(message, type = "info") {
  const box = document.createElement("div");
  box.textContent = message;
  box.className = `alert alert-${type}`;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);
}

//  Handle AJAX JSON response
function handleAjaxResponse(res) {
  if (res.success) {
    showAlert(res.message, "success");
    if (res.redirect) location.href = res.redirect;
  } else {
    showAlert(res.message, "error");
  }
}
