console.log("Article Page js ----------->", window.location.pathname, "at", new Date().toLocaleTimeString());

const isLoggedIn = document.getElementById("navbar")?.dataset.isLoggedIn === "true";
const csrfToken = getCookie("csrftoken");

/* ------------------------- HELPERS ------------------------- */
function toggleSection(section) {
  section.style.display = section.style.display === "block" ? "none" : "block";
}
function renderList(listEl, items, renderItem, emptyMsg) {
  listEl.innerHTML = "";
  if (!items?.length) {
    listEl.innerHTML = `<li>${emptyMsg}</li>`;
    return;
  }
  items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = renderItem(item);
    listEl.appendChild(li);
  });
}

/* ------------------------- COMMENTS ------------------------- */
document.addEventListener("click", async (e) => {
  const btn = e.target;

  // Toggle comments
  if (btn.classList.contains("comment-toggle-btn")) {
    const articleId = btn.dataset.articleId;
    const section = document.getElementById(`comments-section-${articleId}`);
    toggleSection(section);
    if (section.style.display === "block") fetchAndDisplayComments(articleId);
  }

  // Post comment
  if (btn.classList.contains("post-comment-btn")) {
    if (!isLoggedIn) return showMessage("Please log in to post a comment.");

    const articleId = btn.dataset.articleId;
    const input = document.getElementById(`comment-input-${articleId}`);
    const content = input.value.trim();
    if (!content) return showMessage("Please enter a comment.");

    try {
      const res = await fetch(`/add_comment/${articleId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        input.value = "";
        btn.closest("li").querySelector(".comments-count").textContent = data.new_count;
        fetchAndDisplayComments(articleId);
      } else showMessage(`Error: ${data.message}`);
    } catch (err) {
      console.error(err);
      showMessage("Failed to post comment.");
    }
  }
});

async function fetchAndDisplayComments(articleId) {
  const list = document.getElementById(`comments-list-${articleId}`);
  list.innerHTML = "<li>Loading comments...</li>";
  try {
    const res = await fetch(`/get_comments/${articleId}/`);
    const data = await res.json();
    renderList(
      list,
      data.comments?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      c => `<strong>${c.author}</strong> on <span>${c.created_at}</span><p>${c.content}</p>`,
      "No comments yet. Be the first to comment!"
    );
  } catch (err) {
    console.error(err);
    list.innerHTML = "<li>Failed to load comments.</li>";
  }
}

/* ------------------------- LIKES ------------------------- */
document.addEventListener("click", async (e) => {
  const btn = e.target;

  // Like / Unlike
  if (btn.classList.contains("like-btn")) {
    if (!isLoggedIn) return showMessage("Please log in to like an article.");

    const articleId = btn.dataset.articleId;
    const isLiked = btn.dataset.isLiked === "true";
    try {
      const res = await fetch(`/like_article/${articleId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ is_liked: isLiked }),
      });
      const data = await res.json();
      if (data.success) {
        btn.nextElementSibling.querySelector(".likes-count").textContent = data.new_count;
        btn.dataset.isLiked = data.is_liked;
        btn.textContent = data.is_liked ? "Liked!" : "Like";
        fetchAndDisplayLikes(articleId);
      } else showMessage(`Error: ${data.message}`);
    } catch (err) {
      console.error(err);
      showMessage("Failed to like article.");
    }
  }

  // Toggle likes
  if (btn.classList.contains("likes-toggle-btn")) {
    const articleId = btn.dataset.articleId;
    const section = document.getElementById(`likes-section-${articleId}`);
    toggleSection(section);
    if (section.style.display === "block") fetchAndDisplayLikes(articleId);
  }
});

async function fetchAndDisplayLikes(articleId) {
  const list = document.getElementById(`likes-list-${articleId}`);
  list.innerHTML = "<li>Loading likes...</li>";
  try {
    const res = await fetch(`/get_likes/${articleId}/`);
    const data = await res.json();
    renderList(
      list,
      data.likes,
      l => `<strong>${l.full_name}</strong> (${l.username}) on <span>${l.created_at}</span>`,
      "No likes yet."
    );
  } catch (err) {
    console.error(err);
    list.innerHTML = "<li>Failed to load likes.</li>";
  }
}

/* ------------------------- UTIL ------------------------- */
function showMessage(msg) {
  console.log(msg); // Replace with toast/modal if needed
}
