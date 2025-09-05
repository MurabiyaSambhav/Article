console.log("Add js----------->", window.location.pathname, "at", new Date().toLocaleTimeString());


document.addEventListener('DOMContentLoaded', function () {
  const addArticleForm = document.getElementById('addArticleForm');

  // Attach event listeners to all buttons within the form
  addArticleForm.querySelectorAll('button[type="submit"]').forEach(button => {
    button.addEventListener('click', async function (event) {
      // Prevent the default form submission that would cause the JSON error
      event.preventDefault();

      const action = this.dataset.action;
      const form = this.closest('form');
      const csrfToken = getCookie('csrftoken');

      // Collect the data from the form inputs
      const title = form.querySelector('input[name="title"]').value;
      const content = form.querySelector('textarea[name="content"]').value;
      const tags = form.querySelector('input[name="tags"]').value;

      // Handle the delete action, which is a bit different
      if (action === 'delete') {
        if (!confirm('Are you sure you want to delete this article?')) {
          return;
        }
      }

      // Create a JSON payload with the action and form data
      const payload = {
        action: action,
        title: title,
        content: content,
        tags: tags,
      };

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.success) {
          // Use a simple alert for success messages
          alert(data.message);
          if (data.redirect) {
            window.location.href = data.redirect;
          }
        } else {
          alert('Error: ' + data.message);
        }
      } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        alert('An error occurred. Please try again.');
      }
    });
  });

  // Handle cancel buttons
  document.querySelectorAll('.cancel-btn').forEach(button => {
    button.addEventListener('click', function () {
      const redirectUrl = this.dataset.redirect;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    });
  });
});