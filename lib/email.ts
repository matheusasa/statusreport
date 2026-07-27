import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
// Port 465 uses implicit TLS ("secure"); 587/25 use STARTTLS instead, so
// SMTP_SECURE should stay "false" for the common Gmail/Outlook/SES/587 setup.
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM = process.env.EMAIL_FROM || "Project Status Report <no-reply@example.com>";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return cachedTransporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    // SMTP not configured yet — don't crash the request, just log so the
    // rest of the flow (invite/reset/publish) still completes locally.
    console.warn(`[email] SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — email não enviado. to=${to} subject="${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Falha ao enviar email via SMTP:", err);
  }
}

// Palette mirrors tailwind.config.ts (the app's own dark "Stitch" theme) so
// the email doesn't read as a generic template bolted onto a different
// product. Colors are hardcoded (not class names) since email clients don't
// run Tailwind — see each value's Tailwind token in the comment.
const C = {
  background: "#0b0714", // background
  surfaceContainerLow: "#1d1a21", // surface-container-low (card)
  surfaceContainer: "#211e25", // surface-container (blockquote)
  outlineVariant: "#4a4451", // outline-variant (borders)
  outline: "#968e9c", // outline (footer text)
  onSurface: "#e7e0e9", // on-surface (headings/body)
  onSurfaceVariant: "#ccc3d3", // on-surface-variant (secondary text)
  primary: "#d6baff", // primary (CTA background, accents)
  onPrimary: "#41127b", // on-primary (CTA text)
};

function layout(opts: { preheader: string; heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl } = opts;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${C.background};font-family:'IBM Plex Sans','Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${C.background};">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.background};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${C.surfaceContainerLow};border-radius:12px;border:1px solid ${C.outlineVariant};">
            <tr>
              <td style="padding:22px 28px;border-bottom:1px solid ${C.outlineVariant};">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;height:32px;background-color:${C.primary};border-radius:8px;text-align:center;vertical-align:middle;">
                      <span style="font-size:15px;font-weight:700;color:${C.onPrimary};line-height:32px;">P</span>
                    </td>
                    <td style="padding-left:10px;font-size:14px;font-weight:600;color:${C.onSurface};">Project Status Report</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:19px;line-height:1.4;color:${C.onSurface};">${heading}</h1>
                <div style="font-size:14px;line-height:1.6;color:${C.onSurfaceVariant};">${bodyHtml}</div>
                ${
                  ctaLabel && ctaUrl
                    ? `<div style="margin-top:24px;">
                        <a href="${ctaUrl}" style="display:inline-block;background-color:${C.primary};color:${C.onPrimary};text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;">${ctaLabel}</a>
                      </div>
                      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${C.outline};word-break:break-all;">Ou copie e cole este link no navegador: <span style="color:${C.onSurfaceVariant};">${ctaUrl}</span></p>`
                    : ""
                }
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${C.outline};">
            Email automático · não é necessário responder
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Used both for admin-issued invites (new user, temp password) and for
 * regular "esqueci minha senha" requests — both flows funnel through Better
 * Auth's password-reset token, so a single neutral template covers both.
 */
export async function sendPasswordResetEmail(to: string, name: string, url: string): Promise<void> {
  const html = layout({
    preheader: "Defina sua senha de acesso",
    heading: `Olá, ${name}`,
    bodyHtml:
      "Clique no botão abaixo para definir (ou redefinir) sua senha de acesso ao Project Status Report. Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este email com segurança.",
    ctaLabel: "Definir senha",
    ctaUrl: url,
  });
  await send(to, "Defina sua senha — Project Status Report", html);
}

export async function sendMeetingPublishedEmail(
  to: string,
  data: {
    projectName: string;
    meetingTitle: string;
    meetingDateLabel: string;
    minutesPreview: string | null;
    meetingUrl: string;
  }
): Promise<void> {
  const html = layout({
    preheader: `Ata publicada — ${data.meetingTitle}`,
    heading: "Ata de reunião publicada",
    bodyHtml: `
      <p style="margin:0 0 8px;color:${C.onSurface};">A ata da reunião abaixo foi publicada no projeto <strong>${data.projectName}</strong>:</p>
      <p style="margin:0 0 4px;font-weight:600;color:${C.onSurface};">${data.meetingTitle}</p>
      <p style="margin:0 0 16px;color:${C.outline};">${data.meetingDateLabel}</p>
      ${
        data.minutesPreview
          ? `<blockquote style="margin:0;padding:12px 16px;background-color:${C.surfaceContainer};border-left:3px solid ${C.primary};border-radius:6px;white-space:pre-wrap;color:${C.onSurfaceVariant};">${data.minutesPreview}</blockquote>`
          : ""
      }
    `,
    ctaLabel: "Ver reunião completa",
    ctaUrl: data.meetingUrl,
  });
  await send(to, `Ata publicada: ${data.meetingTitle}`, html);
}
