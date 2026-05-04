import { Client, isFullPage } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = (process.env.NOTION_PARENT_PAGE_ID ?? '').trim();

// Module-level DB ID cache — survives between requests in same process
const dbCache: Record<string, string> = {};

// ─── Database schemas ──────────────────────────────────────────────────────

const DB_SCHEMAS: Record<string, object> = {
  'LinkedIn OS — Audit Reports': {
    Name:            { title: {} },
    'Profile URL':   { url: {} },
    'Overall Score': { number: { format: 'number' } },
    Grade:           { select: { options: [
      { name: 'A', color: 'green' }, { name: 'B', color: 'blue' },
      { name: 'C', color: 'yellow' }, { name: 'D', color: 'orange' },
      { name: 'F', color: 'red' },
    ]}},
    Analysis:        { rich_text: {} },
    Strategy:        { rich_text: {} },
    'Created At':    { date: {} },
  },
  'LinkedIn OS — Generated Posts': {
    Name:         { title: {} },
    Tone:         { select: { options: [
      { name: 'Professional & Authoritative', color: 'blue' },
      { name: 'Controversial / Unpopular Opinion', color: 'red' },
      { name: 'Storytelling / Vulnerable', color: 'purple' },
      { name: 'Actionable Step-by-Step', color: 'green' },
    ]}},
    Content:      { rich_text: {} },
    Status:       { select: { options: [
      { name: 'Draft', color: 'yellow' }, { name: 'Published', color: 'green' },
    ]}},
    'Created At': { date: {} },
  },
  'LinkedIn OS — Ideation Hooks': {
    Name:          { title: {} },
    Hooks:         { rich_text: {} },
    'Hook Count':  { number: { format: 'number' } },
    'Created At':  { date: {} },
  },
  'LinkedIn OS — Engagement Plans': {
    Name:                 { title: {} },
    'Connection Notes':   { rich_text: {} },
    'Comment Templates':  { rich_text: {} },
    'Created At':         { date: {} },
  },
  'LinkedIn OS — Repurposed Content': {
    Name:               { title: {} },
    'Source URL':       { url: {} },
    'Text Post':        { rich_text: {} },
    'Carousel Outline': { rich_text: {} },
    'Created At':       { date: {} },
  },
  'LinkedIn OS — Research Outputs': {
    Name:         { title: {} },
    Section:      { select: { options: [
      { name: 'Market', color: 'yellow' }, { name: 'Audience', color: 'orange' },
      { name: 'Competitor', color: 'red' }, { name: 'Executive Summary', color: 'green' },
    ]}},
    Content:      { rich_text: {} },
    Niche:        { rich_text: {} },
    'Created At': { date: {} },
  },
  'LinkedIn OS — Strategy Outputs': {
    Name:         { title: {} },
    Period:       { rich_text: {} },
    Content:      { rich_text: {} },
    Checklist:    { rich_text: {} },
    'Created At': { date: {} },
  },
  'LinkedIn OS — Performance Snapshots': {
    Name:            { title: {} },
    Month:           { rich_text: {} },
    Grade:           { select: { options: [
      { name: 'A', color: 'green' }, { name: 'B', color: 'blue' },
      { name: 'C', color: 'yellow' }, { name: 'D', color: 'orange' },
      { name: 'F', color: 'red' },
    ]}},
    Score:           { number: { format: 'number' } },
    Analysis:        { rich_text: {} },
    Recommendations: { rich_text: {} },
    'Created At':    { date: {} },
  },
  'LinkedIn OS — Activity Log': {
    Name:         { title: {} },
    Pipeline:     { select: { options: [
      { name: 'Audit', color: 'purple' }, { name: 'Research', color: 'yellow' },
      { name: 'Strategy', color: 'green' }, { name: 'Calendar', color: 'blue' },
      { name: 'Engagement', color: 'teal' }, { name: 'Performance', color: 'pink' },
    ]}},
    Type:         { select: { options: [
      { name: 'success', color: 'green' }, { name: 'info', color: 'blue' },
      { name: 'warning', color: 'yellow' }, { name: 'error', color: 'red' },
    ]}},
    Description:  { rich_text: {} },
    'Created At': { date: {} },
  },
};

// ─── DB get-or-create ──────────────────────────────────────────────────────

async function getOrCreateDatabase(title: string): Promise<string> {
  if (dbCache[title]) return dbCache[title];

  const search = await notion.search({
    query: title,
    filter: { property: 'object', value: 'database' },
  });

  const match = search.results.find(
    (r) => r.object === 'database' && isFullDatabase(r) &&
      (r as any).title?.[0]?.plain_text === title
  );

  if (match) {
    dbCache[title] = match.id;
    return match.id;
  }

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: title } }],
    properties: DB_SCHEMAS[title] as any,
  });

  dbCache[title] = db.id;
  return db.id;
}

function isFullDatabase(r: any): boolean {
  return r.object === 'database';
}

// Cap at 1990 chars (Notion rich_text property limit is 2000)
function cap(text: string): string {
  return text.length > 1990 ? text.slice(0, 1987) + '...' : text;
}

function now(): string {
  return new Date().toISOString();
}

// ─── Activity log (internal helper) ───────────────────────────────────────

export async function logActivity(data: {
  title: string;
  description: string;
  pipeline: string;
  type: string;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Activity Log');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:        { title: [{ text: { content: data.title } }] },
      Pipeline:    { select: { name: data.pipeline } },
      Type:        { select: { name: data.type } },
      Description: { rich_text: [{ text: { content: cap(data.description) } }] },
      'Created At':{ date: { start: now() } },
    },
  });
}

// ─── Save functions ────────────────────────────────────────────────────────

export async function saveAuditReport(data: {
  profileName: string;
  profileUrl: string;
  score: number;
  grade: string;
  analysis: string;
  strategy: string;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Audit Reports');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:            { title: [{ text: { content: data.profileName } }] },
      'Profile URL':   { url: data.profileUrl || null as any },
      'Overall Score': { number: data.score },
      Grade:           { select: { name: data.grade } },
      Analysis:        { rich_text: [{ text: { content: cap(data.analysis) } }] },
      Strategy:        { rich_text: [{ text: { content: cap(data.strategy) } }] },
      'Created At':    { date: { start: now() } },
    },
  });
  await logActivity({
    title: `Audit completed — ${data.profileName}`,
    description: `Score: ${data.score}/100, Grade: ${data.grade}`,
    pipeline: 'Audit',
    type: 'success',
  });
}

export async function clearMonthPosts(month: string): Promise<number> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Generated Posts');
  const prefix = `[${month}-`;
  let archived = 0;
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const page of res.results) {
      const name = (page as any).properties?.Name?.title?.[0]?.plain_text ?? '';
      if (name.startsWith(prefix)) {
        await notion.pages.update({ page_id: page.id, archived: true });
        archived++;
      }
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return archived;
}

export async function saveGeneratedPost(data: {
  topic: string;
  tone: string;
  content: string;
}): Promise<void> {
  const title = data.topic.slice(0, 100);
  const dbId = await getOrCreateDatabase('LinkedIn OS — Generated Posts');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:         { title: [{ text: { content: title } }] },
      Tone:         { select: { name: data.tone } },
      Content:      { rich_text: [{ text: { content: cap(data.content) } }] },
      Status:       { select: { name: 'Draft' } },
      'Created At': { date: { start: now() } },
    },
  });
  await logActivity({
    title: 'Post drafted',
    description: `Topic: ${title} | Tone: ${data.tone}`,
    pipeline: 'Generation',
    type: 'success',
  });
}

export async function saveIdeationHooks(data: {
  niche: string;
  hooks: string;
  hookCount: number;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Ideation Hooks');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:         { title: [{ text: { content: `Hooks — ${data.niche}` } }] },
      Hooks:        { rich_text: [{ text: { content: cap(data.hooks) } }] },
      'Hook Count': { number: data.hookCount },
      'Created At': { date: { start: now() } },
    },
  });
  await logActivity({
    title: `${data.hookCount} hook ideas generated`,
    description: `Niche: ${data.niche}`,
    pipeline: 'Ideation',
    type: 'success',
  });
}

export async function saveEngagementPlan(data: {
  target: string;
  connectionNotes: string;
  commentTemplates: string;
}): Promise<void> {
  const label = data.target.slice(0, 80);
  const dbId = await getOrCreateDatabase('LinkedIn OS — Engagement Plans');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:                { title: [{ text: { content: `Engagement — ${label}` } }] },
      'Connection Notes':  { rich_text: [{ text: { content: cap(data.connectionNotes) } }] },
      'Comment Templates': { rich_text: [{ text: { content: cap(data.commentTemplates) } }] },
      'Created At':        { date: { start: now() } },
    },
  });
  await logActivity({
    title: 'Engagement plan saved',
    description: `Target: ${label}`,
    pipeline: 'Engagement',
    type: 'success',
  });
}

export async function saveRepurposedContent(data: {
  sourceUrl: string;
  textPost: string;
  carouselOutline: string;
}): Promise<void> {
  const label = data.sourceUrl.replace(/^https?:\/\//, '').slice(0, 80);
  const dbId = await getOrCreateDatabase('LinkedIn OS — Repurposed Content');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:               { title: [{ text: { content: label } }] },
      'Source URL':       { url: data.sourceUrl || null as any },
      'Text Post':        { rich_text: [{ text: { content: cap(data.textPost) } }] },
      'Carousel Outline': { rich_text: [{ text: { content: cap(data.carouselOutline) } }] },
      'Created At':       { date: { start: now() } },
    },
  });
  await logActivity({
    title: 'Content repurposed',
    description: `Source: ${label}`,
    pipeline: 'Repurposing',
    type: 'success',
  });
}

// ─── Fetch / query helpers ─────────────────────────────────────────────────

export interface NotionRecord {
  id: string;
  title: string;
  subtitle: string;
  notionUrl: string;
  createdAt: string;
}

function pageUrl(id: string): string {
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

function prop(page: PageObjectResponse, key: string): any {
  return page.properties[key];
}

function getText(page: PageObjectResponse, key: string): string {
  const p = prop(page, key);
  if (!p) return '';
  if (p.type === 'title') return p.title?.[0]?.plain_text ?? '';
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? '';
  return '';
}

function getSelect(page: PageObjectResponse, key: string): string {
  const p = prop(page, key);
  return p?.select?.name ?? '';
}

function getNumber(page: PageObjectResponse, key: string): number {
  const p = prop(page, key);
  return p?.number ?? 0;
}

function getDate(page: PageObjectResponse, key: string): string {
  const p = prop(page, key);
  return p?.date?.start ?? page.created_time ?? '';
}

async function queryDb(title: string, limit: number): Promise<PageObjectResponse[]> {
  const dbId = await getOrCreateDatabase(title);
  const res = await notion.databases.query({
    database_id: dbId,
    sorts: [{ property: 'Created At', direction: 'descending' }],
    page_size: limit,
  });
  return res.results.filter(isFullPage) as PageObjectResponse[];
}

// ─── Per-type fetch ────────────────────────────────────────────────────────

export async function getRecentAudits(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Audit Reports', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: `Score: ${getNumber(p, 'Overall Score')}/100 — Grade ${getSelect(p, 'Grade')}`,
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getRecentPosts(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Generated Posts', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: `${getSelect(p, 'Tone')} · ${getSelect(p, 'Status')}`,
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getRecentHooks(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Ideation Hooks', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: `${getNumber(p, 'Hook Count')} hooks generated`,
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getRecentEngagementPlans(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Engagement Plans', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: '5 connection notes + 7 comment templates',
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getRecentRepurposed(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Repurposed Content', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: 'Text post + carousel outline',
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getRecentActivity(limit = 10): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Activity Log', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: getText(p, 'Description'),
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
    pipeline: getSelect(p, 'Pipeline'),
    type: getSelect(p, 'Type'),
  } as NotionRecord & { pipeline: string; type: string }));
}

export async function getEngagementCounts(): Promise<{ plans: number; notes: number; comments: number }> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Engagement Plans');
  const res = await notion.databases.query({ database_id: dbId, page_size: 100 });
  const plans = res.results.length;
  return { plans, notes: plans * 5, comments: plans * 7 };
}

// ─── Research pipeline ─────────────────────────────────────────────────────

export async function saveResearchOutput(data: {
  section: 'Market' | 'Audience' | 'Competitor' | 'Executive Summary';
  content: string;
  niche: string;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Research Outputs');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:         { title: [{ text: { content: `${data.section} Research — ${data.niche.slice(0, 60)}` } }] },
      Section:      { select: { name: data.section } },
      Content:      { rich_text: [{ text: { content: cap(data.content) } }] },
      Niche:        { rich_text: [{ text: { content: data.niche.slice(0, 200) } }] },
      'Created At': { date: { start: now() } },
    },
  });
}

export async function getRecentResearchOutputs(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Research Outputs', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: getSelect(p, 'Section'),
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}

export async function getLatestResearchOutput(): Promise<string> {
  try {
    const pages = await queryDb('LinkedIn OS — Research Outputs', 10);
    if (pages.length === 0) return '';
    return pages
      .map((p) => `## ${getText(p, 'Section')} Research\n\n${getText(p, 'Content')}`)
      .join('\n\n---\n\n');
  } catch {
    return '';
  }
}

// ─── Strategy pipeline ─────────────────────────────────────────────────────

export async function saveStrategyOutput(data: {
  period: string;
  content: string;
  checklist: string;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Strategy Outputs');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:         { title: [{ text: { content: `Content Strategy — ${data.period}` } }] },
      Period:       { rich_text: [{ text: { content: data.period } }] },
      Content:      { rich_text: [{ text: { content: cap(data.content) } }] },
      Checklist:    { rich_text: [{ text: { content: cap(data.checklist) } }] },
      'Created At': { date: { start: now() } },
    },
  });
  await logActivity({
    title: `Content strategy built — ${data.period}`,
    description: 'Full strategy document + execution checklist saved to Notion',
    pipeline: 'Strategy',
    type: 'success',
  });
}

export async function getLatestStrategyOutput(): Promise<string> {
  try {
    const pages = await queryDb('LinkedIn OS — Strategy Outputs', 1);
    if (pages.length === 0) return '';
    const p = pages[0];
    return `## Content Strategy\n\n${getText(p, 'Content')}\n\n## Execution Checklist\n\n${getText(p, 'Checklist')}`;
  } catch {
    return '';
  }
}

// ─── Content Calendar — Monthly Publishing Structure ──────────────────────

export interface CalendarPostData {
  date: string;
  day: string;
  pillar: string;
  format: string;
  topic: string;
  caption: string;
  direction: string;
  hashtags: string;
}

const PILLAR_META: Record<string, { emoji: string; color: string }> = {
  'Thought Leadership':  { emoji: '🧠', color: 'purple_background' },
  'Education':           { emoji: '📚', color: 'blue_background' },
  'Personal Brand':      { emoji: '👤', color: 'orange_background' },
  'Social Proof':        { emoji: '⭐', color: 'green_background' },
  'Audience Engagement': { emoji: '💬', color: 'yellow_background' },
  'Category Authority':  { emoji: '🏆', color: 'red_background' },
};

const FORMAT_EMOJI: Record<string, string> = {
  'Text-only':       '✍️',
  'Carousel':        '🎠',
  'Poll':            '📊',
  'List post':       '📋',
  'Story/Narrative': '📖',
  'Data insight':    '📈',
  'Bold opinion':    '💡',
};

const PAGE_COVERS = [
  'https://www.notion.so/images/page-cover/gradients_11.png',
  'https://www.notion.so/images/page-cover/gradients_2.png',
  'https://www.notion.so/images/page-cover/gradients_3.png',
  'https://www.notion.so/images/page-cover/gradients_5.png',
  'https://www.notion.so/images/page-cover/gradients_8.png',
];

let contentCreationPageCache: string | null = null;

function rt(content: string, bold = false) {
  return {
    type: 'text' as const,
    text: { content },
    annotations: { bold, italic: false, strikethrough: false, underline: false, code: false, color: 'default' as const },
  };
}

function splitText(text: string, max = 1900): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
  return chunks;
}

async function getOrCreateContentCreationPage(): Promise<string> {
  if (contentCreationPageCache) return contentCreationPageCache;

  const search = await notion.search({
    query: '📋 Content Creation',
    filter: { property: 'object', value: 'page' },
  });

  const match = search.results.find(
    (r: any) => r.object === 'page' && r.properties?.title?.title?.[0]?.plain_text === '📋 Content Creation'
  );

  if (match) {
    contentCreationPageCache = match.id;
    return match.id;
  }

  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { type: 'emoji', emoji: '📋' },
    cover: { type: 'external', external: { url: PAGE_COVERS[0] } },
    properties: {
      title: { title: [{ text: { content: '📋 Content Creation' } }] },
    },
    children: [
      {
        object: 'block' as const, type: 'callout' as const,
        callout: {
          icon: { type: 'emoji' as const, emoji: '🚀' },
          color: 'blue_background' as const,
          rich_text: [rt("Your LinkedIn content calendar hub. Each month's content is organized in the table below — click any month to view the full breakdown and all posts.")],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
    ] as any,
  });

  contentCreationPageCache = page.id;
  return page.id;
}

async function getOrCreateMonthlyDatabase(parentPageId: string): Promise<string> {
  const cacheKey = `monthly-db-${parentPageId}`;
  if (dbCache[cacheKey]) return dbCache[cacheKey];

  const search = await notion.search({
    query: 'LinkedIn OS — Monthly Content',
    filter: { property: 'object', value: 'database' },
  });

  const match = search.results.find(
    (r: any) => r.object === 'database' && r.title?.[0]?.plain_text === 'LinkedIn OS — Monthly Content'
  );

  if (match) {
    dbCache[cacheKey] = match.id;
    return match.id;
  }

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📅' },
    title: [{ type: 'text', text: { content: 'LinkedIn OS — Monthly Content' } }],
    properties: {
      Name:         { title: {} },
      'Post Count': { number: { format: 'number' } },
      Status: {
        select: {
          options: [
            { name: 'Generated', color: 'blue' },
            { name: 'Scheduled', color: 'yellow' },
            { name: 'Published', color: 'green' },
          ],
        },
      },
      'Created At': { date: {} },
    } as any,
  });

  dbCache[cacheKey] = db.id;
  return db.id;
}

async function archiveExistingMonthEntry(databaseId: string, monthName: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor });
    for (const page of res.results) {
      const name = (page as any).properties?.Name?.title?.[0]?.plain_text ?? '';
      if (name === monthName) await notion.pages.update({ page_id: page.id, archived: true });
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
}

async function createSummarySubPage(
  parentPageId: string,
  monthName: string,
  posts: CalendarPostData[],
  strategySection: string,
): Promise<string> {
  const pillarCounts: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};
  for (const p of posts) {
    pillarCounts[p.pillar] = (pillarCounts[p.pillar] ?? 0) + 1;
    formatCounts[p.format] = (formatCounts[p.format] ?? 0) + 1;
  }

  const pillarRows = Object.entries(pillarCounts).map(([pillar, count]) => {
    const meta = PILLAR_META[pillar] ?? { emoji: '📌', color: 'gray_background' };
    const pct = Math.round((count / posts.length) * 100);
    return {
      object: 'block' as const, type: 'table_row' as const,
      table_row: {
        cells: [
          [rt(`${meta.emoji} ${pillar}`)],
          [rt(String(count), true)],
          [rt(`${pct}%`)],
        ],
      },
    };
  });

  const formatCallouts = Object.entries(formatCounts).map(([fmt, count]) => ({
    object: 'block' as const, type: 'callout' as const,
    callout: {
      icon: { type: 'emoji' as const, emoji: FORMAT_EMOJI[fmt] ?? '📄' },
      color: 'green_background' as const,
      rich_text: [rt(`${fmt}  —  ${count} post${count > 1 ? 's' : ''}`)],
    },
  }));

  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📊' },
    cover: { type: 'external', external: { url: PAGE_COVERS[2] } },
    properties: {
      title: { title: [{ text: { content: `📊 ${monthName} — Summary` } }] },
    },
    children: [
      {
        object: 'block' as const, type: 'callout' as const,
        callout: {
          icon: { type: 'emoji' as const, emoji: '🗓️' },
          color: 'blue_background' as const,
          rich_text: [rt(`${monthName}  ·  ${posts.length} posts planned  ·  Generated ${generatedDate}`, true)],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const, type: 'heading_2' as const,
        heading_2: { rich_text: [rt('🎯 Content Pillars')], color: 'purple' as any },
      },
      {
        object: 'block' as const, type: 'table' as const,
        table: {
          table_width: 3,
          has_column_header: true,
          has_row_header: false,
          children: [
            {
              object: 'block' as const, type: 'table_row' as const,
              table_row: { cells: [[rt('Pillar', true)], [rt('Posts', true)], [rt('Share', true)]] },
            },
            ...pillarRows,
          ],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const, type: 'heading_2' as const,
        heading_2: { rich_text: [rt('🎨 Format Mix')], color: 'green' as any },
      },
      ...formatCallouts,
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const, type: 'heading_2' as const,
        heading_2: { rich_text: [rt('📋 Strategy Notes')], color: 'orange' as any },
      },
      {
        object: 'block' as const, type: 'quote' as const,
        quote: {
          rich_text: splitText(strategySection.slice(0, 3600), 1800).map((chunk) => rt(chunk)),
          color: 'orange_background' as any,
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const, type: 'heading_2' as const,
        heading_2: { rich_text: [rt('📌 Posts at a Glance')], color: 'red' as any },
      },
    ] as any,
  });

  // Append post overview toggles in batches
  const toggles = posts.map((post) => {
    const meta = PILLAR_META[post.pillar] ?? { emoji: '📌', color: 'gray_background' };
    return {
      object: 'block' as const, type: 'toggle' as const,
      toggle: {
        rich_text: [rt(`${meta.emoji} ${post.date}`, true), rt(`  ·  ${post.pillar}  ·  ${FORMAT_EMOJI[post.format] ?? '📄'} ${post.format}`)],
        color: meta.color as any,
        children: [{
          object: 'block' as const, type: 'paragraph' as const,
          paragraph: { rich_text: [rt(post.topic)], color: 'default' as const },
        }],
      },
    };
  });

  for (let i = 0; i < toggles.length; i += 20) {
    await notion.blocks.children.append({ block_id: page.id, children: toggles.slice(i, i + 20) as any });
  }

  return page.id;
}

async function createContentsSubPage(
  parentPageId: string,
  monthName: string,
  posts: CalendarPostData[],
): Promise<string> {
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📝' },
    cover: { type: 'external', external: { url: PAGE_COVERS[3] } },
    properties: {
      title: { title: [{ text: { content: `📝 ${monthName} — Posts` } }] },
    },
    children: [
      {
        object: 'block' as const, type: 'callout' as const,
        callout: {
          icon: { type: 'emoji' as const, emoji: '📝' },
          color: 'purple_background' as const,
          rich_text: [rt(`All ${posts.length} posts for ${monthName}. Each post includes caption, designer direction, and hashtags. Click any post to expand.`)],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
    ] as any,
  });

  // Append posts as toggle blocks, 5 at a time
  for (let i = 0; i < posts.length; i += 5) {
    const batch = posts.slice(i, i + 5).map((post) => {
      const meta = PILLAR_META[post.pillar] ?? { emoji: '📌', color: 'gray_background' };
      const captionFirst = splitText(post.caption)[0];
      const directionText = (post.direction || 'No direction notes.').slice(0, 1900);
      const hashtagText = (post.hashtags || '').slice(0, 1900);

      return {
        object: 'block' as const, type: 'toggle' as const,
        toggle: {
          rich_text: [
            rt(`${meta.emoji} ${post.day}`, true),
            rt(`  ·  ${FORMAT_EMOJI[post.format] ?? '📄'} ${post.format}`),
          ],
          color: meta.color as any,
          children: [
            {
              object: 'block' as const, type: 'callout' as const,
              callout: {
                icon: { type: 'emoji' as const, emoji: '💡' },
                color: meta.color as any,
                rich_text: [rt(post.topic.slice(0, 1900), true)],
              },
            },
            {
              object: 'block' as const, type: 'heading_3' as const,
              heading_3: { rich_text: [rt('✍️ Caption')], color: 'default' as const },
            },
            {
              object: 'block' as const, type: 'paragraph' as const,
              paragraph: { rich_text: [rt(captionFirst)], color: 'default' as const },
            },
            {
              object: 'block' as const, type: 'heading_3' as const,
              heading_3: { rich_text: [rt('🎨 Designer Direction')], color: 'default' as const },
            },
            {
              object: 'block' as const, type: 'callout' as const,
              callout: {
                icon: { type: 'emoji' as const, emoji: '🎨' },
                color: 'gray_background' as const,
                rich_text: [rt(directionText)],
              },
            },
            {
              object: 'block' as const, type: 'heading_3' as const,
              heading_3: { rich_text: [rt('🏷️ Hashtags')], color: 'default' as const },
            },
            {
              object: 'block' as const, type: 'paragraph' as const,
              paragraph: {
                rich_text: [{ type: 'text' as const, text: { content: hashtagText }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: true, color: 'default' as const } }],
                color: 'default' as const,
              },
            },
          ],
        },
      };
    });

    await notion.blocks.children.append({ block_id: page.id, children: batch as any });
  }

  return page.id;
}

export async function publishMonthCalendar(
  month: string,
  monthName: string,
  posts: CalendarPostData[],
  strategySection: string,
  onProgress?: (msg: string) => void,
): Promise<{ monthPageId: string; summaryPageId: string; contentsPageId: string }> {
  const log = (msg: string) => onProgress?.(msg);

  log('  → Finding Content Creation hub...');
  const contentPageId = await getOrCreateContentCreationPage();

  log('  → Setting up Monthly Content database...');
  const monthlyDbId = await getOrCreateMonthlyDatabase(contentPageId);

  log(`  → Clearing any existing ${monthName} entry...`);
  await archiveExistingMonthEntry(monthlyDbId, monthName);

  log(`  → Creating ${monthName} page in the table...`);
  const monthPage = await notion.pages.create({
    parent: { database_id: monthlyDbId },
    icon: { type: 'emoji', emoji: '📅' },
    cover: { type: 'external', external: { url: PAGE_COVERS[1] } },
    properties: {
      Name:         { title: [{ text: { content: monthName } }] },
      'Post Count': { number: posts.length },
      Status:       { select: { name: 'Generated' } },
      'Created At': { date: { start: now() } },
    },
  });
  const monthPageId = monthPage.id;

  // Add intro content to the month page
  await notion.blocks.children.append({
    block_id: monthPageId,
    children: [
      {
        object: 'block' as const, type: 'callout' as const,
        callout: {
          icon: { type: 'emoji' as const, emoji: '📅' },
          color: 'blue_background' as const,
          rich_text: [rt(`${monthName}  ·  ${posts.length} posts  ·  Open the sub-pages below to explore the summary and full content.`, true)],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
    ] as any,
  });

  log('  → Building Summary page...');
  const summaryPageId = await createSummarySubPage(monthPageId, monthName, posts, strategySection);

  log(`  → Building Posts page (${posts.length} posts)...`);
  const contentsPageId = await createContentsSubPage(monthPageId, monthName, posts);

  return { monthPageId, summaryPageId, contentsPageId };
}

// ─── Performance pipeline ──────────────────────────────────────────────────

export async function savePerformanceSnapshot(data: {
  month: string;
  grade: string;
  score: number;
  analysis: string;
  recommendations: string;
}): Promise<void> {
  const dbId = await getOrCreateDatabase('LinkedIn OS — Performance Snapshots');
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:            { title: [{ text: { content: `Performance Snapshot — ${data.month}` } }] },
      Month:           { rich_text: [{ text: { content: data.month } }] },
      Grade:           { select: { name: data.grade } },
      Score:           { number: data.score },
      Analysis:        { rich_text: [{ text: { content: cap(data.analysis) } }] },
      Recommendations: { rich_text: [{ text: { content: cap(data.recommendations) } }] },
      'Created At':    { date: { start: now() } },
    },
  });
  await logActivity({
    title: `Performance snapshot — ${data.month}`,
    description: `Score: ${data.score}/100, Grade: ${data.grade}`,
    pipeline: 'Performance',
    type: 'success',
  });
}

export async function getRecentPerformanceSnapshots(limit = 5): Promise<NotionRecord[]> {
  const pages = await queryDb('LinkedIn OS — Performance Snapshots', limit);
  return pages.map((p) => ({
    id: p.id,
    title: getText(p, 'Name'),
    subtitle: `Score: ${getNumber(p, 'Score')}/100 — Grade ${getSelect(p, 'Grade')}`,
    notionUrl: pageUrl(p.id),
    createdAt: getDate(p, 'Created At'),
  }));
}
