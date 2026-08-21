/** Shared constants safe for both server and client components. */
export const API_URL = process.env.PC_API_URL ?? 'http://localhost:3001';
export const USER_COOKIE = 'pc_user_email';
/** Same-origin prefix for browser-side API calls (proxied to API_URL). */
export const BROWSER_API = '/pc-api';
