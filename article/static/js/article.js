// Log to confirm script is loaded
console.log("Article Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

// Get the user's logged-in status from the Django template.
const isLoggedIn = document.getElementById('navbar').dataset.isLoggedIn === 'true';

// Function to get the CSRF token from the cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Add event listener for comment toggles
document.querySelectorAll('.comment-toggle-btn').forEach(button => {
  button.addEventListener('click', () => {
    const articleId = button.dataset.articleId;
    const commentsSection = document.getElementById(`comments-section-${articleId}`);

    // Toggle visibility of the comments section
    if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
      commentsSection.style.display = 'block';
      // Only fetch and display comments if the section is being shown
      fetchAndDisplayComments(articleId);
    } else {
      commentsSection.style.display = 'none';
    }
  });
});

// Add event listener for post comment buttons
document.querySelectorAll('.post-comment-btn').forEach(button => {
  button.addEventListener('click', async () => {
    if (!isLoggedIn) {
      // Using a custom message box instead of alert()
      showMessage('Please log in to post a comment.');
      return;
    }

    const articleId = button.dataset.articleId;
    const commentInput = document.getElementById(`comment-input-${articleId}`);
    const content = commentInput.value.trim();

    if (content === '') {
      // Using a custom message box instead of alert()
      showMessage('Please enter a comment.');
      return;
    }

    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      showMessage('Error: CSRF token not found.');
      return;
    }

    try {
      const response = await fetch(`/add_comment/${articleId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ content: content })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Clear the input field after successful post
        commentInput.value = '';
        // Update comments count and re-fetch to display the new comment
        const commentsCountSpan = button.closest('li').querySelector('.comments-count');
        commentsCountSpan.textContent = data.new_count;
        fetchAndDisplayComments(articleId);
      } else {
        showMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      showMessage('An error occurred. Please try again.');
    }
  });
});

// Function to fetch and display comments for a given article
async function fetchAndDisplayComments(articleId) {
  const commentsList = document.getElementById(`comments-list-${articleId}`);
  commentsList.innerHTML = '<li>Loading comments...</li>'; // Show a loading message

  try {
    const response = await fetch(`/get_comments/${articleId}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    commentsList.innerHTML = ''; // Clear the loading message
    if (data.comments && data.comments.length > 0) {
      // Sort comments by created_at in JavaScript to avoid database index issues
      data.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      data.comments.forEach(comment => {
        const commentElement = document.createElement('li');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `<strong>${comment.author}</strong> on <span>${comment.created_at}</span> <p>${comment.content}</p>`;
        commentsList.appendChild(commentElement);
      });
    } else {
      commentsList.innerHTML = '<li>No comments yet. Be the first to comment!</li>';
    }

    // Add a scrollbar if there are more than 5 comments
    const commentsListContainer = commentsList.parentElement;
    if (data.comments.length > 5) {
      commentsListContainer.style.maxHeight = '250px'; // Set a max height
      commentsListContainer.style.overflowY = 'auto'; // Enable vertical scrolling
    } else {
      commentsListContainer.style.maxHeight = 'none';
      commentsListContainer.style.overflowY = 'visible';
    }

  } catch (error) {
    console.error('Error fetching comments:', error);
    commentsList.innerHTML = '<li>Failed to load comments. Please try again later.</li>';
  }
}

// Like/Unlike button functionality
document.querySelectorAll('.like-btn').forEach(button => {
  button.addEventListener('click', async () => {
    if (!isLoggedIn) {
      showMessage('Please login to like an article.');
      return;
    }

    const articleId = button.dataset.articleId;
    const isLiked = button.dataset.isLiked === 'true';
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      showMessage('Error: CSRF token not found.');
      return;
    }

    try {
      const response = await fetch(`/like_article/${articleId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ is_liked: isLiked })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const newCount = data.new_count;
        const likesCountSpan = button.nextElementSibling.querySelector('.likes-count');
        likesCountSpan.textContent = newCount;
        button.dataset.isLiked = data.is_liked;
        button.textContent = data.is_liked ? 'Liked!' : 'Like';
      } else {
        showMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error liking article:', error);
      showMessage('An error occurred. Please try again.');
    }
  });
});

// A simple custom function to display messages to the user
function showMessage(message) {
  console.log(message);
  // In a real application, you would replace this with a custom modal or notification system.
}

const likeBtn = document.querySelector('.like-btn');

likeBtn.addEventListener('click', () => {
  likeBtn.classList.add('bounce');
  setTimeout(() => likeBtn.classList.remove('bounce'), 500);
});