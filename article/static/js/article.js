// Log to confirm script is loaded
console.log("Article Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

// Get the user's logged-in status from the Django template.
// This is a simple way to check if the user is authenticated in the JavaScript.
const isLoggedIn = document.getElementById('navbar').dataset.isLoggedIn === 'true';

// Add event listener for comment toggles
document.querySelectorAll('.comment-toggle-btn').forEach(button => {
  button.addEventListener('click', () => {
    const articleId = button.dataset.articleId;
    const commentsSection = document.getElementById(`comments-section-${articleId}`);
    const commentsList = commentsSection.querySelector('.comments-list');

    // Toggle visibility of the comments section
    if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
      commentsSection.style.display = 'block';
      // Only fetch comments if the list is empty to avoid duplicate requests
      if (commentsList.children.length === 0) {
        fetchAndDisplayComments(articleId);
      }
    } else {
      commentsSection.style.display = 'none';
    }
  });
});

// Function to fetch and display comments for a given article
async function fetchAndDisplayComments(articleId) {
  const commentsSection = document.getElementById(`comments-section-${articleId}`);
  const commentsList = commentsSection.querySelector('.comments-list');

  // Clear existing comments before fetching new ones
  commentsList.innerHTML = '<li>Loading comments...</li>';

  try {
    const response = await fetch(`/get_comments/${articleId}/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    commentsList.innerHTML = ''; // Clear the loading message
    if (data.comments && data.comments.length > 0) {
      data.comments.forEach(comment => {
        const commentElement = document.createElement('li');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `
                    <strong>${comment.author}</strong> on <span>${comment.created_at}</span>
                    <p>${comment.content}</p>
                `;
        commentsList.appendChild(commentElement);
      });
    } else {
      commentsList.innerHTML = '<li>No comments yet. Be the first to comment!</li>';
    }

  } catch (error) {
    console.error('Error fetching comments:', error);
    commentsList.innerHTML = '<li>Failed to load comments. Please try again later.</li>';
  }
}

// Event listeners for "add comment" and "post comment" buttons
document.querySelectorAll('.article-item').forEach(articleItem => {
  const addCommentBtn = articleItem.querySelector('.add-comment-btn');
  const postCommentBtn = articleItem.querySelector('.post-comment-btn');
  const commentFormArea = articleItem.querySelector('.comment-form-area');
  const articleId = articleItem.querySelector('.like-btn').dataset.articleId;

  if (addCommentBtn && commentFormArea) {
    addCommentBtn.addEventListener('click', () => {
      if (isLoggedIn) {
        commentFormArea.style.display = 'block';
        addCommentBtn.style.display = 'none';
      } else {
        alert('Please login to add a comment.');
      }
    });
  }

  if (postCommentBtn) {
    postCommentBtn.addEventListener('click', async () => {
      const commentInput = commentFormArea.querySelector('.comment-input');
      const content = commentInput.value.trim();
      const csrfToken = getCookie('csrftoken');

      if (content.length > 0) {
        try {
          const response = await fetch(`/add_comment/${articleId}/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ content: content })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            const newComment = data.comment_data;
            const commentsList = articleItem.querySelector('.comments-list');
            const commentsCountSpan = articleItem.querySelector('.comments-count');

            // Check if the "No comments yet" message exists and remove it
            const noCommentsMsg = commentsList.querySelector('li');
            if (noCommentsMsg && noCommentsMsg.textContent.includes('No comments yet')) {
              commentsList.innerHTML = '';
            }

            const commentElement = document.createElement('li');
            commentElement.className = 'comment-item';
            commentElement.innerHTML = `
                            <strong>${newComment.author}</strong> on <span>${newComment.created_at}</span>
                            <p>${newComment.content}</p>
                        `;
            commentsList.appendChild(commentElement);

            commentsCountSpan.textContent = data.new_count;
            commentInput.value = ''; // Clear input
            commentFormArea.style.display = 'none'; // Hide form
            addCommentBtn.style.display = 'block'; // Show "Add Comment" button
          } else {
            alert(`Error: ${data.message}`);
          }
        } catch (error) {
          console.error('Error posting comment:', error);
          alert('An error occurred while posting your comment. Please try again.');
        }
      } else {
        alert('Comment cannot be empty.');
      }
    });
  }
});

// Like/Unlike button functionality
document.querySelectorAll('.like-btn').forEach(button => {
  button.addEventListener('click', async () => {
    if (!isLoggedIn) {
      alert('Please login to like an article.');
      return;
    }

    const articleId = button.dataset.articleId;
    const isLiked = button.dataset.isLiked === 'true';
    const csrfToken = getCookie('csrftoken');

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
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error liking article:', error);
      alert('An error occurred. Please try again.');
    }
  });
});
