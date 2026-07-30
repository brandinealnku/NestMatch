export const PENDING_INVITE_KEY = "nestmatch:v2:pending-invite";
const isValidInviteToken = (token: string) => token.length >= 8 && token.length <= 512 && /^[A-Za-z0-9._~-]+$/.test(token);
export const savePendingInvite = (token: string) => { if (isValidInviteToken(token)) sessionStorage.setItem(PENDING_INVITE_KEY, token); else clearPendingInvite(); };
export const getPendingInvite = () => { const token = sessionStorage.getItem(PENDING_INVITE_KEY); if (!token) return null; if (!isValidInviteToken(token)) { clearPendingInvite(); return null; } return token; };
export const takePendingInvite = () => { const token = getPendingInvite(); if (token) sessionStorage.removeItem(PENDING_INVITE_KEY); return token; };
export const clearPendingInvite = () => sessionStorage.removeItem(PENDING_INVITE_KEY);
