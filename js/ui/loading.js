// =============================================================================
// UI / LOADING — Spinners e skeleton screens.
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

function createSpinner(size = 'normal') {
    const sizeClass = size === 'small' ? 'spinner-sm' : '';
    return `<div class="spinner ${sizeClass}"></div>`;
}

function createSkeletonCard(rowCount = 6) {
    let rows = '';
    for (let i = 0; i < rowCount; i++) {
        rows += `
            <div class="skeleton-row">
                <div class="skeleton skeleton-rank"></div>
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-name"></div>
                    <div class="skeleton skeleton-owner"></div>
                </div>
                <div class="skeleton skeleton-record"></div>
                <div class="skeleton skeleton-pts"></div>
            </div>
        `;
    }

    return `
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-badge"></div>
            </div>
            ${rows}
        </div>
    `;
}

function createLoadingState(message = 'Carregando dados do Sleeper...') {
    return `
        <div class="loading">
            ${createSpinner()}
            <span>${escapeHtml(message)}</span>
        </div>
    `;
}

function createSkeletonGrid(count = SKELETON_COUNT) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += createSkeletonCard();
    }
    return skeletons;
}

function showGlobalLoading() {
    const container = document.getElementById(DOM_IDS.GLOBAL);
    container.innerHTML = createLoadingState('Calculando ranking global...');
}

function showPowerLoading() {
    const container = document.getElementById(DOM_IDS.POWER);
    container.innerHTML = createLoadingState('Calculando power rankings...');
}
