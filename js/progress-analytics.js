(function () {
  "use strict";

  const store = App.store;
  const utils = App.utils;
  const el = App.el;
  const icon = App.icon;

  // Time range constants
  const TIME_RANGES = [
    { id: '7d', label: '7 days', days: 7 },
    { id: '30d', label: '30 days', days: 30 },
    { id: '90d', label: '90 days', days: 90 },
    { id: 'all', label: 'All time', days: null }
  ];

  // Chart data helpers
  function getWorkoutFrequencyData(sessions, range) {
    const now = new Date();
    const startDate = range.days ? new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000) : utils.daysAgo(365);
    
    // Group sessions by date
    const dateMap = {};
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= startDate) {
        const dateStr = sessionDate.toISOString().split('T')[0];
        if (!dateMap[dateStr]) dateMap[dateStr] = 0;
        dateMap[dateStr]++;
      }
    });
    
    // Create ordered data points
    const data = [];
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      data.push({
        label: dateStr,
        value: dateMap[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  function getDurationData(sessions, range) {
    const now = new Date();
    const startDate = range.days ? new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000) : utils.daysAgo(365);
    
    // Group sessions by date
    const dateMap = {};
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= startDate) {
        const dateStr = sessionDate.toISOString().split('T')[0];
        if (!dateMap[dateStr]) dateMap[dateStr] = 0;
        dateMap[dateStr] += session.duration || 0;
      }
    });
    
    // Create ordered data points
    const data = [];
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      data.push({
        label: dateStr,
        value: dateMap[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  function getCategoryDistribution(sessions) {
    const categoryMap = {};
    sessions.forEach(session => {
      const workout = utils.workoutById(session.workoutId);
      if (workout && workout.category) {
        if (!categoryMap[workout.category]) categoryMap[workout.category] = 0;
        categoryMap[workout.category]++;
      }
    });
    
    return Object.keys(categoryMap).map(category => ({
      label: category,
      value: categoryMap[category],
      color: getCategoryColor(category)
    }));
  }

  function getCategoryColor(category) {
    const colors = {
      'Strength': '#6757E8',
      'Cardio': '#26966B',
      'Mobility': '#E8A23B',
      'Endurance': '#D95363'
    };
    return colors[category] || '#6757E8';
  }

  function getPersonalRecords(sessions) {
    const records = [];
    const workoutMap = {};
    
    // Group sessions by workout ID
    sessions.forEach(session => {
      if (!workoutMap[session.workoutId]) workoutMap[session.workoutId] = [];
      workoutMap[session.workoutId].push(session);
    });
    
    // Find best session for each workout (by calories)
    Object.keys(workoutMap).forEach(workoutId => {
      const workoutSessions = workoutMap[workoutId];
      if (workoutSessions.length > 0) {
        const bestSession = workoutSessions.reduce((best, current) => 
          (current.calories || 0) > (best.calories || 0) ? current : best
        );
        records.push(bestSession);
      }
    });
    
    // Sort by calories descending
    records.sort((a, b) => (b.calories || 0) - (a.calories || 0));
    
    return records.slice(0, 5); // Top 5 records
  }

  function getRecentActivity(sessions, count = 10) {
    return sessions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, count);
  }

  function getComparisonData(sessions) {
    const now = new Date();
    const currentPeriodStart = utils.weekStart(now);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - 7 * 864e5);
    
    // Count sessions in each period
    let currentCount = 0;
    let previousCount = 0;
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= currentPeriodStart && sessionDate < new Date(currentPeriodStart.getTime() + 7 * 864e5)) {
        currentCount++;
      } else if (sessionDate >= previousPeriodStart && sessionDate < currentPeriodStart) {
        previousCount++;
      }
    });
    
    return {
      current: currentCount,
      previous: previousCount,
      change: currentCount - previousCount
    };
  }

  // Chart rendering functions
  function renderWorkoutFrequencyChart(container, data) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty__icon">📊</div><p>No workout data available yet.</p></div>';
      return;
    }
    
    App.chart.bar(container, {
      label: "Workout frequency over time",
      data: data.map(d => ({
        label: d.label,
        value: d.value,
        short: new Date(d.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
    });
  }

  function renderDurationChart(container, data) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty__icon">⏱️</div><p>No duration data available yet.</p></div>';
      return;
    }
    
    App.chart.line(container, {
      label: "Training duration over time",
      data: data.map(d => ({
        label: d.label,
        value: d.value,
        suffix: ' min'
      }))
    });
  }

  function renderCategoryDistributionChart(container, data) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty"><div class="empty__icon">🎯</div><p>No category data available yet.</p></div>';
      return;
    }
    
    App.chart.donut(container, {
      label: "Workout category distribution",
      data: data,
      centerValue: data.reduce((sum, d) => sum + d.value, 0),
      centerLabel: "Sessions"
    });
  }

  // Main render function
  function renderAnalytics() {
    const page = document.getElementById('page-root');
    if (!page) return;
    
    const state = store.get();
    const sessions = state.sessions || [];
    const workouts = state.workouts || [];
    
    // Default to 30 days range
    let selectedRange = TIME_RANGES[1];
    const savedRange = localStorage.getItem('analytics-time-range');
    if (savedRange) {
      const range = TIME_RANGES.find(r => r.id === savedRange);
      if (range) selectedRange = range;
    }
    
    // Get data for charts
    const workoutFrequencyData = getWorkoutFrequencyData(sessions, selectedRange);
    const durationData = getDurationData(sessions, selectedRange);
    const categoryDistribution = getCategoryDistribution(sessions);
    const personalRecords = getPersonalRecords(sessions);
    const recentActivity = getRecentActivity(sessions);
    const comparison = getComparisonData(sessions);
    
    // Time range selector
    const timeRangeSelector = el('div', { 'class': 'row row-between mb-4' }, [
      el('h2', { 'class': 'text-lg' }, 'Progress Analytics'),
      el('div', { 'class': 'chips' }, TIME_RANGES.map(range => {
        return el('button', {
          'class': 'chip' + (range.id === selectedRange.id ? ' is-active' : ''),
          'data-range': range.id,
          onclick: () => {
            localStorage.setItem('analytics-time-range', range.id);
            renderAnalytics();
          }
        }, range.label);
      }))
    ]);
    
    // Comparison card
    const comparisonCard = el('div', { 'class': 'card mb-6' }, [
      el('div', { 'class': 'card__head' }, [
        el('h3', { 'class': 'card__title' }, 'Weekly Comparison')
      ]),
      el('div', { 'class': 'grid grid-2' }, [
        el('div', { 'class': 'stack' }, [
          el('div', { 'class': 'text-sm text-2' }, 'Current Period'),
          el('div', { 'class': 'num' }, comparison.current),
          el('div', { 'class': 'text-sm text-2' }, 'sessions')
        ]),
        el('div', { 'class': 'stack' }, [
          el('div', { 'class': 'text-sm text-2' }, 'Previous Period'),
          el('div', { 'class': 'num' }, comparison.previous),
          el('div', { 'class': 'text-sm text-2' }, 'sessions')
        ])
      ]),
      el('div', { 'class': 'mt-2' }, [
        el('span', { 'class': 'badge' + (comparison.change >= 0 ? ' badge--success' : ' badge--danger') },
          comparison.change > 0 ? `+${comparison.change}` : `${comparison.change}`
        ),
        el('span', { 'class': 'text-sm text-2 ml-2' }, 
          comparison.change > 0 ? 'sessions more this week' : 'sessions less this week'
        )
      ])
    ]);
    
    // Charts grid
    const chartsGrid = el('div', { 'class': 'grid grid-2 mb-6' }, [
      el('div', { 'class': 'card' }, [
        el('div', { 'class': 'card__head' }, [
          el('h3', { 'class': 'card__title' }, 'Workout Frequency')
        ]),
        el('div', { 'class': 'card__body' }, [
          el('div', { 'class': 'chart-container', id: 'frequency-chart' })
        ])
      ]),
      el('div', { 'class': 'card' }, [
        el('div', { 'class': 'card__head' }, [
          el('h3', { 'class': 'card__title' }, 'Training Duration')
        ]),
        el('div', { 'class': 'card__body' }, [
          el('div', { 'class': 'chart-container', id: 'duration-chart' })
        ])
      ]),
      el('div', { 'class': 'card' }, [
        el('div', { 'class': 'card__head' }, [
          el('h3', { 'class': 'card__title' }, 'Workout Categories')
        ]),
        el('div', { 'class': 'card__body' }, [
          el('div', { 'class': 'chart-container', id: 'category-chart' })
        ])
      ])
    ]);
    
    // Personal records section
    const recordsSection = el('div', { 'class': 'card mb-6' }, [
      el('div', { 'class': 'card__head' }, [
        el('h3', { 'class': 'card__title' }, 'Personal Records')
      ]),
      el('div', { 'class': 'card__body' }, [
        personalRecords.length > 0 ? 
          el('table', { 'class': 'table' }, [
            el('thead', {}, [
              el('tr', {}, [
                el('th', {}, 'Workout'),
                el('th', {}, 'Calories'),
                el('th', {}, 'Duration')
              ])
            ]),
            el('tbody', {}, personalRecords.map(record => {
              const workout = utils.workoutById(record.workoutId);
              return el('tr', {}, [
                el('td', {}, workout ? workout.name : 'Unknown'),
                el('td', {}, record.calories),
                el('td', {}, record.duration + ' min')
              ]);
            }))
          ]) : 
          el('div', { 'class': 'empty' }, [
            el('div', { 'class': 'empty__icon' }, '🏆'),
            el('p', {}, 'No personal records yet. Complete more workouts to set new records!')
          ])
      ])
    ]);
    
    // Recent activity table
    const recentActivitySection = el('div', { 'class': 'card' }, [
      el('div', { 'class': 'card__head' }, [
        el('h3', { 'class': 'card__title' }, 'Recent Activity')
      ]),
      el('div', { 'class': 'card__body' }, [
        recentActivity.length > 0 ? 
          el('table', { 'class': 'table' }, [
            el('thead', {}, [
              el('tr', {}, [
                el('th', {}, 'Workout'),
                el('th', {}, 'Date'),
                el('th', {}, 'Duration'),
                el('th', {}, 'Calories')
              ])
            ]),
            el('tbody', {}, recentActivity.map(session => {
              const workout = utils.workoutById(session.workoutId);
              return el('tr', {}, [
                el('td', {}, workout ? workout.name : 'Unknown'),
                el('td', {}, App.relativeTime(session.date)),
                el('td', {}, session.duration + ' min'),
                el('td', {}, session.calories)
              ]);
            }))
          ]) : 
          el('div', { 'class': 'empty' }, [
            el('div', { 'class': 'empty__icon' }, '📅'),
            el('p', {}, 'No recent activity yet. Start your first workout to see it here!')
          ])
      ])
    ]);
    
    // Assemble page
    const content = el('div', {}, [
      timeRangeSelector,
      comparisonCard,
      chartsGrid,
      recordsSection,
      recentActivitySection
    ]);
    
    page.innerHTML = '';
    page.appendChild(content);
    
    // Render charts after DOM update
    setTimeout(() => {
      renderWorkoutFrequencyChart(document.getElementById('frequency-chart'), workoutFrequencyData);
      renderDurationChart(document.getElementById('duration-chart'), durationData);
      renderCategoryDistributionChart(document.getElementById('category-chart'), categoryDistribution);
    }, 0);
  }

  // Initialize page
  document.addEventListener('DOMContentLoaded', () => {
    renderAnalytics();
    
    // Subscribe to store changes
    store.subscribe(renderAnalytics);
  });
})();