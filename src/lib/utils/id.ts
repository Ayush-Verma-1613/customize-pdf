import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const gen = customAlphabet(alphabet, 12);

export const uid = (prefix = 'e') => `${prefix}_${gen()}`;
