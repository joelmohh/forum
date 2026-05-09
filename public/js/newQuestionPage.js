        // Character counter for title
        const titleInput = document.getElementById('title');
        const titleCount = document.getElementById('titleCount');

        if (titleInput) {
            titleInput.addEventListener('input', function() {
                titleCount.textContent = this.value.length;
            });
        }

        // Tag handling
        const tagsInput = document.getElementById('tags');
        const tagsList = document.getElementById('tagsList');
        let tags = [];
        const maxTags = 5;

        if (tagsInput) {
            tagsInput.addEventListener('keydown', function(e) {
                if ((e.key === 'Enter' || e.key === ' ') && this.value.trim()) {
                    e.preventDefault();
                    
                    if (tags.length < maxTags) {
                        const tag = this.value.trim().toLowerCase();
                        if (tag && !tags.includes(tag)) {
                            tags.push(tag);
                            renderTags();
                            this.value = '';
                        }
                    }
                }
            });
        }

        function renderTags() {
            tagsList.innerHTML = '';
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'badge bg-light text-secondary';
                tagElement.style.cursor = 'pointer';
                tagElement.innerHTML = `
                    ${tag}
                    <i class="bi bi-x-lg ms-1" style="cursor: pointer;"></i>
                `;
                
                tagElement.querySelector('i').addEventListener('click', function() {
                    tags = tags.filter(t => t !== tag);
                    renderTags();
                });
                
                tagsList.appendChild(tagElement);
            });
        }

        // Preview functionality
        const previewBtn = document.querySelector('button[type="button"]');
        if (previewBtn && previewBtn.textContent.includes('Preview')) {
            previewBtn.addEventListener('click', function() {
                const preview = document.getElementById('preview');
                const previewContent = document.getElementById('previewContent');
                const bodyText = document.getElementById('body').value;
                
                if (preview.style.display === 'none') {
                    previewContent.textContent = bodyText;
                    preview.style.display = 'block';
                    this.textContent = 'Hide Preview';
                } else {
                    preview.style.display = 'none';
                    this.textContent = 'Preview';
                }
            });
        }