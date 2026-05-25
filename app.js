(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // --- Screen management ---
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
  }

  // --- Settings chip logic ---
  function getSelectedValues(param) {
    const chips = $$(`[data-param="${param}"] .chip.selected`);
    return Array.from(chips).map(c => Number(c.dataset.value));
  }

  function updateTrialInfo() {
    const d = getSelectedValues('distances').length || 1;
    const w = getSelectedValues('widths').length || 1;
    const r = getSelectedValues('repeats')[0] || 5;
    const p = getSelectedValues('practice')[0] || 0;
    const main = d * w * r;
    $('#main-trials').textContent = main;
    $('#practice-trials').textContent = p;
    $('#total-trials').textContent = main + p;
  }

  $$('.chip-group').forEach(group => {
    const isSingle = group.classList.contains('single');
    group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      if (isSingle) {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      } else {
        chip.classList.toggle('selected');
      }
      updateTrialInfo();
    });
  });

  // --- Canvas rendering ---
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  let experiment = null;
  let startCircle = null;
  let targetCircle = null;
  let feedbackTimer = null;
  let pendingTarget = null;

  function resizeCanvas() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function drawCircle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function render() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (!experiment || experiment.done) return;

    if (experiment.state === 'waiting-start') {
      const cx = w / 2;
      const cy = h / 2;
      startCircle = { x: cx, y: cy, r: 20 };
      drawCircle(cx, cy, 20, '#6c8cff', '#8ba3ff');

      ctx.fillStyle = '#8b8fa3';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('クリックしてスタート', cx, cy + 40);
      targetCircle = null;
    } else if (experiment.state === 'waiting-click') {
      if (pendingTarget) {
        targetCircle = pendingTarget;
        pendingTarget = null;
      }
      if (targetCircle) {
        startCircle = null;
        drawCircle(targetCircle.x, targetCircle.y, targetCircle.r, '#ff6b6b', '#ff8787');
      }
    }
  }

  function showFeedback(mt, hit) {
    const msg = $('#experiment-msg');
    if (hit) {
      msg.textContent = `${Math.round(mt)} ms`;
      msg.style.color = '#51cf66';
    } else {
      msg.textContent = `ミス — ${Math.round(mt)} ms`;
      msg.style.color = '#ff6b6b';
    }
    msg.classList.add('visible');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      msg.classList.remove('visible');
    }, 600);
  }

  function updateHUD() {
    const p = experiment.progress;
    $('#hud-phase').textContent = p.phase;
    $('#hud-progress').textContent = `${p.current} / ${p.total}`;
  }

  canvas.addEventListener('click', e => {
    if (!experiment || experiment.done) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (experiment.state === 'waiting-start' && startCircle) {
      const dx = mx - startCircle.x;
      const dy = my - startCircle.y;
      if (dx * dx + dy * dy <= startCircle.r * startCircle.r) {
        experiment.beginTrial();
        const trial = experiment.currentTrial;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        const cx = cw / 2;
        const cy = ch / 2;
        const margin = trial.w / 2 + 10;
        let angle, tx, ty;
        do {
          angle = Math.random() * Math.PI * 2;
          tx = cx + Math.cos(angle) * trial.d;
          ty = cy + Math.sin(angle) * trial.d;
        } while (tx - margin < 0 || tx + margin > cw || ty - margin < 0 || ty + margin > ch);
        pendingTarget = { x: tx, y: ty, r: trial.w / 2 };
        updateHUD();
        render();
      }
      return;
    }

    if (experiment.state === 'waiting-click' && targetCircle) {
      const result = experiment.recordClick(mx, my, targetCircle.x, targetCircle.y, targetCircle.r * 2);
      showFeedback(result.mt, result.hit);

      if (experiment.done) {
        setTimeout(() => showResults(), 800);
      } else {
        updateHUD();
        render();
      }
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (experiment && !experiment.done) render();
  });

  // --- Start experiment ---
  $('#btn-start').addEventListener('click', () => {
    const distances = getSelectedValues('distances');
    const widths = getSelectedValues('widths');
    const repeats = getSelectedValues('repeats')[0] || 5;
    const practice = getSelectedValues('practice')[0] || 0;

    if (distances.length === 0 || widths.length === 0) {
      alert('距離と幅を1つ以上選択してください');
      return;
    }

    experiment = new Experiment({ distances, widths, repeats, practice });
    showScreen('experiment');
    resizeCanvas();
    updateHUD();
    render();
  });

  // --- Results ---
  let chartInstance = null;

  function showResults() {
    const summary = Analysis.summarize(experiment.results);
    showScreen('results');

    $('#stat-avg-mt').textContent = `${Math.round(summary.avgMT)} ms`;
    $('#stat-error-rate').textContent = `${(summary.errorRate * 100).toFixed(1)}%`;
    $('#stat-r2').textContent = summary.regression.r2.toFixed(3);
    const a = summary.regression.a.toFixed(0);
    const b = summary.regression.b.toFixed(0);
    $('#stat-equation').textContent = `MT = ${a} + ${b} × ID`;

    const tbody = $('#condition-table tbody');
    tbody.innerHTML = '';
    for (const c of summary.conditions) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.d}</td>
        <td>${c.w}</td>
        <td>${c.id.toFixed(2)}</td>
        <td>${Math.round(c.meanMT)}</td>
        <td>${Math.round(c.sd)}</td>
        <td>${(c.errorRate * 100).toFixed(0)}%</td>
      `;
      tbody.appendChild(tr);
    }

    renderChart(summary);
  }

  function renderChart(summary) {
    if (chartInstance) chartInstance.destroy();

    const ctx2 = $('#chart-fitts').getContext('2d');
    const scatter = summary.allPoints.map(p => ({ x: p.x, y: p.y }));
    const means = summary.conditions.map(c => ({ x: c.id, y: c.meanMT }));

    const { a, b } = summary.regression;
    const xMin = Math.min(...means.map(p => p.x)) - 0.3;
    const xMax = Math.max(...means.map(p => p.x)) + 0.3;
    const regLine = [
      { x: xMin, y: a + b * xMin },
      { x: xMax, y: a + b * xMax },
    ];

    chartInstance = new Chart(ctx2, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '個別試行',
            data: scatter,
            backgroundColor: 'rgba(108, 140, 255, 0.25)',
            borderColor: 'rgba(108, 140, 255, 0.4)',
            pointRadius: 4,
            order: 3,
          },
          {
            label: '条件平均',
            data: means,
            backgroundColor: '#ff6b6b',
            borderColor: '#ff6b6b',
            pointRadius: 7,
            pointStyle: 'rectRot',
            order: 2,
          },
          {
            label: '回帰直線',
            data: regLine,
            type: 'line',
            borderColor: '#51cf66',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#8b8fa3', font: { size: 12 } } },
        },
        scales: {
          x: {
            title: { display: true, text: 'Index of Difficulty (bits)', color: '#8b8fa3' },
            grid: { color: '#2e3345' },
            ticks: { color: '#8b8fa3' },
          },
          y: {
            title: { display: true, text: 'Movement Time (ms)', color: '#8b8fa3' },
            grid: { color: '#2e3345' },
            ticks: { color: '#8b8fa3' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // --- CSV ---
  $('#btn-csv').addEventListener('click', () => {
    const csv = Analysis.toCSV(experiment.results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fitts_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Retry ---
  $('#btn-retry').addEventListener('click', () => {
    experiment = null;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    showScreen('setup');
  });
})();
