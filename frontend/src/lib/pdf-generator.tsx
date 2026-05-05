import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer, Font } from '@react-pdf/renderer';

const COLORS = {
  ink: '#0E0E0D',
  paper: '#F5F3EF',
  primary: '#1B4FD8',
  primary_light: '#5C84E8',
  green: '#2D7D4B',
  yellow: '#C9962B',
  red: '#B84040',
  ash: '#CCCCCC',
  grid: '#E0DDD8',
  white: '#FFFFFF'
};

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.paper, padding: 36, fontFamily: 'Helvetica' },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    marginBottom: 20,
    borderRadius: 4,
    color: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 12, marginTop: 4, opacity: 0.9 },
  section: { marginBottom: 24 },
  h1: { fontSize: 20, fontWeight: 'bold', color: COLORS.ink, marginBottom: 12, borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: 4 },
  h2: { fontSize: 14, fontWeight: 'bold', color: COLORS.ink, marginBottom: 8 },
  p: { fontSize: 10, color: COLORS.ink, marginBottom: 8, lineHeight: 1.5 },
  bold: { fontWeight: 'bold' },
  
  // Score Badge
  scoreBadge: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    border: `1px solid ${COLORS.grid}`,
    alignItems: 'center',
    marginBottom: 24
  },
  scoreNumber: { fontSize: 48, fontWeight: 'bold', color: COLORS.primary },
  scoreGrade: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },

  // Callouts
  callout: { backgroundColor: COLORS.white, padding: 12, borderRadius: 4, borderLeft: `4px solid ${COLORS.primary}`, marginBottom: 12 },
  calloutText: { fontSize: 10, lineHeight: 1.5 },

  // Charts
  chartImage: { width: '100%', height: 200, objectFit: 'contain', marginBottom: 16 },

  // Tables
  table: { width: '100%', border: `1px solid ${COLORS.grid}`, borderRadius: 4, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.grid, borderBottom: `1px solid ${COLORS.grid}` },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${COLORS.grid}` },
  tableCell: { padding: 8, fontSize: 9, flex: 1 },
  tableCellHeader: { padding: 8, fontSize: 9, fontWeight: 'bold', flex: 1 },

  // Post Cards
  cardContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: COLORS.white, padding: 12, borderRadius: 4,
    border: `1px solid ${COLORS.grid}`, marginBottom: 16, height: 160
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottom: `1px solid ${COLORS.grid}`, paddingBottom: 4 },
  cardPillar: { fontSize: 8, fontWeight: 'bold', color: COLORS.primary, textTransform: 'uppercase' },
  cardHook: { fontSize: 11, fontWeight: 'bold', color: COLORS.ink, marginBottom: 8, height: 30 },
  cardBody: { fontSize: 9, color: '#444444', lineHeight: 1.4 },
  cardCta: { fontSize: 8, fontWeight: 'bold', color: COLORS.green, marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${COLORS.grid}` },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, textAlign: 'center', fontSize: 8, color: COLORS.ash }
});

const getGradeColor = (grade: string) => {
  if (['A', 'B'].includes(grade)) return COLORS.green;
  if (grade === 'C') return COLORS.yellow;
  return COLORS.red;
};

const AuditDocument = ({ analysis, postIdeas, chartBuffers }: any) => {
  const a = analysis;
  const b = analysis.benchmarks || {};
  const cp = analysis.content_pillars || {};

  return (
    <Document>
      {/* PAGE 1: Title & Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>LinkedIn Audit Report</Text>
            <Text style={styles.headerSubtitle}>Prepared for {a.prospect.name}</Text>
          </View>
        </View>

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreNumber}>{a.overall_score}</Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>out of 100</Text>
          <Text style={[styles.scoreGrade, { color: getGradeColor(a.grade) }]}>
            Grade {a.grade} — {a.grade_label}
          </Text>
          <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
            {a.percentile} of creators in {a.prospect.niche || 'your niche'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h1}>Executive Summary</Text>
          <Text style={styles.p}>{a.executive_summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h1}>Key Insights</Text>
          {a.key_insights?.map((insight: string, i: number) => (
            <View key={i} style={styles.callout}>
              <Text style={styles.calloutText}>{insight}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>

      {/* PAGE 2: Dimension Scores & Radar */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>Dimension Scores</Text>
          <Text style={styles.p}>Your performance across the 6 key dimensions of LinkedIn growth.</Text>
          
          {chartBuffers?.radar && (
            <Image src={chartBuffers.radar} style={styles.chartImage} />
          )}

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellHeader}>Dimension</Text>
              <Text style={styles.tableCellHeader}>Score</Text>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Rationale</Text>
            </View>
            {Object.entries(a.dimension_scores || {}).map(([key, dim]: any, i) => (
              <View key={key} style={styles.tableRow}>
                <Text style={styles.tableCell}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.tableCell}>{dim.score} / {dim.max}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]}>{dim.rationale}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>

      {/* PAGE 3: Benchmarks & Content Pillars */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>Industry Benchmarks</Text>
          {chartBuffers?.benchmarks && (
            <Image src={chartBuffers.benchmarks} style={styles.chartImage} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h1}>Content Pillar Balance</Text>
          {chartBuffers?.pillars && (
            <Image src={chartBuffers.pillars} style={styles.chartImage} />
          )}
          <View style={[styles.callout, { borderLeftColor: COLORS.red }]}>
            <Text style={[styles.calloutText, styles.bold, { color: COLORS.red }]}>Biggest Gap:</Text>
            <Text style={styles.calloutText}>{a.biggest_content_gap}</Text>
          </View>
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>

      {/* PAGE 4: Hook Strength */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>Hook Strength Analysis</Text>
          {chartBuffers?.hooks && (
            <Image src={chartBuffers.hooks} style={styles.chartImage} />
          )}
          
          {a.hook_rewrite_example && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.h2}>Hook Rewrite Example</Text>
              <View style={[styles.callout, { borderLeftColor: COLORS.red }]}>
                <Text style={[styles.calloutText, styles.bold]}>Before (Weak):</Text>
                <Text style={styles.calloutText}>"{a.hook_rewrite_example.original}"</Text>
              </View>
              <View style={[styles.callout, { borderLeftColor: COLORS.green }]}>
                <Text style={[styles.calloutText, styles.bold]}>After (Strong):</Text>
                <Text style={styles.calloutText}>"{a.hook_rewrite_example.rewrite}"</Text>
              </View>
              <Text style={styles.p}><Text style={styles.bold}>Why it's better:</Text> {a.hook_rewrite_example.why_better}</Text>
            </View>
          )}
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>

      {/* PAGE 5: Posts Index */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>Posts Analyzed</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 0.5 }]}>#</Text>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Hook</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Score</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Pillar</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>CTA</Text>
            </View>
            {(a.post_ratings || []).slice(0, 10).map((pr: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>{pr.post_index + 1}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]}>{(pr.hook_text || '').slice(0, 70)}...</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{pr.hook_score}/10</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{pr.content_pillar}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{pr.has_cta ? 'Yes' : 'No'}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>

      {/* PAGES 6+: Post Ideas */}
      {postIdeas && postIdeas.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.h1}>{postIdeas.length} Custom Post Ideas</Text>
            <Text style={styles.p}>Grounded entirely in your audit gaps to rehabilitate your content strategy.</Text>
            
            <View style={styles.cardContainer}>
              {postIdeas.slice(0, 6).map((idea: any, i: number) => (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardPillar}>{idea.pillar}</Text>
                    <Text style={{ fontSize: 8, color: COLORS.ash }}>Idea {idea.number}</Text>
                  </View>
                  <Text style={styles.cardHook}>"{idea.hook}"</Text>
                  <Text style={styles.cardBody}>
                    <Text style={styles.bold}>Format:</Text> {idea.format}{'\n'}
                    <Text style={styles.bold}>Why:</Text> {(idea.why_it_works || '').slice(0, 120)}...
                  </Text>
                  <Text style={styles.cardCta}>CTA: {idea.cta}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
        </Page>
      )}

      {postIdeas && postIdeas.length > 6 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <View style={styles.cardContainer}>
              {postIdeas.slice(6, 12).map((idea: any, i: number) => (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardPillar}>{idea.pillar}</Text>
                    <Text style={{ fontSize: 8, color: COLORS.ash }}>Idea {idea.number}</Text>
                  </View>
                  <Text style={styles.cardHook}>"{idea.hook}"</Text>
                  <Text style={styles.cardBody}>
                    <Text style={styles.bold}>Format:</Text> {idea.format}{'\n'}
                    <Text style={styles.bold}>Why:</Text> {(idea.why_it_works || '').slice(0, 120)}...
                  </Text>
                  <Text style={styles.cardCta}>CTA: {idea.cta}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
        </Page>
      )}

      {/* FINAL PAGE: Action Plan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>Action Plan: What To Do Next</Text>
          <Text style={styles.p}>Based on your audit, here is where to focus your energy first:</Text>
          
          <View style={{ marginTop: 12 }}>
            {a.action_items?.map((item: string, i: number) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.primary, width: 20 }}>{i + 1}.</Text>
                <Text style={{ fontSize: 10, color: COLORS.ink, flex: 1, lineHeight: 1.5 }}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 40, borderTop: `1px solid ${COLORS.grid}`, paddingTop: 20 }}>
            <Text style={{ fontSize: 10, fontStyle: 'italic', color: COLORS.ink }}>
              Prepared by Daud Yusuf{`\n`}LinkedIn Content Strategist
            </Text>
          </View>
        </View>
        <Text style={styles.footer} fixed>Generated by LinkedIn Content OS</Text>
      </Page>
    </Document>
  );
};

export async function generateAuditPdfBuffer(analysis: any, postIdeas: any[], chartBuffers: Record<string, Buffer>) {
  return await renderToBuffer(
    <AuditDocument analysis={analysis} postIdeas={postIdeas} chartBuffers={chartBuffers} />
  );
}
