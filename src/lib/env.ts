import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_PARTNER_ID: z.string().min(1),
  NEXT_PUBLIC_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(1135),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("RemittEase"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().min(1).default("Send money globally with ease"),
});

export const env = schema.parse({
  NEXT_PUBLIC_PARTNER_ID: process.env.NEXT_PUBLIC_PARTNER_ID,
  NEXT_PUBLIC_CLIENT_ID: process.env.NEXT_PUBLIC_CLIENT_ID,
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
});
