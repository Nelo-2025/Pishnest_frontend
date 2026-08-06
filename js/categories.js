// Requires common.js loaded first.

(async () => {
  const listEl = document.getElementById('category-list');
  const categories = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/categories.php`);

  if (!Array.isArray(categories) || categories.length === 0) {
    listEl.innerHTML = '<li>No categories found.</li>';
    return;
  }

  listEl.innerHTML = categories.map((cat) =>
    `<li><a href="discover.html?category=${cat.id}">${cat.name}</a></li>`
  ).join('');
})();
