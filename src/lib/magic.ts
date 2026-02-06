import { Magic } from "magic-sdk";

let magic: Magic | null = null;

export function getMagic(): Magic | null {
  // Never create Magic on the server
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  if (!key) return null;

  if (!magic) {
    magic = new Magic(key);
  }

  return magic;
}
