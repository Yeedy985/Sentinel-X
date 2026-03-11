import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'aags_enc_key';

function getOrCreateEncryptionKey(): string {
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString();
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

export function encrypt(text: string): string {
  const key = getOrCreateEncryptionKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(cipherText: string): string {
  const key = getOrCreateEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hmacSha256(message: string, secret: string): string {
  return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Hex);
}
