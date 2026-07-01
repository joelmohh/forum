function Pagination(options) {
	if (!(this instanceof Pagination)) {
		return new Pagination(options);
	}

	this.options = options || {};
	this.container = this._resolveElement(this.options.container || this.options.list);
	this.paginationContainer = this._resolveElement(this.options.pagination);
	this.searchInput = this._resolveElement(this.options.search);
	this.pageSizeSelect = this._resolveElement(this.options.pageSize);
	this.sortSelect = this._resolveElement(this.options.sortSelect);
	this.infoElement = this._resolveElement(this.options.info);
	this.emptyMessage = this.options.emptyMessage || 'Nenhum resultado encontrado.';
	this.defaultSort = this.options.defaultSort || '';
	this.sorters = this.options.sorters || {};
	this.itemSelector = this.options.itemSelector || '[data-pagination-item]';
	this.items = this.container ? Array.from(this.container.querySelectorAll(this.itemSelector)) : [];
	this.filterButtons = Array.from(document.querySelectorAll(this.options.filters || '[data-pagination-sort]'));
	this.pageSize = this._toNumber(this.options.pageSizeValue || this.pageSizeSelect?.value || this.options.limit || 10, 10);
	this.currentPage = this._toNumber(this.options.page || 1, 1);
	this.currentSort = this._resolveInitialSort();
	this.totalItems = this.items.length;
	this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

	this._bind();
	this.update();
}

Pagination.prototype._resolveElement = function (target) {
	if (!target) {
		return null;
	}

	if (typeof target === 'string') {
		return document.querySelector(target);
	}

	return target;
};

Pagination.prototype._toNumber = function (value, fallback) {
	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : fallback;
};

Pagination.prototype._normalizeText = function (value) {
	return String(value || '').toLowerCase().trim();
};

Pagination.prototype._resolveInitialSort = function () {
	if (this.sortSelect && this.sortSelect.value) {
		return this.sortSelect.value;
	}

	const activeButton = this.filterButtons.find((button) => button.classList.contains('active') && button.dataset.paginationSort);

	if (activeButton) {
		return activeButton.dataset.paginationSort;
	}

	return this.defaultSort;
};

Pagination.prototype._bind = function () {
	if (this.searchInput) {
		this.searchInput.addEventListener('input', () => {
			this.currentPage = 1;
			this.update();
		});
	}

	if (this.pageSizeSelect) {
		this.pageSizeSelect.addEventListener('change', () => {
			this.pageSize = this._toNumber(this.pageSizeSelect.value, this.pageSize);
			this.currentPage = 1;
			this.update();
		});
	}

	if (this.sortSelect) {
		this.sortSelect.addEventListener('change', () => {
			this.currentSort = this.sortSelect.value;
			this.currentPage = 1;
			this.update();
		});
	}

	this.filterButtons.forEach((button) => {
		button.addEventListener('click', (event) => {
			const sortKey = button.dataset.paginationSort;

			if (!sortKey || !this.sorters[sortKey]) {
				return;
			}

			event.preventDefault();
			this.currentSort = sortKey;

			if (this.sortSelect) {
				this.sortSelect.value = sortKey;
			}

			this.currentPage = 1;
			this.update();
		});
	});

	if (this.paginationContainer) {
		this.paginationContainer.addEventListener('click', (event) => {
			const target = event.target.closest('[data-page]');

			if (!target || target.classList.contains('disabled')) {
				return;
			}

			event.preventDefault();

			const nextPage = this._toNumber(target.dataset.page, this.currentPage);

			if (nextPage !== this.currentPage) {
				this.currentPage = nextPage;
				this.update();
			}
		});
	}
};

Pagination.prototype._matchesSearch = function (item, term) {
	if (!term) {
		return true;
	}

	const searchableText = this._normalizeText(item.dataset.search || item.textContent);
	return searchableText.includes(term);
};

Pagination.prototype._applySort = function (items) {
	const sorter = this.sorters[this.currentSort];

	if (!sorter) {
		return items;
	}

	if (typeof sorter === 'function') {
		return items.slice().sort((a, b) => sorter(a, b, this));
	}

	let filteredItems = items.slice();

	if (typeof sorter.filter === 'function') {
		filteredItems = filteredItems.filter((item) => sorter.filter(item, this));
	}

	if (typeof sorter.sort === 'function') {
		filteredItems.sort((a, b) => sorter.sort(a, b, this));
	}

	return filteredItems;
};

Pagination.prototype._buildPageTokens = function () {
	const tokens = [];

	if (this.totalPages <= 7) {
		for (let page = 1; page <= this.totalPages; page += 1) {
			tokens.push(page);
		}

		return tokens;
	}

	const pages = new Set([1, this.totalPages, this.currentPage - 1, this.currentPage, this.currentPage + 1]);
	const orderedPages = Array.from(pages)
		.filter((page) => page >= 1 && page <= this.totalPages)
		.sort((a, b) => a - b);

	let previousPage = 0;

	orderedPages.forEach((page) => {
		if (page - previousPage > 1) {
			tokens.push('ellipsis');
		}

		tokens.push(page);
		previousPage = page;
	});

	return tokens;
};

Pagination.prototype._renderPagination = function () {
	if (!this.paginationContainer) {
		return;
	}

	const prevDisabled = this.currentPage <= 1 ? ' disabled' : '';
	const nextDisabled = this.currentPage >= this.totalPages ? ' disabled' : '';
	const tokens = this._buildPageTokens();

	let html = `<li class="page-item${prevDisabled}"><a class="pagi-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">Previous</a></li>`;

	tokens.forEach((token) => {
		if (token === 'ellipsis') {
			html += '<li class="page-item disabled"><span class="pagi-link">...</span></li>';
			return;
		}

		const activeClass = token === this.currentPage ? ' active' : '';
		html += `<li class="page-item${activeClass}"><a class="pagi-link" href="#" data-page="${token}">${token}</a></li>`;
	});

	html += `<li class="page-item${nextDisabled}"><a class="pagi-link" href="#" data-page="${this.currentPage + 1}" aria-label="Next">Next</a></li>`;

	this.paginationContainer.innerHTML = html;
};

Pagination.prototype._syncFilterState = function () {
	this.filterButtons.forEach((button) => {
		const isActive = button.dataset.paginationSort === this.currentSort;
		button.classList.toggle('active', isActive);
	});

	if (this.sortSelect) {
		this.sortSelect.value = this.currentSort;
	}
};

Pagination.prototype.update = function () {
	if (!this.container) {
		return;
	}

	const searchTerm = this._normalizeText(this.searchInput ? this.searchInput.value : '');
	const filteredItems = this._applySort(this.items.filter((item) => this._matchesSearch(item, searchTerm)));

	this.totalItems = filteredItems.length;
	this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

	if (this.currentPage > this.totalPages) {
		this.currentPage = this.totalPages;
	}

	if (this.currentPage < 1) {
		this.currentPage = 1;
	}

	const startIndex = (this.currentPage - 1) * this.pageSize;
	const visibleItems = filteredItems.slice(startIndex, startIndex + this.pageSize);

	this.container.innerHTML = '';

	if (visibleItems.length > 0) {
		const fragment = document.createDocumentFragment();
		visibleItems.forEach((item) => fragment.appendChild(item));
		this.container.appendChild(fragment);
	} else {
		const emptyState = document.createElement('p');
		emptyState.className = 'text-muted py-4 mb-0';
		emptyState.textContent = this.emptyMessage;
		this.container.appendChild(emptyState);
	}

	this._renderPagination();
	this._syncFilterState();

	if (this.infoElement) {
		this.infoElement.textContent = `Página ${this.currentPage} de ${this.totalPages} | ${this.totalItems} resultados`;
	}
};

window.Pagination = Pagination;
