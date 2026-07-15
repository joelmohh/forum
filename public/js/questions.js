
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


document.addEventListener('DOMContentLoaded', () => {

    const answerbtn = document.getElementById('answerbtn');
    const answeInput = document.getElementById('answeInput');
    const answerLength = document.getElementById('answerLength');
    const previewContent = document.getElementById('previewContent');
    const previewTab = document.getElementById('preview-tab');
    const textToolsButtons = document.querySelectorAll('.text-tool-btn');

    textToolsButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();

            const action = button.getAttribute('data-action');
            const textarea = answeInput;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);

            let newText = '';

            switch (action) {
                case 'bold':
                    newText = `**${selectedText}**`;
                    break;
                case 'italic':
                    newText = `*${selectedText}*`;
                    break;
                case 'code':
                    newText = selectedText.includes('\n')
                        ? `\`\`\`\n${selectedText}\n\`\`\``
                        : `\`${selectedText}\``;
                    break;
                case 'link':
                    newText = `[${selectedText || 'text'}](url)`;
                    break;
                case 'image':
                    newText = `![${selectedText || 'alt'}](url)`;
                    break;
                case 'blockquote':
                    newText = `> ${selectedText}`;
                    break;
                case 'ul':
                    newText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
                    break;
                case 'ol':
                    newText = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
                    break;
                default:
                    return;
            }

            textarea.focus();
            textarea.setRangeText(newText, start, end, 'end');
            textarea.dispatchEvent(new Event('input'));
        });
    });

    // ---------- Preview ----------
    function renderPreview() {
        if (!previewContent || !answeInput) return;

        const raw = answeInput.value.trim();

        if (!raw) {
            previewContent.innerHTML = '<p class="text-muted mb-0">Nothing to preview yet...</p>';
            return;
        }

        if (typeof marked === 'undefined') {
            previewContent.innerHTML = '<p class="text-danger mb-0">Preview unavailable (marked not loaded).</p>';
            return;
        }

        previewContent.innerHTML = marked.parse(raw);

        if (window.Prism) {
            Prism.highlightAllUnder(previewContent);
        }
    }

    if (previewTab) {
        previewTab.addEventListener('shown.bs.tab', renderPreview);
        // fallback caso o evento do bootstrap não dispare
        previewTab.addEventListener('click', () => setTimeout(renderPreview, 0));
    }

    // ---------- Character counter + validation ----------
    if (answeInput) {
        answeInput.addEventListener('input', function () {
            const length = this.value.trim().length;
            answerLength.textContent = `${length}/5000`;

            const invalid = length < 10 || length > 5000;

            this.classList.toggle('is-invalid', invalid);
            answerLength.classList.toggle('text-danger', invalid);

            if (answerbtn) {
                answerbtn.disabled = invalid;
                answerbtn.classList.toggle('disabled', invalid);
            }

            renderPreview();
        });
    }

    // ---------- Post answer ----------
    if (answerbtn) {
        answerbtn.addEventListener('click', async () => {
            const content = answeInput.value.trim();
            const questionId = answerbtn.getAttribute('data-question-id');

            if (content.length < 10 || content.length > 5000) return;

            answerbtn.disabled = true;
            answerbtn.classList.add('disabled');
            const originalText = answerbtn.innerHTML;
            answerbtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Posting...`;

            try {
                const data = await api(`/api/question/${questionId}/answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, questionId })
                });

                if (data.ok) {
                    window.location.href = `/questions/${questionId}?t=success&m=Answer+posted+successfully!`;
                } else {
                    alert(data.message || 'Erro ao enviar resposta.');
                }
            } catch (err) {
                console.error('[ERROR] posting answer:', err);
                alert('Erro ao enviar resposta.');
            } finally {
                answerbtn.innerHTML = originalText;
                answerbtn.disabled = false;
                answerbtn.classList.remove('disabled');
            }
        });
    }

    document.querySelectorAll('.answer-comment-form').forEach(form => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const questionId = form.dataset.questionId;
            const answerId = form.dataset.answerId;
            const textarea = form.querySelector('textarea');
            const submitBtn = form.querySelector('button[type="submit"]');
            const content = textarea.value.trim();

            if (content.length < 2 || content.length > 500) return;

            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Posting...';

            try {
                const data = await api(`/api/question/${questionId}/answer/${answerId}/comment`, {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });

                if (data.ok) {
                    window.location.reload();
                }
            } catch (err) {
                console.error('[ERROR] posting comment:', err);
                alert(err.message || 'Erro ao enviar comentário.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    });

    // ---------- Question votes ----------
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // TODO: plugar na rota /vote/:id com voteType up/down
        });
    });

});