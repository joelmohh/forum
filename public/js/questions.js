
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
            <button type="button" class="btn-close btn-close-sm" aria-label="Remover tag"></button>
        `;

        tagElement.querySelector('.btn-close').addEventListener('click', () => removeTag(tag));
        tagsList.appendChild(tagElement);
    });
}

const previewContent = document.getElementById('previewContent');
const questionDescription = document.getElementById('questionDescription');

const renderer = new marked.Renderer();

renderer.blockquote = function (token) {
    const tokens = token?.tokens ?? [];
    return `<blockquote class="blockquote">${this.parser.parse(tokens)}</blockquote>`;
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

if (titleInput) titleInput.parentNode.appendChild(messageElements.title);
if (descriptionInput) descriptionInput.parentNode.appendChild(messageElements.description);
if (tagsInput) tagsInput.parentNode.appendChild(messageElements.tags);
if (isMinimal) isMinimal.parentNode.parentNode.appendChild(messageElements.checkboxes);

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

            if (isEdit) formData.questionId = questionId;

            api(isEdit ? '/api/question/edit' : '/api/question/new', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
            }).then(data => {
                if (data.ok) {
                    window.location.href = `/questions/${data.questionId}?t=success&m=Question+${isEdit ? 'updated' : 'created'}+successfully!`;
                } else {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    showToast(data.message || 'An error occurred.', 'error');
                }
            }).catch(error => {
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
    const previewContentAnswer = document.getElementById('previewContent');
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
                case 'bold': newText = `**${selectedText}**`; break;
                case 'italic': newText = `*${selectedText}*`; break;
                case 'code':
                    newText = selectedText.includes('\n')
                        ? `\`\`\`\n${selectedText}\n\`\`\``
                        : `\`${selectedText}\``;
                    break;
                case 'link': newText = `[${selectedText || 'text'}](url)`; break;
                case 'image': newText = `![${selectedText || 'alt'}](url)`; break;
                case 'blockquote': newText = `> ${selectedText}`; break;
                case 'ul': newText = selectedText.split('\n').map(line => `- ${line}`).join('\n'); break;
                case 'ol': newText = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n'); break;
                default: return;
            }

            textarea.focus();
            textarea.setRangeText(newText, start, end, 'end');
            textarea.dispatchEvent(new Event('input'));
        });
    });

    function renderPreview() {
        if (!previewContentAnswer || !answeInput) return;

        const raw = answeInput.value.trim();

        if (!raw) {
            previewContentAnswer.innerHTML = '<p class="text-muted mb-0">Nothing to preview yet...</p>';
            return;
        }

        if (typeof marked === 'undefined') {
            previewContentAnswer.innerHTML = '<p class="text-danger mb-0">Preview unavailable (marked not loaded).</p>';
            return;
        }

        previewContentAnswer.innerHTML = marked.parse(raw);

        if (window.Prism) {
            Prism.highlightAllUnder(previewContentAnswer);
        }
    }

    if (previewTab) {
        previewTab.addEventListener('shown.bs.tab', renderPreview);
        previewTab.addEventListener('click', () => setTimeout(renderPreview, 0));
    }

    if (answeInput) {
        answeInput.addEventListener('input', function () {
            const length = this.value.trim().length;
            answerLength.textContent = `${length}/2000`;

            const invalid = length < 10 || length > 2000;

            this.classList.toggle('is-invalid', invalid);
            answerLength.classList.toggle('text-danger', invalid);

            if (answerbtn) {
                answerbtn.disabled = invalid;
                answerbtn.classList.toggle('disabled', invalid);
            }

            renderPreview();
        });
    }

    if (answerbtn) {
        answerbtn.addEventListener('click', async () => {
            const content = answeInput.value.trim();
            const questionId = answerbtn.getAttribute('data-question-id');

            if (content.length < 10 || content.length > 2000) return;

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
                    showToast(data.message || 'Failed to post answer, please try again.', 'error');
                }
            } catch (err) {
                console.error('[ERROR] posting answer:', err);
                showToast('Failed to post answer, please try again.', 'error');
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
                } else {
                    showToast(data.message || 'Failed to post comment, please try again.', 'error');
                }
            } catch (err) {
                console.error('[ERROR] posting comment:', err);
                showToast(err.message || 'Failed to post comment, please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    });

    document.querySelectorAll('.save-edit-answer-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const answerId = btn.dataset.answerId;
            const commentId = btn.dataset.commentId;
            const textarea = document.querySelector(
                `#edit-answer-comment-${commentId} .edit-answer-comment-textarea`
            );
            const content = textarea.value.trim();

            if (content.length < 2 || content.length > 500) {
                showToast('Invalid comment.', 'error');
                return;
            }

            btn.disabled = true;

            try {
                const data = await api(`/api/question/answer/${answerId}/comment/${commentId}/edit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to edit comment, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] editing comment:', err);
                showToast('Failed to edit comment, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.delete-answer-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this comment?')) return;

            const answerId = btn.dataset.answerId;
            const commentId = btn.dataset.commentId;

            btn.disabled = true;

            try {
                const data = await api(`/api/question/answer/${answerId}/comment/${commentId}/delete`, {
                    method: 'POST'
                });

                if (data.ok) {
                    document.getElementById(`answer-comment-${commentId}`)?.remove();
                } else {
                    showToast(data.message || 'Failed to delete comment, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] deleting comment:', err);
                showToast('Failed to delete comment, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.save-edit-answer-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const answerId = btn.dataset.answerId;
            const textarea = document.querySelector(`#edit-answer-${answerId} .edit-answer-textarea`);
            const content = textarea.value.trim();

            if (content.length < 10 || content.length > 2000) {
                showToast('The answer must be between 10 and 2000 characters.', 'error');
                return;
            }

            btn.disabled = true;

            try {
                const data = await api(`/api/question/answer/${answerId}/edit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to edit answer, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] editing answer:', err);
                showToast('Failed to edit answer, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.delete-answer-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this answer?')) return;

            const answerId = btn.dataset.answerId;
            btn.disabled = true;

            try {
                const data = await api(`/api/question/answer/${answerId}/delete`, { method: 'POST' });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to delete answer, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] deleting answer:', err);
                showToast('Failed to delete answer, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.accept-answer-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionId = btn.dataset.questionId;
            const answerId = btn.dataset.answerId;

            btn.disabled = true;

            try {
                const data = await api(`/api/question/${questionId}/answer/${answerId}/accept`, {
                    method: 'POST'
                });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to accept answer, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] accepting answer:', err);
                showToast('Failed to accept answer, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.question-comment-form').forEach(form => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const questionId = form.dataset.questionId;
            const textarea = form.querySelector('textarea');
            const submitBtn = form.querySelector('button[type="submit"]');
            const content = textarea.value.trim();

            if (content.length < 2 || content.length > 500) return;

            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Posting...';

            try {
                const data = await api(`/api/question/${questionId}/comment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to post comment, please try again.', 'error');
                }
            } catch (err) {
                console.error('[ERROR] posting question comment:', err);
                showToast(err.message || 'Failed to post comment, please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    });

    document.querySelectorAll('.save-edit-question-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionId = btn.dataset.questionId;
            const commentId = btn.dataset.commentId;
            const textarea = document.querySelector(
                `#edit-question-comment-${commentId} .edit-question-comment-textarea`
            );
            const content = textarea.value.trim();

            if (content.length < 2 || content.length > 500) {
                showToast('Comentário inválido.', 'error');
                return;
            }

            btn.disabled = true;

            try {
                const data = await api(`/api/question/${questionId}/comment/${commentId}/edit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });

                if (data.ok) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to edit comment, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] editing question comment:', err);
                showToast('Failed to edit comment, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.delete-question-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

            const questionId = btn.dataset.questionId;
            const commentId = btn.dataset.commentId;

            btn.disabled = true;

            try {
                const data = await api(`/api/question/${questionId}/comment/${commentId}/delete`, {
                    method: 'POST'
                });

                if (data.ok) {
                    document.getElementById(`question-comment-${commentId}`)?.remove();
                } else {
                    showToast(data.message || 'Failed to delete comment, please try again.', 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('[ERROR] deleting question comment:', err);
                showToast('Failed to delete comment, please try again.', 'error');
                btn.disabled = false;
            }
        });
    });

    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;

            const targetType = btn.dataset.type;
            const targetId = btn.dataset.id;
            const voteType = btn.dataset.vote;

            btn.disabled = true;

            try {
                const data = await api(`/api/question/vote/${targetType}/${targetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voteType })
                });

                if (data.ok) {
                    const scoreClass = targetType === 'question' ? '.question-score' : '.answer-score';
                    const container = btn.closest('.vote-box, .col-auto');
                    const scoreEl = container?.querySelector(scoreClass);

                    if (scoreEl) scoreEl.textContent = data.score;

                    container?.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('active-vote'));

                    if (data.userVote === 1 && voteType === 'upvote') btn.classList.add('active-vote');
                    if (data.userVote === -1 && voteType === 'downvote') btn.classList.add('active-vote');
                } else {
                    showToast(data.message || 'Voting failed, please try again.', 'error');
                }
            } catch (err) {
                console.error('[ERROR] voting:', err);
                showToast('Voting failed, please try again.', 'error');
            } finally {
                btn.disabled = false;
            }
        });
    });

});