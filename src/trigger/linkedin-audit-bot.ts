import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AuditPayload {
  url: string;
  prospectEmail?: string;
  prospectName?: string;
  goal?: string;
  niche?: string;
}

function extractUsername(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1].replace(/\/$/, "") : url;
}

export const linkedinAuditTask = task({
  id: "linkedin-audit-bot",
  maxDuration: 300, // 5 minutes
  run: async (payload: AuditPayload) => {
    const { url, prospectEmail, prospectName, goal = "build-authority", niche = "business" } = payload;
    const username = extractUsername(url);

    // ── Step 1: Fetch profile ─────────────────────────────────────────────────
    let profileData: any = null;
    try {
      const res = await fetch(
        `https://api.scrapingdog.com/linkedin?api_key=${process.env.SCRAPINGDOG_API_KEY}&type=profile&linkId=${username}`
      );
      if (res.ok) {
        const raw = await res.json();
        profileData = Array.isArray(raw) ? raw[0] : raw;
      }
    } catch {}

    // ── Step 2: Fetch posts ───────────────────────────────────────────────────
    let postsData: any[] = [];
    try {
      const res = await fetch(
        `https://fresh-linkedin-profile-data.p.rapidapi.com/get-profile-posts?linkedin_url=${encodeURIComponent(url)}&type=posts`,
        {
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
            "x-rapidapi-host": "fresh-linkedin-profile-data.p.rapidapi.com",
          },
        }
      );
      if (res.ok) {
        const raw = await res.json();
        postsData = raw?.data || raw?.posts || (Array.isArray(raw) ? raw : []);
      }
    } catch {}

    const name = prospectName || profileData?.fullName || username;

    const profileContext = profileData
      ? `Name: ${profileData.fullName}
Headline: ${profileData.headline}
About: ${(profileData.about || "").slice(0, 500)}
Followers: ${profileData.followers || profileData.connections}
Location: ${profileData.location}`
      : `LinkedIn URL: ${url}`;

    const postsContext =
      postsData.length > 0
        ? postsData
            .slice(0, 10)
            .map(
              (p: any, i: number) =>
                `Post ${i + 1}: "${(p.text || p.content || "").slice(0, 300)}" | Likes: ${p.totalReactionCount || 0} | Comments: ${p.commentsCount || 0}`
            )
            .join("\n")
        : "No posts available.";

    // ── Step 3: Full audit analysis ───────────────────────────────────────────
    const auditRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Perform a comprehensive LinkedIn audit for ${name}.

PROFILE: ${profileContext}
POSTS: ${postsContext}
GOAL: ${goal}
NICHE: ${niche}

Score each dimension 1-10. Write a full audit report including:
1. 6-Dimension Scores (Profile, Content, Consistency, Engagement, Authority, CTA)
2. Overall Score /100 and Grade
3. Top 3 Quick Wins (actionable this week)
4. 30-Day Content Plan (4 weekly themes + 3 post ideas each)
5. Engagement Strategy (daily actions)
6. Executive Summary paragraph

Format professionally — this is a paid client deliverable.`,
        },
      ],
    });

    const report = auditRes.content[0].type === "text" ? auditRes.content[0].text : "";

    // ── Step 4: Email report ──────────────────────────────────────────────────
    const deliveryEmail = prospectEmail || process.env.GMAIL_FROM_ADDRESS;
    if (deliveryEmail) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_FROM_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"Daud Yusuf" <${process.env.GMAIL_FROM_ADDRESS}>`,
          to: deliveryEmail,
          subject: `Your LinkedIn Audit Report — ${name}`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <h2 style="color: #1B4FD8;">LinkedIn Audit Report</h2>
  <p>Hi ${name.split(" ")[0]},</p>
  <p>Here is your complete LinkedIn audit and 30-day content strategy:</p>
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
  <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${report}</pre>
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
  <p>Let me know if you have any questions.</p>
  <p>Best,<br/><strong>Daud Yusuf</strong></p>
</div>`,
        });
      } catch (emailErr: any) {
        throw new Error(`Email delivery failed for ${deliveryEmail}: ${emailErr.message}`);
      }
    }

    return {
      success: true,
      name,
      username,
      reportLength: report.length,
      postsAnalyzed: postsData.length,
      deliveredTo: deliveryEmail,
    };
  },
});
