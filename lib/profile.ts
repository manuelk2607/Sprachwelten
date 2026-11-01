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
});
