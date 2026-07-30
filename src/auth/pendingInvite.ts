export const PENDING_INVITE_KEY = "nestmatch:v2:pending-invite";
export const savePendingInvite = (token: string) => sessionStorage.setItem(PENDING_INVITE_KEY, token);
export const getPendingInvite = () => sessionStorage.getItem(PENDING_INVITE_KEY);
export const takePendingInvite = () => { const token = getPendingInvite(); if (token) sessionStorage.removeItem(PENDING_INVITE_KEY); return token; };
export const clearPendingInvite = () => sessionStorage.removeItem(PENDING_INVITE_KEY);
