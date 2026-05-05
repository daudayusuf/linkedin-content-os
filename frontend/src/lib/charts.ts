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
};

function buildQuickChartUrl(config: any) {
  // Use POST request via a fetch abstraction if we wanted buffers, 
  // but GET URL is easier if it fits in size limit.
  // We'll return the encoded URL string. QuickChart accepts GET up to ~4KB.
  const baseUrl = 'https://quickchart.io/chart';
  const query = encodeURIComponent(JSON.stringify(config));
  return `${baseUrl}?w=800&h=450&c=${query}`;
}

export function generateRadarChartUrl(analysis: any) {
  const dims = analysis.dimension_scores || {};
  const order = [
    { key: 'profile_health', label: 'Profile Health', max: 20 },
    { key: 'hook_strength', label: 'Hook Strength', max: 20 },
    { key: 'cta_clarity', label: 'CTA Clarity', max: 15 },
    { key: 'content_pillar_balance', label: 'Pillar Balance', max: 15 },
    { key: 'posting_frequency', label: 'Posting Frequency', max: 15 },
    { key: 'engagement_quality', label: 'Engagement Quality', max: 15 },
  ];

  const labels = order.map(o => o.label);
  const maxes = order.map(o => o.max);
  const scores = order.map(o => dims[o.key]?.score || 0);
  const top10 = order.map(o => o.max * 0.88); // 88% of max

  const scoresNorm = scores.map((s, i) => s / maxes[i]);
  const top10Norm = top10.map((s, i) => s / maxes[i]);

  const config = {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Top 10% Benchmark',
          data: top10Norm,
          borderColor: COLORS.ash,
          backgroundColor: COLORS.ash + '22', // transparent
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'Your Score',
          data: scoresNorm,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '33',
          borderWidth: 3,
          pointBackgroundColor: COLORS.primary
        }
      ]
    },
    options: {
      scale: {
        ticks: { display: false, min: 0, max: 1 },
        gridLines: { color: COLORS.grid },
        pointLabels: { fontSize: 16, fontColor: COLORS.ink, fontStyle: 'bold' }
      },
      legend: { position: 'right', labels: { fontSize: 16, fontColor: COLORS.ink } },
      title: { display: true, text: 'Dimension Scores vs Top 10% Benchmark', fontSize: 20, fontColor: COLORS.ink, fontStyle: 'bold' }
    }
  };

  return buildQuickChartUrl(config);
}

export function generatePillarChartUrl(analysis: any) {
  const actual = analysis.content_pillars || {};
  const ideal = { educational: 40, personal_story: 30, promotional: 20, engagement: 10 };
  const order = ['educational', 'personal_story', 'promotional', 'engagement'];
  const labels = ['Educational', 'Personal Story', 'Promotional', 'Engagement'];

  const actualVals = order.map(p => actual[p] || 0);
  const idealVals = order.map(p => ideal[p as keyof typeof ideal] || 0);

  const config = {
    type: 'horizontalBar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Your Content',
          data: actualVals,
          backgroundColor: COLORS.primary
        },
        {
          label: 'Ideal Balance',
          data: idealVals,
          backgroundColor: COLORS.ash
        }
      ]
    },
    options: {
      legend: { position: 'bottom', labels: { fontSize: 16, fontColor: COLORS.ink } },
      title: { display: true, text: 'Content Pillar Distribution: Yours vs Ideal', fontSize: 20, fontColor: COLORS.ink, fontStyle: 'bold' },
      scales: {
        xAxes: [{ ticks: { min: 0, max: 60, fontSize: 16, fontColor: COLORS.ink }, gridLines: { display: false } }],
        yAxes: [{ ticks: { fontSize: 16, fontColor: COLORS.ink, fontStyle: 'bold' }, gridLines: { display: false } }]
      },
      plugins: {
        datalabels: {
          display: true,
          color: COLORS.ink,
          anchor: 'end',
          align: 'right',
          font: { weight: 'bold', size: 14 },
          formatter: (val: any) => val + '%'
        }
      }
    }
  };

  return buildQuickChartUrl(config);
}

export function generateHookChartUrl(analysis: any) {
  const ratings = analysis.post_ratings || [];
  const labels = ratings.map((r: any, i: number) => `Post ${r.post_index !== undefined ? r.post_index + 1 : i + 1}`);
  const scores = ratings.map((r: any) => r.hook_score || 0);

  const bgColors = scores.map((s: number) => {
    if (s >= 7) return COLORS.green;
    if (s >= 4) return COLORS.yellow;
    return COLORS.red;
  });

  const config = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hook Score',
        data: scores,
        backgroundColor: bgColors
      }]
    },
    options: {
      legend: { display: false },
      title: { display: true, text: 'Hook Strength by Post (Target: 7+)', fontSize: 20, fontColor: COLORS.ink, fontStyle: 'bold' },
      scales: {
        yAxes: [{ ticks: { min: 0, max: 10, fontSize: 16, fontColor: COLORS.ink }, gridLines: { color: COLORS.grid } }],
        xAxes: [{ ticks: { fontSize: 14, fontColor: COLORS.ink, fontStyle: 'bold' }, gridLines: { display: false } }]
      },
      annotation: {
        annotations: [{
          type: 'line', mode: 'horizontal', scaleID: 'y-axis-0', value: 7,
          borderColor: COLORS.primary, borderWidth: 3, borderDash: [5, 5],
          label: { enabled: true, content: 'Target (7)', position: 'right', backgroundColor: COLORS.primary }
        }]
      },
      plugins: {
        datalabels: {
          display: true,
          color: COLORS.ink,
          anchor: 'end',
          align: 'top',
          font: { weight: 'bold', size: 14 }
        }
      }
    }
  };

  return buildQuickChartUrl(config);
}

export function generateBenchmarkChartUrl(analysis: any) {
  const bm = analysis.benchmarks || {};
  const labels = ['Engagement Rate (%)', 'Posts Per Week', 'Hook Score Avg'];
  
  const yours = [bm.your_engagement_rate || 0, bm.your_posts_per_week || 0, bm.your_hook_avg || 0];
  const medians = [bm.median_engagement_rate || 0, bm.median_posts_per_week || 0, bm.median_hook_avg || 0];
  const top10s = [bm.top_10_engagement_rate || 0, bm.top_10_posts_per_week || 0, bm.top_10_hook_avg || 0];

  const config = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'You', data: yours, backgroundColor: COLORS.primary },
        { label: 'Median', data: medians, backgroundColor: COLORS.ash },
        { label: 'Top 10%', data: top10s, backgroundColor: COLORS.green }
      ]
    },
    options: {
      legend: { position: 'bottom', labels: { fontSize: 16, fontColor: COLORS.ink } },
      title: { display: true, text: 'Your Performance vs Industry Benchmarks', fontSize: 20, fontColor: COLORS.ink, fontStyle: 'bold' },
      scales: {
        yAxes: [{ ticks: { fontSize: 16, fontColor: COLORS.ink }, gridLines: { color: COLORS.grid } }],
        xAxes: [{ ticks: { fontSize: 16, fontColor: COLORS.ink, fontStyle: 'bold' }, gridLines: { display: false } }]
      },
      plugins: {
        datalabels: {
          display: true,
          color: COLORS.ink,
          anchor: 'end',
          align: 'top',
          font: { weight: 'bold', size: 12 },
          formatter: (val: any) => Number(val).toFixed(1)
        }
      }
    }
  };

  return buildQuickChartUrl(config);
}

export async function fetchChartBuffers(analysis: any): Promise<Record<string, Buffer>> {
  const urls = {
    radar: generateRadarChartUrl(analysis),
    pillars: generatePillarChartUrl(analysis),
    hooks: generateHookChartUrl(analysis),
    benchmarks: generateBenchmarkChartUrl(analysis),
  };

  const buffers: Record<string, Buffer> = {};
  for (const [key, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        buffers[key] = Buffer.from(arrayBuffer);
      }
    } catch (e) {
      console.error(`Failed to fetch ${key} chart: `, e);
    }
  }
  return buffers;
}
