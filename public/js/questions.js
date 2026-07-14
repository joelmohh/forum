
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

            if (tags.length >= maxTags) return;

            const tag = this.value.trim().toLowerCase();

            if (!tags.includes(tag)) {
                tags.push(tag);
                this.value = '';

                renderTags();
                validateForm("tags");
            }
        }
    });
}

function removeTag(tag) {
    tags = tags.filter(t => t !== tag);
    renderTags();
    validateForm("tags");
}

function renderTags() {
    tagsList.innerHTML = '';

    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'badge bg-light text-secondary d-inline-flex align-items-center gap-1';

        tagElement.innerHTML = `
            <span>${tag}</span>
            <button
                type="button"
                class="btn-close btn-close-sm"
                aria-label="Remover tag">
            </button>
        `;

        tagElement
            .querySelector('.btn-close')
            .addEventListener('click', () => removeTag(tag));

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

function updatePreview() {
    if (!questionDescription || !previewContent) return;

    previewContent.innerHTML = marked.parse(questionDescription.value, { renderer });

    if (window.Prism) {
        Prism.highlightAllUnder(previewContent);
    }
}

if (questionDescription) {
    questionDescription.addEventListener('input', function () {
        updatePreview();
        validateForm("description");
    });

    updatePreview();
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

if (titleInput) {
    titleInput.parentNode.appendChild(messageElements.title);
}

if (descriptionInput) {
    descriptionInput.parentNode.appendChild(messageElements.description);
}

if (tagsInput) {
    tagsInput.parentNode.appendChild(messageElements.tags);
}

if (isMinimal) {
    isMinimal.parentNode.parentNode.appendChild(messageElements.checkboxes);
}

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

    const isEdit = typeof questionId !== "undefined";
    const validateCheckboxes = field === 'all' && !isEdit;

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
        } else if (description.length > 5000) {
            showError(descriptionInput, messageElements.description, 'Max 5000 characters.');
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
        if (hasAttempted && isMinimal && (!hasAttempted.checked || !isMinimal.checked)) {
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

            const isEdit = typeof questionId !== "undefined";

            const formData = {
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                tags: tags
            };

            if (isEdit) {
                formData.questionId = questionId;
            }


            api(isEdit ? '/api/question/edit' : '/api/question/new', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            }).then(data => {
                if (data.ok) {
                    window.location.href = `/questions/${data.questionId}?t=success&m=Question+${isEdit ? 'updated' : 'created'}+successfully!`;
                } else {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    showToast(data.message || 'An error occurred.', 'error');
                }
            })
                .catch(error => {
                    console.error('Error:', error);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    showToast('An unexpected error occurred.', 'error');
                });
        }
    });
}


// Post Answer 
const answerbtn = document.getElementById('answerbtn');