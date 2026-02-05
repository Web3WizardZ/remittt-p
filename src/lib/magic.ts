// src/lib/magic.ts
import { Magic } from "magic-sdk";

let magic: Magic | null = null;

export function getMagic() {
  if (typeof window === "undefined") return null;
  if (!magic) {
    const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
    if (!key) throw new Error("Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
    magic = new Magic(key);
  }
  return magic;
}
