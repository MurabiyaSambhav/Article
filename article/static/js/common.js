// common.js
console.log("Common js----------->", window.location.pathname, "at", new Date().toLocaleTimeString());
// Shared utility functions
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function showAlert(message, type = 'info') {
  const alertBox = document.createElement('div');
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  document.body.appendChild(alertBox);
  setTimeout(() => alertBox.remove(), 3000);
}

function handleAjaxResponse(result) {
  if (result.success) {
    showAlert(result.message, 'success');
    if (result.redirect) {
      // Full page reload for correct script execution
      window.location.href = result.redirect;
    }
  } else {
    showAlert(result.message, 'error');
  }
}