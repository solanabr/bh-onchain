import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "BH Onchain <noreply@bhonchain.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendInviteEmail(params: {
  to: string;
  teamName: string;
  inviterName: string;
  token: string;
}) {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email", params);
    return;
  }
  const link = `${APP_URL}/invite/${params.token}`;
  await client.emails.send({
    from: FROM,
    to: params.to,
    subject: `${params.inviterName} te convidou para o time ${params.teamName} no BH Onchain`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width:560px; margin:0 auto; padding:32px; color:#14102a;">
        <h2 style="color:#7c3aed; margin:0 0 16px;">Você foi convidado para o Hackathon BH Onchain</h2>
        <p>${params.inviterName} convidou você para o time <strong>${params.teamName}</strong> no Hackathon BH Onchain (Trilha Solana SuperTeam).</p>
        <p style="margin:24px 0;">
          <a href="${link}" style="background:linear-gradient(90deg,#7c3aed,#c026d3); color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
            Aceitar convite
          </a>
        </p>
        <p style="color:#666; font-size:14px;">Se você não esperava esse convite, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}

export async function sendSubmissionConfirmation(params: {
  to: string;
  teamName: string;
  projectName: string;
}) {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation", params);
    return;
  }
  await client.emails.send({
    from: FROM,
    to: params.to,
    subject: `Submissão recebida: ${params.projectName} — BH Onchain`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width:560px; margin:0 auto; padding:32px; color:#14102a;">
        <h2 style="color:#7c3aed; margin:0 0 16px;">Submissão confirmada</h2>
        <p>O projeto <strong>${params.projectName}</strong> do time <strong>${params.teamName}</strong> foi submetido com sucesso.</p>
        <p>Nos vemos no dia <strong>17 de maio</strong> para as apresentações.</p>
        <p style="color:#666; font-size:14px; margin-top:24px;">Lembre que ao menos um integrante do time precisa estar presente fisicamente — sem representante, o time é desclassificado.</p>
      </div>
    `,
  });
}
