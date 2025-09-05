console.log("Add js----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addArticleForm');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = e.submitter; // The button that triggered submit
      const action = submitBtn?.dataset.action;
      const csrfToken = getCookie('csrftoken');

      if (action === 'delete' && !confirm('Are you sure you want to delete this article?')) {
        return;
      }

      const payload = {
        action,
        title: form.querySelector('[name="title"]').value,
        content: form.querySelector('[name="content"]').value,
        tags: form.querySelector('[name="tags"]').value,
      };

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          alert(data.message);
          if (data.redirect) location.href = data.redirect;
        } else {
          alert('Error: ' + (data.message || 'Something went wrong.'));
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred. Please try again.');
      }
    });
  }

  // Cancel button
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.redirect) location.href = btn.dataset.redirect;
    });
  });
});
