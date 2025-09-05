// Log to confirm script is loaded
console.log("Article Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

// Get the user's logged-in status from the Django template.
const isLoggedIn = document.getElementById('navbar').dataset.isLoggedIn === 'true';

/* ------------------------- COMMENTS ------------------------- */
// Add event listener for comment toggles
document.querySelectorAll('.comment-toggle-btn').forEach(button => {
  button.addEventListener('click', () => {
    const articleId = button.dataset.articleId;
    const commentsSection = document.getElementById(`comments-section-${articleId}`);

    // Toggle visibility of the comments section
    if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
      commentsSection.style.display = 'block';
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
      showMessage('Please log in to post a comment.');
      return;
    }

    const articleId = button.dataset.articleId;
    const commentInput = document.getElementById(`comment-input-${articleId}`);
    const content = commentInput.value.trim();

    if (content === '') {
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
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        commentInput.value = '';
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

// Fetch and display comments
async function fetchAndDisplayComments(articleId) {
  const commentsList = document.getElementById(`comments-list-${articleId}`);
  commentsList.innerHTML = '<li>Loading comments...</li>';

  try {
    const response = await fetch(`/get_comments/${articleId}/`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    commentsList.innerHTML = '';
    if (data.comments && data.comments.length > 0) {
      data.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      data.comments.forEach(comment => {
        const commentElement = document.createElement('li');
        commentElement.className = 'comment-item';
        commentElement.innerHTML =
          `<strong>${comment.author}</strong> on <span>${comment.created_at}</span>
           <p>${comment.content}</p>`;
        commentsList.appendChild(commentElement);
      });
    } else {
      commentsList.innerHTML = '<li>No comments yet. Be the first to comment!</li>';
    }

    const commentsListContainer = commentsList.parentElement;
    if (data.comments.length > 5) {
      commentsListContainer.style.maxHeight = '250px';
      commentsListContainer.style.overflowY = 'auto';
    } else {
      commentsListContainer.style.maxHeight = 'none';
      commentsListContainer.style.overflowY = 'visible';
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    commentsList.innerHTML = '<li>Failed to load comments. Please try again later.</li>';
  }
}

/* ------------------------- LIKES ------------------------- */
// Like/Unlike button
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        const likesCountSpan = button.nextElementSibling.querySelector('.likes-count');
        likesCountSpan.textContent = data.new_count;
        button.dataset.isLiked = data.is_liked;
        button.textContent = data.is_liked ? 'Liked!' : 'Like';

        // Refresh likes list if open
        fetchAndDisplayLikes(articleId);
      } else {
        showMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error liking article:', error);
      showMessage('An error occurred. Please try again.');
    }
  });
});

// Add event listener for "view likes" buttons
document.querySelectorAll('.likes-toggle-btn').forEach(button => {
  button.addEventListener('click', () => {
    const articleId = button.dataset.articleId;
    const likesSection = document.getElementById(`likes-section-${articleId}`);

    if (likesSection.style.display === 'none' || likesSection.style.display === '') {
      likesSection.style.display = 'block';
      fetchAndDisplayLikes(articleId);
    } else {
      likesSection.style.display = 'none';
    }
  });
});

// Fetch and display likes
async function fetchAndDisplayLikes(articleId) {
  const likesList = document.getElementById(`likes-list-${articleId}`);
  if (!likesList) return;
  likesList.innerHTML = '<li>Loading likes...</li>';

  try {
    const response = await fetch(`/get_likes/${articleId}/`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    likesList.innerHTML = '';
    if (data.likes && data.likes.length > 0) {
      data.likes.forEach(like => {
        const li = document.createElement('li');
        li.className = 'like-item';
        li.innerHTML = `<strong>${like.full_name}</strong> (${like.username}) on <span>${like.created_at}</span>`;
        likesList.appendChild(li);
      });
    } else {
      likesList.innerHTML = '<li>No likes yet.</li>';
    }

    const likesListContainer = likesList.parentElement;
    if (data.likes.length > 5) {
      likesListContainer.style.maxHeight = '200px';
      likesListContainer.style.overflowY = 'auto';
    } else {
      likesListContainer.style.maxHeight = 'none';
      likesListContainer.style.overflowY = 'visible';
    }
  } catch (error) {
    console.error('Error fetching likes:', error);
    likesList.innerHTML = '<li>Failed to load likes. Please try again later.</li>';
  }
}

/* ------------------------- UTIL ------------------------- */
function showMessage(message) {
  console.log(message);
  // Replace with custom modal/toast in real app
}
