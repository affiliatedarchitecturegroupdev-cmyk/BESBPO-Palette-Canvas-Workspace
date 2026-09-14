import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/**
 * argon2id password hashing (A-01 §0.1). @node-rs/argon2 ships a prebuilt
 * native binary; hashes carry their own parameters so verification never
 * needs to know how the hash was produced.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, {
    algorithm: 2, // Argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argonVerify(hash, plain);
}