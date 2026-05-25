// =============================================================================
// SANITIZE — Defesas anti-XSS e validação de entrada.
// Mesmo o site sendo read-only, a API Sleeper retorna conteúdo controlado por
// usuários (nomes de times). Tudo que vier de fora passa por aqui antes de ir
// ao DOM.
// Depende de: js/config.js (VALIDATION)
// =============================================================================

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str - String a ser sanitizada
 * @returns {string} - String segura para inserção no DOM
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Valida e sanitiza uma URL de avatar
 * @param {string} avatarId - ID do avatar do Sleeper
 * @returns {string} - URL segura ou URL padrão
 */
function sanitizeAvatarUrl(avatarId) {
    const defaultAvatar = 'https://sleepercdn.com/images/v2/icons/player_default.webp';

    if (!avatarId || typeof avatarId !== 'string') {
        return defaultAvatar;
    }

    // Valida formato do avatar ID (apenas caracteres seguros)
    if (!VALIDATION.AVATAR_PATTERN.test(avatarId)) {
        console.warn('Avatar ID inválido detectado:', avatarId);
        return defaultAvatar;
    }

    return `https://sleepercdn.com/avatars/thumbs/${escapeHtml(avatarId)}`;
}

/**
 * Valida e limita um número dentro de um range
 * @param {*} value - Valor a validar
 * @param {number} min - Mínimo permitido
 * @param {number} max - Máximo permitido
 * @param {number} fallback - Valor padrão se inválido
 * @returns {number}
 */
function sanitizeNumber(value, min, max, fallback = 0) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

/**
 * Valida e trunca uma string
 * @param {*} value - Valor a validar
 * @param {number} maxLength - Tamanho máximo
 * @param {string} fallback - Valor padrão se inválido
 * @returns {string}
 */
function sanitizeString(value, maxLength, fallback = '') {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    if (str.length === 0) return fallback;
    return str.substring(0, maxLength);
}

/**
 * Valida o tier da liga
 * @param {string} tier - Tier a validar
 * @returns {string} - Tier válido ou 'serie-a' como fallback
 */
function sanitizeTier(tier) {
    if (VALIDATION.VALID_TIERS.includes(tier)) {
        return tier;
    }
    return 'serie-a';
}

/**
 * Valida a estrutura de um roster da API
 * @param {object} roster - Objeto roster da API
 * @returns {boolean}
 */
function isValidRoster(roster) {
    return roster &&
           typeof roster === 'object' &&
           roster.roster_id !== undefined &&
           roster.settings !== undefined;
}

/**
 * Valida a estrutura de um user da API
 * @param {object} user - Objeto user da API
 * @returns {boolean}
 */
function isValidUser(user) {
    return user &&
           typeof user === 'object' &&
           user.user_id !== undefined;
}
