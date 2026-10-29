import { z } from "zod";
export const passwordChangeInput = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, "Bitte das aktuelle Passwort eingeben.")
      .max(1024),
    newPassword: z
      .string()
      .min(8, "Das neue Passwort muss mindestens 8 Zeichen enthalten.")
      .max(128, "Das neue Passwort darf höchstens 128 Zeichen enthalten."),
    revokeOtherSessions: z.literal(true).default(true),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "Bitte ein anderes neues Passwort wählen.",
    path: ["newPassword"],
  });
export const passwordFormInput = passwordChangeInput
  .safeExtend({ confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Die neuen Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });
export const emailChangeInput = z.strictObject({
  newEmail: z
    .string()
    .trim()
    .max(254)
    .email("Bitte eine gültige neue E-Mail-Adresse eingeben."),
});
export const emailConfirmInput = emailChangeInput.safeExtend({
  otp: z
    .string()
    .regex(/^\d{6}$/, "Bitte den sechsstelligen Bestätigungscode eingeben."),
});
export function accountSettingsError(error: unknown) {
  const value =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const text = [
    typeof value.code === "string" ? value.code : "",
    typeof value.message === "string" ? value.message : "",
  ].join(" ");
  if (
    /SESSION_NOT_FRESH|FRESH_SESSION_REQUIRED|SESSION_EXPIRED|UNAUTHORIZED/i.test(
      text,
    )
  )
    return "Bitte melde dich erneut an, bevor du deine Kontodaten änderst.";
  if (/disabled|not enabled/i.test(text))
    return "Die E-Mail-Änderung ist beim Anmeldedienst noch nicht freigeschaltet.";
  if (
    /INVALID[_ ]PASSWORD|INCORRECT[_ ]PASSWORD|INVALID[_ ]CURRENT[_ ]PASSWORD/i.test(
      text,
    )
  )
    return "Das aktuelle Passwort ist nicht korrekt.";
  if (
    /OTP[_ ]EXPIRED|INVALID[_ ]OTP|INVALID[_ ]VERIFICATION[_ ]CODE|TOO[_ ]MANY[_ ]ATTEMPTS/i.test(
      text,
    )
  )
    return "Der Code ist ungültig oder abgelaufen. Bitte fordere einen neuen Code an.";
  if (/EMAIL_ALREADY|USER_ALREADY_EXISTS/i.test(text))
    return "Diese E-Mail-Adresse wird bereits verwendet.";
  return "Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.";
}
