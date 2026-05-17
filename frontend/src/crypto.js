// E2E Encryption using Web Crypto API (ECDH + AES-GCM)

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

export async function importPublicKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk", jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true, []
  );
}

export async function importPrivateKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk", jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveKey"]
  );
}

export async function deriveSharedKey(privateKeyJwk, publicKeyJwk) {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const publicKey = await importPublicKey(publicKeyJwk);
  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(message, sharedKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, sharedKey, encoded
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptMessage(encryptedBase64, sharedKey) {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, sharedKey, data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return encryptedBase64;
  }
}

export async function initializeEncryption() {
  const storedPrivate = localStorage.getItem("e2e_private_key");
  const storedPublic = localStorage.getItem("e2e_public_key");
  if (storedPrivate && storedPublic) {
    return {
      privateKeyJwk: JSON.parse(storedPrivate),
      publicKeyJwk: JSON.parse(storedPublic),
    };
  }
  const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();
  localStorage.setItem("e2e_private_key", JSON.stringify(privateKeyJwk));
  localStorage.setItem("e2e_public_key", JSON.stringify(publicKeyJwk));
  return { publicKeyJwk, privateKeyJwk };
}
