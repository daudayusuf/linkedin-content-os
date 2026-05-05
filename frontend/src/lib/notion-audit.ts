import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = (process.env.NOTION_PARENT_PAGE_ID ?? '').trim();

// ── Helpers ────────────────────────────────────────────────────────────────

function rt(content: string, bold = false) {
  return {
    type: 'text' as const,
    text: { content },
    annotations: { bold, italic: false, strikethrough: false, underline: false, code: false, color: 'default' as const },
  };
}

function rtCode(content: string) {
  return {
    type: 'text' as const,
    text: { content },
    annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: true, color: 'default' as const },
  };
}

function heading2(text: string, color: string = 'default') {
  return { object: 'block' as const, type: 'heading_2' as const, heading_2: { rich_text: [rt(text)], color: color as any } };
}

function heading3(text: string) {
  return { object: 'block' as const, type: 'heading_3' as const, heading_3: { rich_text: [rt(text)], color: 'default' as any } };
}

function divider() {
  return { object: 'block' as const, type: 'divider' as const, divider: {} };
}

function paragraph(text: string, bold = false) {
  return { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [rt(text, bold)], color: 'default' as const } };
}

function callout(text: string, emoji: string, color: string = 'blue_background') {
  return {
    object: 'block' as const, type: 'callout' as const,
    callout: { icon: { type: 'emoji' as const, emoji: emoji as any }, color: color as any, rich_text: [rt(text)] },
  };
}

function tableRow(cells: string[][]) {
  return {
    object: 'block' as const, type: 'table_row' as const,
    table_row: { cells: cells.map(cell => cell.map(t => rt(t))) },
  };
}

function tableRowBold(cells: string[][]) {
  return {
    object: 'block' as const, type: 'table_row' as const,
    table_row: { cells: cells.map(cell => cell.map(t => rt(t, true))) },
  };
}

// Search or create the Audit Reports DB
let auditDbCache: string | null = null;

async function getOrCreateAuditDb(): Promise<string> {
  if (auditDbCache) return auditDbCache;
  const search = await notion.search({ query: 'LinkedIn OS — Audit Reports', filter: { property: 'object', value: 'database' } });
  const match = search.results.find((r: any) => r.object === 'database' && r.title?.[0]?.plain_text === 'LinkedIn OS — Audit Reports');
  if (match) { auditDbCache = match.id; return match.id; }

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: 'LinkedIn OS — Audit Reports' } }],
    properties: {
      Name: { title: {} },
      'Profile URL': { url: {} },
      'Overall Score': { number: { format: 'number' } },
      Grade: { select: { options: [{ name: 'A', color: 'green' }, { name: 'B', color: 'blue' }, { name: 'C', color: 'yellow' }, { name: 'D', color: 'orange' }, { name: 'F', color: 'red' }] } },
      Niche: { rich_text: {} },
      Goal: { rich_text: {} },
      'Created At': { date: {} },
    } as any,
  });
  auditDbCache = db.id;
  return db.id;
}

function pageUrl(id: string): string {
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

// ── Main Publisher ─────────────────────────────────────────────────────────

export async function publishAuditReport(input: {
  analysis: any;
  postIdeas: any[];
  strategy: string;
  onProgress?: (msg: string) => void;
}): Promise<{ pageId: string; pageUrl: string }> {
  const { analysis, postIdeas, strategy, onProgress } = input;
  const log = (msg: string) => onProgress?.(msg);
  const a = analysis;
  const dims = a.dimension_scores;
  const name = a.prospect.name;

  log('  → Creating audit report page in Notion...');

  // 1. Create the DB row (metadata only — no truncated text)
  const dbId = await getOrCreateAuditDb();
  const page = await notion.pages.create({
    parent: { database_id: dbId },
    icon: { type: 'emoji', emoji: '🔍' },
    cover: { type: 'external', external: { url: 'https://www.notion.so/images/page-cover/gradients_11.png' } },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      'Profile URL': { url: a.prospect.profile_url || null as any },
      'Overall Score': { number: a.overall_score },
      Grade: { select: { name: a.grade } },
      'Created At': { date: { start: new Date().toISOString() } },
    } as any,
  });

  const pid = page.id;

  // 2. Build page body blocks in sections, appended in batches

  // ── Section 1: Header + Executive Summary ──
  log('  → Writing Executive Summary...');
  const headerBlocks: any[] = [
    callout(`${name} — LinkedIn Audit Report  ·  Score: ${a.overall_score}/100 (${a.grade})  ·  ${a.grade_label}  ·  ${a.percentile}`, '🔍', 'purple_background'),
    divider(),
    heading2('📋 Executive Summary', 'purple'),
    paragraph(a.executive_summary || 'No executive summary available.'),
    divider(),
  ];

  // Key insights as callouts
  if (a.key_insights?.length) {
    headerBlocks.push(heading3('Key Insights'));
    for (const insight of a.key_insights) {
      headerBlocks.push(callout(insight.slice(0, 1900), '💡', 'yellow_background'));
    }
    headerBlocks.push(divider());
  }

  await notion.blocks.children.append({ block_id: pid, children: headerBlocks });

  // ── Section 2: Dimension Scores ──
  log('  → Writing Dimension Scores...');
  const dimBlocks: any[] = [
    heading2('📊 Dimension Scores', 'blue'),
  ];

  const dimEntries = [
    { key: 'profile_health', label: '🪪 Profile Health', d: dims.profile_health },
    { key: 'hook_strength', label: '🎣 Hook Strength', d: dims.hook_strength },
    { key: 'cta_clarity', label: '📢 CTA Clarity', d: dims.cta_clarity },
    { key: 'content_pillar_balance', label: '📚 Content Pillar Balance', d: dims.content_pillar_balance },
    { key: 'posting_frequency', label: '📅 Posting Frequency', d: dims.posting_frequency },
    { key: 'engagement_quality', label: '💬 Engagement Quality', d: dims.engagement_quality },
  ];

  for (const dim of dimEntries) {
    const pct = Math.round((dim.d.score / dim.d.max) * 100);
    const color = pct >= 60 ? 'green_background' : pct >= 40 ? 'yellow_background' : 'red_background';
    dimBlocks.push(callout(`${dim.label}  —  ${dim.d.score}/${dim.d.max} (${pct}%)\n${dim.d.rationale.slice(0, 500)}`, pct >= 60 ? '✅' : pct >= 40 ? '⚠️' : '🔴', color));
  }

  dimBlocks.push(divider());
  await notion.blocks.children.append({ block_id: pid, children: dimBlocks });

  // ── Section 3: Benchmark Comparison ──
  log('  → Writing Benchmark Comparison...');
  const b = a.benchmarks;
  const benchBlocks: any[] = [
    heading2('📈 Benchmark Comparison', 'green'),
    {
      object: 'block' as const, type: 'table' as const,
      table: {
        table_width: 4, has_column_header: true, has_row_header: false,
        children: [
          tableRowBold([['Metric'], ['You'], ['Median'], ['Top 10%']]),
          tableRow([['Engagement Rate'], [`${b.your_engagement_rate}%`], [`${b.median_engagement_rate}%`], [`${b.top_10_engagement_rate}%`]]),
          tableRow([['Posts Per Week'], [`${b.your_posts_per_week}`], [`${b.median_posts_per_week}`], [`${b.top_10_posts_per_week}`]]),
          tableRow([['Hook Score (avg)'], [`${b.your_hook_avg}`], [`${b.median_hook_avg}`], [`${b.top_10_hook_avg}`]]),
          tableRow([['Comment/Like Ratio'], [`${b.your_comment_like_ratio}`], ['0.15'], [`${b.top_10_comment_like_ratio}`]]),
        ],
      },
    },
    divider(),
  ];
  await notion.blocks.children.append({ block_id: pid, children: benchBlocks });

  // ── Section 4: Post Analysis ──
  log('  → Writing Post Analysis...');
  if (a.post_ratings?.length) {
    const postHeaderBlocks: any[] = [
      heading2('📝 Post Analysis', 'orange'),
      {
        object: 'block' as const, type: 'table' as const,
        table: {
          table_width: 6, has_column_header: true, has_row_header: false,
          children: [
            tableRowBold([['#'], ['Hook (75 chars)'], ['Score'], ['Pillar'], ['CTA'], ['Engagement']]),
            ...a.post_ratings.slice(0, 10).map((pr: any) =>
              tableRow([
                [`${pr.post_index + 1}`],
                [(pr.hook_text || '').slice(0, 75)],
                [`${pr.hook_score}/10`],
                [pr.content_pillar || ''],
                [pr.has_cta ? '✓' : '✗'],
                [`${pr.likes || 0}👍 ${pr.comments || 0}💬`],
              ])
            ),
          ],
        },
      },
      divider(),
    ];
    await notion.blocks.children.append({ block_id: pid, children: postHeaderBlocks });
  }

  // ── Section 5: Hook Deep Dive ──
  log('  → Writing Hook Deep Dive...');
  const hookBlocks: any[] = [heading2('🎣 Hook Strength Deep Dive', 'red')];

  // Best hooks
  if (a.top_performing_posts?.length) {
    hookBlocks.push(heading3('Best Performing Hooks'));
    for (const idx of a.top_performing_posts.slice(0, 2)) {
      const pr = a.post_ratings?.[idx];
      if (pr) {
        hookBlocks.push(callout(`Post ${idx + 1} — Hook Score: ${pr.hook_score}/10\n"${(pr.hook_text || '').slice(0, 200)}"\n${pr.standout_reason?.slice(0, 300) || ''}`, '🏆', 'green_background'));
      }
    }
  }

  // Worst hooks
  if (a.weakest_posts?.length) {
    hookBlocks.push(heading3('Hooks to Improve'));
    for (const idx of a.weakest_posts.slice(0, 2)) {
      const pr = a.post_ratings?.[idx];
      if (pr) {
        hookBlocks.push(callout(`Post ${idx + 1} — Hook Score: ${pr.hook_score}/10\n"${(pr.hook_text || '').slice(0, 200)}"\n${pr.standout_reason?.slice(0, 300) || ''}`, '⚠️', 'red_background'));
      }
    }
  }

  // Hook rewrite example
  if (a.hook_rewrite_example) {
    hookBlocks.push(heading3('Rewrite Example'));
    hookBlocks.push(callout(`Before: "${a.hook_rewrite_example.original}"\n\nAfter: "${a.hook_rewrite_example.rewrite}"\n\nWhy better: ${a.hook_rewrite_example.why_better}`, '✍️', 'blue_background'));
  }

  hookBlocks.push(divider());
  await notion.blocks.children.append({ block_id: pid, children: hookBlocks });

  // ── Section 6: Content Pillar Balance ──
  log('  → Writing Content Pillar Balance...');
  const cp = a.content_pillars;
  const pillarBlocks: any[] = [
    heading2('📚 Content Pillar Balance', 'purple'),
    {
      object: 'block' as const, type: 'table' as const,
      table: {
        table_width: 3, has_column_header: true, has_row_header: false,
        children: [
          tableRowBold([['Pillar'], ['Current'], ['Recommended']]),
          tableRow([['📖 Educational'], [`${cp.educational}%`], ['40%']]),
          tableRow([['📖 Personal Story'], [`${cp.personal_story}%`], ['30%']]),
          tableRow([['📢 Promotional'], [`${cp.promotional}%`], ['20%']]),
          tableRow([['💬 Engagement'], [`${cp.engagement}%`], ['10%']]),
        ],
      },
    },
  ];
  if (a.biggest_content_gap) {
    pillarBlocks.push(callout(`Biggest Gap: ${a.biggest_content_gap.slice(0, 800)}`, '🎯', 'red_background'));
  }
  pillarBlocks.push(divider());
  await notion.blocks.children.append({ block_id: pid, children: pillarBlocks });

  // ── Section 7: Post Ideas (toggles) ──
  log(`  → Writing ${postIdeas.length} Post Ideas...`);
  const ideasHeader: any[] = [heading2(`💡 ${postIdeas.length} Post Ideas`, 'green')];
  await notion.blocks.children.append({ block_id: pid, children: ideasHeader });

  const pillarColors: Record<string, string> = {
    'Educational': 'blue_background',
    'Personal Story': 'purple_background',
    'Promotional': 'orange_background',
    'Engagement': 'yellow_background',
  };
  const pillarEmoji: Record<string, string> = {
    'Educational': '📖',
    'Personal Story': '📖',
    'Promotional': '📢',
    'Engagement': '💬',
  };

  // Append in batches of 10
  for (let i = 0; i < postIdeas.length; i += 10) {
    const batch = postIdeas.slice(i, i + 10).map((idea: any) => ({
      object: 'block' as const, type: 'toggle' as const,
      toggle: {
        rich_text: [
          rt(`#${idea.number}  `, true),
          rt(`${pillarEmoji[idea.pillar] || '📌'} ${idea.pillar}  ·  `),
          rt(`${idea.hook?.slice(0, 100) || 'Untitled'}`, true),
        ],
        color: (pillarColors[idea.pillar] || 'gray_background') as any,
        children: [
          { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [rt(`Format: ${idea.format || 'N/A'}`, true)], color: 'default' as const } },
          { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [rt(idea.hook || '')], color: 'default' as const } },
          { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [rt(`CTA: ${idea.cta || 'N/A'}`)], color: 'default' as const } },
          { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [rt(`Why it works: ${(idea.why_it_works || '').slice(0, 500)}`)], color: 'default' as const } },
        ],
      },
    }));
    await notion.blocks.children.append({ block_id: pid, children: batch as any });
  }

  // ── Section 8: 30-Day Strategy ──
  log('  → Writing 30-Day Strategy...');
  const stratBlocks: any[] = [divider(), heading2('📅 30-Day Content Strategy', 'blue')];
  // Split strategy into paragraphs
  const stratParts = strategy.split('\n').filter(l => l.trim());
  for (const part of stratParts.slice(0, 40)) {
    const trimmed = part.trim();
    if (trimmed.startsWith('##')) {
      stratBlocks.push(heading3(trimmed.replace(/^#+\s*/, '')));
    } else if (trimmed.startsWith('#')) {
      stratBlocks.push(heading3(trimmed.replace(/^#+\s*/, '')));
    } else {
      stratBlocks.push(paragraph(trimmed));
    }
  }
  stratBlocks.push(divider());
  await notion.blocks.children.append({ block_id: pid, children: stratBlocks.slice(0, 20) });
  if (stratBlocks.length > 20) {
    await notion.blocks.children.append({ block_id: pid, children: stratBlocks.slice(20) });
  }

  // ── Section 9: Action Plan ──
  log('  → Writing Action Plan...');
  const actionBlocks: any[] = [
    heading2('🎯 What to Do Next', 'red'),
    paragraph('Based on your audit, here is where to focus your energy first.', true),
  ];
  if (a.action_items?.length) {
    for (let i = 0; i < a.action_items.length; i++) {
      actionBlocks.push(callout(`${i + 1}. ${a.action_items[i].slice(0, 800)}`, '➡️', 'blue_background'));
    }
  }
  actionBlocks.push(divider());
  actionBlocks.push(callout('— Daud Yusuf\nLinkedIn Content Strategist', '✍️', 'gray_background'));
  await notion.blocks.children.append({ block_id: pid, children: actionBlocks });

  // Log activity
  try {
    const logDb = await findDb('LinkedIn OS — Activity Log');
    if (logDb) {
      await notion.pages.create({
        parent: { database_id: logDb },
        properties: {
          Name: { title: [{ text: { content: `Audit completed — ${name}` } }] },
          Pipeline: { select: { name: 'Audit' } },
          Type: { select: { name: 'success' } },
          Description: { rich_text: [{ text: { content: `Score: ${a.overall_score}/100, Grade: ${a.grade}. ${postIdeas.length} post ideas generated.` } }] },
          'Created At': { date: { start: new Date().toISOString() } },
        },
      });
    }
  } catch {}

  return { pageId: pid, pageUrl: pageUrl(pid) };
}

async function findDb(title: string): Promise<string | null> {
  const search = await notion.search({ query: title, filter: { property: 'object', value: 'database' } });
  const match = search.results.find((r: any) => r.object === 'database' && r.title?.[0]?.plain_text === title);
  return match ? match.id : null;
}
