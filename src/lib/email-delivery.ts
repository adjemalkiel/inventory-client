import type { EmailDeliveryKind } from '@/types/api';

/**
 * Turn an `email_delivery` value (returned by the API) into a French string
 * that can be appended to a success/error alert.
 *
 * Background: after an invite / resend / password-reset, the backend returns
 * `email_delivery` next to the boolean `*_email_sent` flag. When that flag is
 * true but the delivery kind is anything other than `"org-smtp"`, the email
 * was not really sent — it was printed to Django's console, stored in memory,
 * etc. Without a warning, admins think the link reached the user.
 */
export function describeEmailDelivery(
  delivery: EmailDeliveryKind | string | undefined,
): { ok: boolean; label: string } {
  switch (delivery) {
    case 'org-smtp':
      return { ok: true, label: 'E-mail livré via votre SMTP.' };
    case 'console':
      return {
        ok: false,
        label:
          'ATTENTION : l’e-mail n’a PAS été envoyé — aucun SMTP n’est configuré ' +
          'et le serveur refuse désormais d’imprimer les messages dans sa console. ' +
          'Activez et enregistrez un SMTP dans Paramètres → Intégrations → SMTP.',
      };
    case 'django-smtp':
      return {
        ok: true,
        label:
          'E-mail livré via le SMTP déclaré dans les variables d’environnement ' +
          'Django (EMAIL_HOST), pas via l’intégration SMTP applicative.',
      };
    case 'locmem':
    case 'filebased':
    case 'dummy':
      return {
        ok: false,
        label:
          'ATTENTION : l’e-mail n’a pas été réellement envoyé (backend de test ' +
          `« ${delivery} »). Configurez un SMTP dans Paramètres → Intégrations → SMTP.`,
      };
    case 'no-recipient':
      return {
        ok: false,
        label: 'Le destinataire n’a pas d’adresse e-mail renseignée.',
      };
    case 'error':
      return {
        ok: false,
        label:
          'L’envoi a échoué côté serveur. Consultez les logs Django ou testez ' +
          'la configuration SMTP depuis Paramètres.',
      };
    case 'other':
    case undefined:
    case '':
      return { ok: true, label: '' };
    default:
      return { ok: true, label: '' };
  }
}
