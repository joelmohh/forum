class Pagination {
    constructor(options = {}) {
        this.data = options.data || [];
        this.filteredData = [...this.data];

        this.page = 1;
        this.pageSize = options.pageSize || 10;

        this.render = options.render || (() => {});
        this.onUpdate = options.onUpdate || (() => {});
    }

    get totalItems() {
        return this.filteredData.length;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    }

    get currentItems() {
        const start = (this.page - 1) * this.pageSize;
        return this.filteredData.slice(start, start + this.pageSize);
    }

    update() {
        if (this.page > this.totalPages)
            this.page = this.totalPages;

        this.render(this.currentItems);
        this.onUpdate(this);
    }

    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.page = 1;
        this.update();
    }

    search(text) {

        text = text.toLowerCase();

        this.filteredData = this.data.filter(item =>
            Object.values(item)
                .join(" ")
                .toLowerCase()
                .includes(text)
        );

        this.page = 1;
        this.update();
    }

    filter(callback) {
        this.filteredData = this.data.filter(callback);
        this.page = 1;
        this.update();
    }

    clearFilter() {
        this.filteredData = [...this.data];
        this.page = 1;
        this.update();
    }

    sort(column, asc = true) {

        this.filteredData.sort((a, b) => {

            if (a[column] < b[column]) return asc ? -1 : 1;
            if (a[column] > b[column]) return asc ? 1 : -1;
            return 0;

        });

        this.update();
    }

    next() {
        if (this.page < this.totalPages) {
            this.page++;
            this.update();
        }
    }

    prev() {
        if (this.page > 1) {
            this.page--;
            this.update();
        }
    }

    go(page) {
        page = Number(page);

        if (page < 1) page = 1;
        if (page > this.totalPages) page = this.totalPages;

        this.page = page;
        this.update();
    }

    setPageSize(size) {
        this.pageSize = Number(size);
        this.page = 1;
        this.update();
    }
}