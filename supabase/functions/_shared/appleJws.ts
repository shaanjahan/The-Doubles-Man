// Deno-native verification of Apple StoreKit 2 signed transactions (JWS).
//
// Replaces npm:app-store-server-api's decodeTransaction, whose certificate-
// chain validation depends on Node crypto APIs that misbehave under the
// Supabase Edge runtime — it rejected GENUINE sandbox receipts with
// "Invalid transaction signature" (first observed on the first real purchase
// after the Base44 -> Supabase migration; Base44's verifier had done this step
// before).
//
// Verification steps (the same textbook checks Apple's own server library does):
//   1. The JWS header carries the signing chain (x5c: leaf, intermediate, root).
//      The root MUST be byte-identical to the pinned Apple Root CA - G3
//      (fetched from https://www.apple.com/certificateauthority/, SHA-256
//      63:34:3A:BF:...:3E:91:79).
//   2. Chain signatures verify: leaf signed by intermediate, intermediate
//      signed by root (checked with @peculiar/x509 — pure JS over WebCrypto,
//      Deno-safe), both valid at the current date.
//   3. Apple's marker OIDs are present: leaf carries the receipt-signing OID,
//      the intermediate carries the Apple intermediate OID. This stops any
//      OTHER validly-chained Apple certificate (e.g. a developer cert) from
//      signing fake transactions.
//   4. The JWS signature itself verifies (ES256) against the leaf public key.
// Only then is the payload trusted.

import * as x509 from 'npm:@peculiar/x509@1.12.3';
import { compactVerify, importX509 } from 'npm:jose@5.9.6';

// Apple Root CA - G3 (DER, base64). Public certificate — pinning it means a
// forged chain can't just present its own root.
const APPLE_ROOT_CA_G3_B64 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

// Apple marker OIDs (same values Apple's official server library checks).
const OID_RECEIPT_SIGNING = '1.2.840.113635.100.6.11.1'; // on the leaf
const OID_APPLE_INTERMEDIATE = '1.2.840.113635.100.6.2.1'; // on the intermediate

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToBytes(b64url: string): Uint8Array {
  return b64ToBytes(b64url.replace(/-/g, '+').replace(/_/g, '/'));
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verify an App Store signed transaction JWS and return its payload. Throws on
 * any verification failure — callers treat every throw as "reject, never grant". */
export async function decodeTransaction(jws: string): Promise<Record<string, unknown>> {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('malformed JWS');

  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  if (header.alg !== 'ES256') throw new Error(`unexpected alg: ${header.alg}`);
  const x5c: string[] = header.x5c;
  if (!Array.isArray(x5c) || x5c.length < 3) throw new Error('missing x5c chain');

  // 1. Pinned root.
  const rootDer = b64ToBytes(x5c[2]);
  if (!bytesEqual(rootDer, b64ToBytes(APPLE_ROOT_CA_G3_B64))) {
    throw new Error('untrusted root certificate');
  }

  const leaf = new x509.X509Certificate(b64ToBytes(x5c[0]));
  const intermediate = new x509.X509Certificate(b64ToBytes(x5c[1]));
  const root = new x509.X509Certificate(rootDer);

  // 2. Chain signatures + validity windows.
  const now = new Date();
  if (!(await leaf.verify({ publicKey: intermediate, date: now }))) {
    throw new Error('leaf not signed by intermediate');
  }
  if (!(await intermediate.verify({ publicKey: root, date: now }))) {
    throw new Error('intermediate not signed by root');
  }

  // 3. Apple marker OIDs.
  if (!leaf.extensions.some((e) => e.type === OID_RECEIPT_SIGNING)) {
    throw new Error('leaf missing receipt-signing OID');
  }
  if (!intermediate.extensions.some((e) => e.type === OID_APPLE_INTERMEDIATE)) {
    throw new Error('intermediate missing Apple CA OID');
  }

  // 4. JWS signature against the leaf public key.
  const leafKey = await importX509(leaf.toString('pem'), 'ES256');
  const { payload } = await compactVerify(jws, leafKey);
  return JSON.parse(new TextDecoder().decode(payload));
}
