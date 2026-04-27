import { Client, isFullPage } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID ?? '';

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
  'LinkedIn OS — Activity Log': {
    Name:         { title: {} },
    Pipeline:     { select: { options: [
      { name: 'Audit', color: 'purple' }, { name: 'Generation', color: 'blue' },
      { name: 'Ideation', color: 'yellow' }, { name: 'Engagement', color: 'green' },
      { name: 'Repurposing', color: 'pink' },
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

async function logActivity(data: {
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
