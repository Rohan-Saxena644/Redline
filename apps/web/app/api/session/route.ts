import { handler, login, logout } from '../../../lib/http';
export const runtime='nodejs';
export const POST=handler(login);
export const DELETE=handler(logout);
