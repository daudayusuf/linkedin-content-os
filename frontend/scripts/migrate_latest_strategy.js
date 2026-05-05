const { Client } = require('@notionhq/client');
const fs = require('fs');

const notionKey = process.env.NOTION_API_KEY;
if (!notionKey) {
  console.error('NOTION_API_KEY not set');
  process.exit(2);
}

const notion = new Client({ auth: notionKey });

async function findStrategyDatabase() {
  const res = await notion.search({ query: 'LinkedIn OS — Strategy Outputs', filter: { property: 'object', value: 'database' } });
  const db = res.results.find(r => r.object === 'database' && r.title && r.title[0] && r.title[0].plain_text === 'LinkedIn OS — Strategy Outputs');
  return db ? db.id : null;
}

async function queryLatestPage(dbId) {
  const res = await notion.databases.query({ database_id: dbId, sorts: [{ property: 'Created At', direction: 'descending' }], page_size: 1 });
  return res.results[0] || null;
}

async function getAllChildBlocks(blockId) {
  const all = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return all;
}

function blockPlainText(block) {
  const cont = block[block.type];
  if (!cont) return '';
  const arr = cont.rich_text || cont.text || [];
  return arr.map(i => i.plain_text || i.text?.content || '').join('');
}

async function extractFullText(pageId) {
  const blocks = await getAllChildBlocks(pageId);
  const lines = [];
  for (const b of blocks) {
    const txt = blockPlainText(b).trim();
    if (!txt) continue;
    const t = b.type;
    if (t === 'heading_1') lines.push(`# ${txt}`);
    else if (t === 'heading_2') lines.push(`## ${txt}`);
    else if (t === 'heading_3') lines.push(`### ${txt}`);
    else if (t === 'paragraph') lines.push(txt);
    else if (t === 'bulleted_list_item') lines.push(`- ${txt}`);
    else if (t === 'numbered_list_item') lines.push(`1. ${txt}`);
    else if (t === 'to_do') lines.push(`- [${b.to_do && b.to_do.checked ? 'x' : ' '}] ${txt}`);
    else if (t === 'quote') lines.push(`> ${txt}`);
    else if (t === 'callout') lines.push(txt);
    else lines.push(txt);
    if (b.has_children) {
      // skip nested processing for simplicity
    }
  }
  return lines.join('\n\n');
}

function splitToChunks(text, max = 1800) {
  if (!text) return [''];
  const chunks = [];
  for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
  return chunks;
}

function splitIntoParagraphs(text) {
  const normalized = (text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const explicit = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit;
  const sentenceRe = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
  const sentences = normalized.match(sentenceRe) || [normalized];
  const groups = [];
  const perGroup = 2;
  for (let i = 0; i < sentences.length; i += perGroup) groups.push(sentences.slice(i, i + perGroup).join(' ').trim());
  return groups;
}

function markdownToBlocks(markdown) {
  const blocks = [];
  const paragraphs = splitIntoParagraphs(markdown || '');
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed === '---') { blocks.push({ object: 'block', type: 'divider', divider: {} }); continue; }
    if (trimmed.startsWith('### ')) { blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: trimmed.slice(4) } }] } }); continue; }
    if (trimmed.startsWith('## ')) { blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: trimmed.slice(3) } }] } }); continue; }
    if (trimmed.startsWith('# ')) { blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }] } }); continue; }
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line === '---') { blocks.push({ object: 'block', type: 'divider', divider: {} }); continue; }
      if (line.startsWith('- [ ] ')) { blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [{ type: 'text', text: { content: line.slice(6) } }], checked: false } }); continue; }
      if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) { blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [{ type: 'text', text: { content: line.slice(6) } }], checked: true } }); continue; }
      if (line.startsWith('- ')) { blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } }); continue; }
      if (/^\d+\.\s+/.test(line)) { blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\.\s+/, '') } }] } }); continue; }
      if (line.startsWith('> ')) { blocks.push({ object: 'block', type: 'quote', quote: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } }); continue; }
      for (const chunk of splitToChunks(line)) blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] } });
    }
  }
  return blocks;
}

function buildStrategyBlocks(data) {
  const rtDefault = (content) => ({ type: 'text', text: { content }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } });
  const blocks = [];
  blocks.push({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: '🧭' }, color: 'green_background', rich_text: [rtDefault(`Content Strategy (${data.period}) migrated — improved formatting applied.`)] } });
  if (data.sourceSummary) blocks.push({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: '📌' }, color: 'blue_background', rich_text: [rtDefault(data.sourceSummary)] } });
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  blocks.push({ object: 'block', type: 'table_of_contents', table_of_contents: { color: 'default' } });
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rtDefault('Executive Snapshot')] } });
  const overviewText = data.researchOverview || data.content || '';
  const sentenceRe = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
  const sentences = (overviewText.match(sentenceRe) || []).map(s => s.trim()).filter(Boolean);
  const bullets = sentences.slice(0, 3);
  if (bullets.length) {
    blocks.push({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: '📎' }, color: 'yellow_background', rich_text: [rtDefault('Executive snapshot — key points:')] } });
    for (const b of bullets) blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rtDefault(b)] } });
    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }
  blocks.push(...markdownToBlocks(overviewText));
  if (data.strategicDiagnosis) {
    blocks.push({ object: 'block', type: 'divider', divider: {} });
    blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rtDefault('Strategic Diagnosis')] } });
    blocks.push(...markdownToBlocks(data.strategicDiagnosis));
  }
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rtDefault('Full Strategy Document')] } });
  blocks.push(...markdownToBlocks(data.content || ''));
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rtDefault('Execution Checklist')] } });
  blocks.push(...markdownToBlocks(data.checklist || ''));
  return blocks.slice(0, 300);
}

(async function main(){
  try {
    const dbId = await findStrategyDatabase();
    if (!dbId) { console.error('Strategy database not found'); process.exit(3); }
    const page = await queryLatestPage(dbId);
    if (!page) { console.error('No strategy page found'); process.exit(4); }

    const pageId = page.id;
    console.log('Migrating page:', pageId);

    const period = (page.properties?.Period?.rich_text?.[0]?.plain_text) || (page.properties?.Period?.title?.[0]?.plain_text) || 'unknown';
    const contentProp = (page.properties?.Content?.rich_text?.[0]?.plain_text) || '';
    const checklistProp = (page.properties?.Checklist?.rich_text?.[0]?.plain_text) || '';

    const fullText = await extractFullText(pageId);

    const data = {
      period,
      content: fullText || contentProp || '',
      checklist: checklistProp || '',
      researchOverview: contentProp || '',
      strategicDiagnosis: '',
      sourceSummary: 'Migrated from existing page',
    };

    // Create new page copy
    const name = (page.properties?.Name?.title?.[0]?.plain_text) || `Migrated Strategy — ${period}`;
    const newPage = await notion.pages.create({ parent: { database_id: dbId }, properties: { Name: { title: [{ text: { content: name + ' (migrated)' } }] }, Period: { rich_text: [{ text: { content: period } }] }, Content: { rich_text: [{ text: { content: (data.content || '').slice(0, 1800) } }] }, Checklist: { rich_text: [{ text: { content: (data.checklist || '').slice(0, 1800) } }] }, 'Created At': { date: { start: new Date().toISOString() } } } });

    console.log('Created migrated page:', newPage.id);

    const children = buildStrategyBlocks(data);
    for (let i = 0; i < children.length; i += 80) {
      await notion.blocks.children.append({ block_id: newPage.id, children: children.slice(i, i + 80) });
    }

    // Archive old page
    await notion.pages.update({ page_id: pageId, archived: true });
    console.log('Archived old page:', pageId);
    console.log('Migration complete. New page URL: https://notion.so/' + newPage.id.replace(/-/g, ''));
  } catch (err) {
    console.error('Migration error:', err.message || err);
    process.exit(10);
  }
})();
