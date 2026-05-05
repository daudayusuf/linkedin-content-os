import { task } from "@trigger.dev/sdk/v3";
import nodemailer from "nodemailer";

interface AuditEmailPayload {
  prospectEmail: string;
  prospectName: string;
  firstName: string;
  analysis: {
    overall_score: number;
    grade: string;
    grade_label: string;
    executive_summary: string;
    dimension_scores: Record<string, { score: number; max: number; rationale: string }>;
    key_insights: string[];
    action_items: string[];
    post_count: number;
  };
  pdfAttachmentBase64?: string;
}

export const linkedinAuditEmailTask = task({
  id: "linkedin-audit-email",
  maxDuration: 60,
  run: async (payload: AuditEmailPayload) => {
    const { prospectEmail, prospectName, firstName, analysis } = payload;
    const a = analysis;

    // Build dimension scores HTML
    const dimLabels: Record<string, string> = {
      profile_health: 'Profile Health',
      hook_strength: 'Hook Strength',
      cta_clarity: 'CTA Clarity',
      content_pillar_balance: 'Content Pillar Balance',
      posting_frequency: 'Posting Frequency',
      engagement_quality: 'Engagement Quality',
    };

    const dimRows = Object.entries(a.dimension_scores)
      .map(([key, dim]) => {
        const pct = Math.round((dim.score / dim.max) * 100);
        const color = pct >= 60 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
        return `<tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #202124; border-bottom: 1px solid #f0f0f0;">${dimLabels[key] || key}</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: ${color}; border-bottom: 1px solid #f0f0f0; text-align: center;">${dim.score}/${dim.max}</td>
        </tr>`;
      })
      .join('');

    // Build action items HTML
    const actionItemsHtml = (a.action_items || [])
      .slice(0, 5)
      .map(item => `<li style="margin-bottom: 8px; font-size: 13px; color: #202124; line-height: 1.5;">${item.slice(0, 300)}</li>`)
      .join('');

    const htmlBody = `
    <html>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Calibri, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color: #ffffff; border-radius: 4px; overflow: hidden;">

              <!-- Header bar -->
              <tr>
                <td style="background-color: #1B4FD8; padding: 28px 36px;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                    Your LinkedIn Audit Report
                  </h1>
                </td>
              </tr>

              <!-- Score Badge -->
              <tr>
                <td style="padding: 24px 36px 0 36px; text-align: center;">
                  <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td style="background-color: #f0f4ff; border-radius: 12px; padding: 20px 32px; text-align: center;">
                        <div style="font-size: 42px; font-weight: 800; color: #1B4FD8; line-height: 1;">${a.overall_score}</div>
                        <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">out of 100</div>
                        <div style="font-size: 18px; font-weight: 700; color: ${a.grade === 'A' || a.grade === 'B' ? '#10b981' : a.grade === 'C' ? '#f59e0b' : '#ef4444'}; margin-top: 4px;">
                          Grade ${a.grade} — ${a.grade_label}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 24px 36px 0 36px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 0 0 16px 0;">
                        <p style="margin: 0; font-size: 15px; color: #202124; line-height: 1.6;">
                          Hi ${firstName},
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 16px 0;">
                        <p style="margin: 0 0 14px 0; font-size: 14px; color: #202124; line-height: 1.6;">
                          I've gone through your LinkedIn profile and recent posts across 6 dimensions —
                          profile strength, hook quality, CTA clarity, content balance, posting frequency,
                          and engagement quality.
                        </p>
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #202124; line-height: 1.6;">
                          Inside your report you'll find:
                        </p>
                        <ul style="margin: 0 0 14px 0; padding-left: 20px; font-size: 14px; color: #202124; line-height: 1.8;">
                          <li>A breakdown of every post — what is working, what is not, and why.</li>
                          <li>A hook rewrite example showing how one of your posts could perform significantly better.</li>
                          <li>${a.post_count} ready-to-use post ideas tailored to your niche and goals.</li>
                          <li>Benchmark comparison vs median and top 10% creators in your niche.</li>
                          <li>A data-backed action plan with specific next steps.</li>
                        </ul>
                      </td>
                    </tr>

                    <!-- Dimension Scores Table -->
                    <tr>
                      <td style="padding: 0 0 16px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                          <tr style="background-color: #f9fafb;">
                            <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #374151;">Dimension</td>
                            <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #374151; text-align: center;">Score</td>
                          </tr>
                          ${dimRows}
                        </table>
                      </td>
                    </tr>

                    ${actionItemsHtml ? `
                    <!-- Quick Wins -->
                    <tr>
                      <td style="padding: 0 0 16px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #202124;">Where to focus first:</p>
                        <ol style="margin: 0; padding-left: 20px; color: #202124; line-height: 1.6;">
                          ${actionItemsHtml}
                        </ol>
                      </td>
                    </tr>
                    ` : ''}

                    <tr>
                      <td style="padding: 16px 0 28px 0; border-top: 1px solid #e8e8e8;">
                        <p style="margin: 0; font-size: 13px; color: #5F6368; line-height: 1.5;">
                          The full audit report with all ${a.post_count} post ideas, benchmark comparisons, and your 30-day content plan is saved to your Notion workspace.<br>
                          <br>
                          If you have any questions, feel free to reply directly.<br>
                          <br>
                          Best,<br>
                          Daud Yusuf
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    const plainText = `Hi ${firstName},\n\nI've gone through your LinkedIn profile and recent posts across 6 dimensions. Your overall score is ${a.overall_score}/100 (Grade ${a.grade} — ${a.grade_label}).\n\n${a.executive_summary}\n\nThe full audit report with ${a.post_count} post ideas, benchmark comparisons, and your 30-day content plan has been saved to your Notion workspace.\n\nIf you have any questions, feel free to reply directly.\n\nBest,\nDaud Yusuf`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_FROM_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions: any = {
      from: `"Daud Yusuf" <${process.env.GMAIL_FROM_ADDRESS}>`,
      to: prospectEmail,
      subject: `Your LinkedIn Audit Report — ${prospectName}`,
      text: plainText,
      html: htmlBody,
    };

    if (payload.pdfAttachmentBase64) {
      mailOptions.attachments = [
        {
          filename: `linkedin_audit_${prospectName.replace(/\\s+/g, '_')}.pdf`,
          content: payload.pdfAttachmentBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      deliveredTo: prospectEmail,
      prospectName,
      score: a.overall_score,
      grade: a.grade,
    };
  },
});
