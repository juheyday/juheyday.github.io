(() => {
  function removeBrokenThumbnail(image) {
    const card = image.closest("a.link-card");
    image.remove();
    card?.classList.add("link-card--text-only");
  }

  function initializeLinkCardThumbnails(root = document) {
    root.querySelectorAll("a.link-card .link-card__thumb").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;

      image.addEventListener("error", () => removeBrokenThumbnail(image), { once: true });
      if (image.complete && image.naturalWidth === 0) {
        removeBrokenThumbnail(image);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeLinkCardThumbnails(), {
      once: true,
    });
  } else {
    initializeLinkCardThumbnails();
  }
})();
