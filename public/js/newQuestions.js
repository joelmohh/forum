
// Character counter for title
const titleInput = document.getElementById('title');
const titleCount = document.getElementById('titleCount');

if (titleInput) {
    titleInput.addEventListener('input', function () {
        titleCount.textContent = this.value.length;

        validateForm("title");

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

                    validateForm("tags");

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

const renderer = new marked.Renderer();

renderer.blockquote = function (token) {
    const tokens = token?.tokens ?? [];
    return `
        <blockquote class="blockquote">
            ${this.parser.parse(tokens)}
        </blockquote>
    `;
};

if (questionDescription) {
    questionDescription.addEventListener('input', function () {

        previewContent.innerHTML = marked.parse(this.value, { renderer });

        validateForm("description");

        if (window.Prism) {
            Prism.highlightAllUnder(previewContent);
        }
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

function validateForm(field = 'all') {
    let isValid = true;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const tagsCount = tagsList?.children.length ?? 0;

    const validateTitle = field === 'all' || field === 'title';
    const validateDescription = field === 'all' || field === 'description';
    const validateTags = field === 'all' || field === 'tags';
    const validateCheckboxes = field === 'all';

    if (validateTitle) {
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
    }

    if (validateDescription) {
        if (!description) {
            showError(descriptionInput, messageElements.description, 'Description is required.');
            isValid = false;
        } else if (description.length < 30) {
            showError(descriptionInput, messageElements.description, 'Write at least 30 characters.');
            isValid = false;
        } else {
            showSuccess(descriptionInput, messageElements.description, 'Looks good.');
        }
    }

    if (validateTags) {
        if (tagsCount < 1) {
            showError(tagsInput, messageElements.tags, 'Add at least 1 tag.');
            isValid = false;
        } else if (tagsCount > 5) {
            showError(tagsInput, messageElements.tags, 'Max 5 tags allowed.');
            isValid = false;
        } else {
            showSuccess(tagsInput, messageElements.tags, 'Tags OK.');
        }
    }

    if (validateCheckboxes) {
        if (!hasAttempted.checked || !isMinimal.checked) {
            messageElements.checkboxes.innerHTML =
                `<span class="validation-message error">You must confirm both checkboxes.</span>`;
            isValid = false;
        } else {
            messageElements.checkboxes.innerHTML = '';
        }
    }

    return isValid;
}

const submitButton = document.getElementById('questionPublish');

if (submitButton) {
    submitButton.addEventListener('click', (e) => {
        if (!validateForm("all")) {

            const firstError = document.querySelector('.form-control.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }

        } else {

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            const formData = {
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                tags: tags,
                hasAttempted: hasAttempted.checked,
                isMinimal: isMinimal.checked
            }
            api('/api/question/new', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            }).then(data => {
                    if (data.success) {
                        alert('Question submitted successfully!');
                    } else {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit';
                        alert('Error: ' + (data.message || 'An error occurred.'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    alert('An unexpected error occurred.');
                });
        }
    });
}

