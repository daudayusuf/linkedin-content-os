// frontend/src/lib/research.ts
import fs from 'fs';
import path from 'path';

export function getResearchContext(): string {
  try {
    const dir = path.join(process.cwd(), '..', 'Full Content Pipeline', '1. Market, Audience & Competitor Research', 'outputs');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
    const combined = files
      .map(f => fs.readFileSync(path.join(dir, f), 'utf-8'))
      .join('\n\n---\n\n');
    return combined.slice(0, 4000);
  } catch {
    return '';
  }
}
