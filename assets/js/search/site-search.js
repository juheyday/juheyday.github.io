(function () {
  "use strict";

  var resultsLabel = "개 결과 발견";
  var pageSize = 10;

  function normalize(value) {
    return String(value || "").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cleanSummaryText(value) {
    return String(value || "")
      .replace(/&nbsp;?|&amp;nbsp;?|&#160;?|&amp;#160;?|&#xA0;?|&amp;#xA0;?/gi, " ")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function occurrences(text, term) {
    var count = 0;
    var index = text.indexOf(term);
    while (index !== -1) {
      count += 1;
      index = text.indexOf(term, index + term.length);
    }
    return count;
  }

  function searchableDocument(document) {
    return {
      source: document,
      title: normalize(document.title),
      excerpt: normalize(document.excerpt),
      body: normalize(document.searchContent),
      categories: normalize((document.categories || []).join(" ") + " " + document.categoryLabel),
      tags: normalize((document.tags || []).join(" "))
    };
  }

  var documents = (window.searchStore || []).map(searchableDocument);

  function scoreDocument(document, terms, phrase) {
    var allFields = [
      document.title,
      document.categories,
      document.tags,
      document.excerpt,
      document.body
    ].join(" ");
    var score = 0;

    for (var index = 0; index < terms.length; index += 1) {
      var term = terms[index];
      if (allFields.indexOf(term) === -1) return -1;
      score += occurrences(document.title, term) * 80;
      score += occurrences(document.categories, term) * 36;
      score += occurrences(document.tags, term) * 26;
      score += occurrences(document.excerpt, term) * 18;
      score += occurrences(document.body, term) * 5;
    }

    if (phrase) {
      if (document.title.indexOf(phrase) !== -1) score += 150;
      if (document.excerpt.indexOf(phrase) !== -1) score += 45;
      if (document.body.indexOf(phrase) !== -1) score += 15;
    }
    return score;
  }

  function search(query) {
    var phrase = normalize(query);
    if (!phrase) return [];
    var terms = phrase.split(" ").filter(function (term) { return term.length > 0; });

    return documents
      .map(function (document) {
        return { document: document.source, score: scoreDocument(document, terms, phrase) };
      })
      .filter(function (match) { return match.score >= 0; })
      .sort(function (left, right) {
        if (right.score !== left.score) return right.score - left.score;
        return String(right.document.dateIso).localeCompare(String(left.document.dateIso));
      });
  }

  function readtimeMarkup(document) {
    if (!document.minutes) return "";
    return '<span class="post-card-readtime"><i class="far fa-clock" aria-hidden="true"></i>' +
      escapeHtml(document.minutes) + " min</span>";
  }

  function itemMarkup(document) {
    var image = document.teaser
      ? '<a class="category-post-item__image" href="' + escapeHtml(document.url) + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + escapeHtml(document.teaser) + '" alt="" loading="lazy">' + readtimeMarkup(document) + "</a>"
      : '<span class="category-post-item__image category-post-item__image--placeholder" aria-hidden="true">' +
          readtimeMarkup(document) + "</span>";
    var excerpt = cleanSummaryText(document.excerpt);
    var body = cleanSummaryText(document.bodyPreview);
    var summary = excerpt ? '<span class="category-post-item__excerpt">' + escapeHtml(excerpt) + '</span>' : "";
    if (excerpt && body) summary += '<span class="category-post-item__separator" aria-hidden="true"></span>';
    if (body) summary += '<span class="category-post-item__body-preview">' + escapeHtml(body) + '</span>';

    return '<article class="category-post-item" data-search-post-item itemscope itemtype="https://schema.org/CreativeWork">' +
      image +
      '<div class="category-post-item__body">' +
        '<h2 class="category-post-item__title" itemprop="headline">' +
          '<a href="' + escapeHtml(document.url) + '" rel="permalink">' + escapeHtml(document.title) + "</a>" +
        "</h2>" +
        '<p class="category-post-item__meta"><time datetime="' + escapeHtml(document.dateIso) + '">' +
          escapeHtml(document.publishedDate) + '</time><span aria-hidden="true">/</span><span>' +
          escapeHtml(document.categoryLabel) + "</span></p>" +
        '<p class="category-post-item__summary p-summary" itemprop="description">' + summary + "</p>" +
      "</div></article>";
  }

  function paginationMarkup() {
    return '<nav class="category-post-pagination" data-search-pagination aria-label="검색 결과 페이지">' +
      '<button class="category-post-pagination__direction" type="button" data-search-previous>이전</button>' +
      '<span class="category-post-pagination__pages" data-search-pages></span>' +
      '<button class="category-post-pagination__direction" type="button" data-search-next>다음</button>' +
      "</nav>";
  }

  function activatePagination(root, totalItems) {
    var pagination = root.querySelector("[data-search-pagination]");
    if (!pagination) return;
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-search-post-item]"));
    var pages = Math.ceil(totalItems / pageSize);
    var current = 1;
    var previous = pagination.querySelector("[data-search-previous]");
    var next = pagination.querySelector("[data-search-next]");
    var numbers = pagination.querySelector("[data-search-pages]");

    function render(page) {
      current = Math.max(1, Math.min(pages, page));
      items.forEach(function (item, index) {
        item.hidden = Math.floor(index / pageSize) + 1 !== current;
      });
      previous.disabled = current === 1;
      next.disabled = current === pages;
      Array.prototype.forEach.call(numbers.children, function (button, index) {
        var selected = index + 1 === current;
        button.classList.toggle("is-current", selected);
        button.setAttribute("aria-current", selected ? "page" : "false");
      });
    }

    for (var page = 1; page <= pages; page += 1) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "category-post-pagination__page";
      button.textContent = String(page);
      button.setAttribute("aria-label", page + "페이지");
      button.addEventListener("click", (function (targetPage) {
        return function () { render(targetPage); };
      }(page)));
      numbers.appendChild(button);
    }
    previous.addEventListener("click", function () { render(current - 1); });
    next.addEventListener("click", function () { render(current + 1); });
    render(1);
  }

  function resultContainerFor(input) {
    var scope = input.closest(".search-content__inner-wrap") || input.closest(".archive") || document;
    return scope.querySelector(".results");
  }

  function renderResults(root, matches) {
    var label = '<p class="results__found">' + matches.length + " " + escapeHtml(resultsLabel) + "</p>";
    if (matches.length === 0) {
      root.innerHTML = label;
      return;
    }
    var items = matches.map(function (match) { return itemMarkup(match.document); }).join("");
    var pagination = matches.length > pageSize ? paginationMarkup() : "";
    root.innerHTML = label + '<div class="category-post-list search-post-list">' + items + "</div>" + pagination;
    activatePagination(root, matches.length);
  }

  function bind(input) {
    var results = resultContainerFor(input);
    if (!results) return;
    input.addEventListener("input", function () {
      var query = input.value;
      if (!normalize(query)) {
        results.innerHTML = "";
        return;
      }
      renderResults(results, search(query));
    });
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("input.search-input"), bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
