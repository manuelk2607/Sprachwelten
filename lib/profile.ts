import { z } from "zod";
export const profileInput = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Bitte einen Anzeigenamen eingeben.")
    .max(60, "Der Anzeigename darf höchstens 60 Zeichen enthalten.")
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/u.test(value),
      "Der Anzeigename enthält ungültige Zeichen.",
    ),
  image: z
    .union([
      z.literal(""),
      z.null(),
      z
        .string()
        .trim()
        .max(1000)
        .url()
        .refine((value) => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" && !url.username && !url.password;
          } catch {
            return false;
          }
        }, "Bitte eine HTTPS-Bildadresse ohne Zugangsdaten verwenden."),
    ])
    .transform((value) => value || null)
    .optional(),
});
