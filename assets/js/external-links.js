(() => {
  const EXTERNAL_LINK_SCOPE = [
    ".page__content a[href]",
    ".sidebar a[href]",
    ".author__urls-wrapper a[href]",
    ".page__footer a[href]",
  ].join(", ");

  function isExternalNavigableLink(link) {
    const href = (link.getAttribute("href") || "").trim();
    if (!href || href.startsWith("#") || /^javascript:/i.test(href)) return false;

    try {
      const url = new URL(href, window.location.href);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      return isHttp && url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  function applyExternalLinkTargets(root = document) {
    root.querySelectorAll(EXTERNAL_LINK_SCOPE).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!isExternalNavigableLink(link)) return;

      link.setAttribute("target", "_blank");

      const relTokens = new Set(
        (link.getAttribute("rel") || "")
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean),
      );
      relTokens.add("noopener");
      relTokens.add("noreferrer");
      link.setAttribute("rel", Array.from(relTokens).join(" "));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyExternalLinkTargets(), { once: true });
  } else {
    applyExternalLinkTargets();
  }
})();
