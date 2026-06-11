// Character counter for title
const titleInput = document.getElementById('title');
const titleCount = document.getElementById('titleCount');

if (titleInput) {
    titleInput.addEventListener('input', function () {
        titleCount.textContent = this.value.length;
        if (this.value.length > 150) {
            titleCount.classList.add('text-danger');
        } else {
            titleCount.classList.remove('text-danger');
        }
    });
}

// Tag handling
const tagsInput = document.getElementById('tags');
const tagsList = document.getElementById('tagsList');
let tags = [];
const maxTags = 5;

if (tagsInput) {
    tagsInput.addEventListener('keydown', function (e) {
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

        tagElement.querySelector('i').addEventListener('click', function () {
            tags = tags.filter(t => t !== tag);
            renderTags();
        });

        tagsList.appendChild(tagElement);
    });
}

// Preview functionality
const previewContent = document.getElementById('previewContent');
const questionDescription = document.getElementById('questionDescription');

function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderMarkdown(input) {
    if (!input) return '';

    const lines = input.split('\n');
    let html = '';

    let inCodeBlock = false;
    let codeBuffer = [];
    let codeLang = '';

    let inList = false;
    let listBuffer = [];

    function closeList() {
        if (!inList) return;

        const isCheckbox = listBuffer.length > 0 && typeof listBuffer[0] === 'object';

        if (isCheckbox) {
            html += `<div class="mb-2">`;
            listBuffer.forEach(item => {
                html += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" ${item.checked ? 'checked' : ''} disabled>
                    <label class="form-check-label">${item.text}</label>
                </div>`;
            });
            html += `</div>`;
        } else {
            html += '<ul class="list-group mb-2">';
            listBuffer.forEach(i => {
                html += `<li class="list-group-item">${i}</li>`;
            });
            html += '</ul>';
        }

        listBuffer = [];
        inList = false;
    }

    for (let line of lines) {

        // CODE BLOCK START/END
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBuffer = [];
                codeLang = line.replace('```', '').trim(); // <-- linguagem aqui
            } else {
                inCodeBlock = false;

                const langClass = codeLang ? `language-${codeLang}` : '';

                html += `
<pre class="bg-dark text-light p-3 rounded">
<code class="${langClass}">${escapeHTML(codeBuffer.join('\n'))}</code>
</pre>`;

                codeLang = '';
            }
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            continue;
        }

        if (/^---+$/.test(line.trim())) {
            closeList();
            html += '<hr>';
            continue;
        }

        if (line.startsWith('>')) {
            closeList();
            html += `<blockquote class="blockquote">${escapeHTML(line.replace(/^>\s?/, ''))}</blockquote>`;
            continue;
        }

        if (/^- \[[ xX]\]/.test(line)) {
            inList = true;

            const checked = /^\- \[[xX]\]/.test(line);
            const text = line.replace(/^- \[[ xX]\]\s?/, '');

            listBuffer.push({
                checked,
                text: escapeHTML(text)
            });

            continue;
        }

        if (/^- /.test(line)) {
            inList = true;
            listBuffer.push(escapeHTML(line.replace(/^- /, '')));
            continue;
        }

        closeList();

        if (/^#{1,4} /.test(line)) {
            const level = line.match(/^#+/)[0].length;
            const content = escapeHTML(line.replace(/^#+ /, ''));
            html += `<h${level}>${content}</h${level}>`;
            continue;
        }

        let processed = escapeHTML(line);

        processed = processed.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener">$1</a>'
        );

        processed = processed.replace(
            /`([^`]+)`/g,
            '<code class="bg-light px-1 rounded">$1</code>'
        );

        processed = processed
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>');

        html += processed + '<br>';
    }

    closeList();

    return html;
}

function applyPrism() {
    if (window.Prism) {
        Prism.highlightAllUnder(previewContent);
    }
}

if (questionDescription) {
    questionDescription.addEventListener('input', function () {
        previewContent.innerHTML = renderMarkdown(this.value);
        applyPrism(); // <-- aqui ativa o Prism
    });
}



// FORM VALIDATION
const form = document.querySelector('form');

const descriptionInput = document.getElementById('questionDescription');

const hasAttempted = document.getElementById('hasAttempted');
const isMinimal = document.getElementById('isMinimal');


const messageElements = {
    title: document.createElement('div'),
    description: document.createElement('div'),
    tags: document.createElement('div'),
    checkboxes: document.createElement('div')
};

titleInput.parentNode.appendChild(messageElements.title);
descriptionInput.parentNode.appendChild(messageElements.description);
tagsInput.parentNode.appendChild(messageElements.tags);
isMinimal.parentNode.parentNode.appendChild(messageElements.checkboxes);

function showError(input, container, msg) {
    input.classList.remove('success');
    input.classList.add('error');
    container.innerHTML = `<span class="validation-message error">${msg}</span>`;
}

function showSuccess(input, container, msg) {
    input.classList.remove('error');
    input.classList.add('success');
    container.innerHTML = `<span class="validation-message success">${msg}</span>`;
}

function clearValidation(input, container) {
    input.classList.remove('error', 'success');
    container.innerHTML = '';
}

function validateForm() {
    let isValid = true;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const tagsCount = tagsList ? tagsList.children.length : 0;

    if (!title) {
        showError(titleInput, messageElements.title, 'Title is required.');
        isValid = false;
    } else if (title.length < 5) {
        showError(titleInput, messageElements.title, 'Title is too short.');
        isValid = false;
    } else if (title.length > 150) {
        showError(titleInput, messageElements.title, 'Max 150 characters.');
        isValid = false;
    } else {
        showSuccess(titleInput, messageElements.title, 'Looks good.');
    }

    if (!description) {
        showError(descriptionInput, messageElements.description, 'Description is required.');
        isValid = false;
    } else if (description.length < 30) {
        showError(descriptionInput, messageElements.description, 'Write at least 30 characters.');
        isValid = false;
    } else {
        showSuccess(descriptionInput, messageElements.description, 'Looks good.');
    }

    if (tagsCount < 1) {
        showError(tagsInput, messageElements.tags, 'Add at least 1 tag.');
        isValid = false;
    } else if (tagsCount > 5) {
        showError(tagsInput, messageElements.tags, 'Max 5 tags allowed.');
        isValid = false;
    } else {
        showSuccess(tagsInput, messageElements.tags, 'Tags OK.');
    }

    if (!hasAttempted.checked || !isMinimal.checked) {
        messageElements.checkboxes.innerHTML =
            `<span class="validation-message error">You must confirm both checkboxes.</span>`;
        isValid = false;
    } else {
        messageElements.checkboxes.innerHTML = '';
    }

    return isValid;
}
if (form) {
    form.addEventListener('submit', (e) => {
        if (!validateForm()) {
            e.preventDefault();

            const firstError = document.querySelector('.form-control.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
        }
    });
}