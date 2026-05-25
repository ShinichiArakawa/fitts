(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const CIRCLE_RADIUS = 12.5;
  const CIRCLE_DISTANCE = 500;

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
  }

  // --- Chip logic ---
  $$('.chip-group.single').forEach(group => {
    group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  function getSelectedValue(param) {
    const chip = $(`[data-param="${param}"] .chip.selected`);
    return chip ? Number(chip.dataset.value) : null;
  }

  // --- Experiment state ---
  let studentId = '';
  let targetClicks = 20;
  let clickCount = 0;
  let missCount = 0;
  let activeTarget = 0; // 0 = left, 1 = right
  let startTime = 0;
  let started = false;

  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');

  let circleL = null;
  let circleR = null;

  function resizeCanvas() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    calcCirclePositions();
  }

  function calcCirclePositions() {
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    circleL = { x: cx - CIRCLE_DISTANCE / 2, y: cy };
    circleR = { x: cx + CIRCLE_DISTANCE / 2, y: cy };
  }

  function drawCircle(x, y, isActive) {
    ctx.beginPath();
    ctx.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ff6b6b' : '#3a3f52';
    ctx.fill();
    ctx.strokeStyle = isActive ? '#ff8787' : '#4a5068';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function render() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (!circleL || !circleR) return;

    drawCircle(circleL.x, circleL.y, activeTarget === 0);
    drawCircle(circleR.x, circleR.y, activeTarget === 1);
  }

  function updateHUD() {
    $('#hud-progress').textContent = `${clickCount} / ${targetClicks}`;
    $('#hud-miss').textContent = `ミス: ${missCount}`;
  }

  function isInsideCircle(mx, my, circle) {
    const dx = mx - circle.x;
    const dy = my - circle.y;
    return dx * dx + dy * dy <= CIRCLE_RADIUS * CIRCLE_RADIUS;
  }

  canvas.addEventListener('click', e => {
    if (clickCount >= targetClicks) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const target = activeTarget === 0 ? circleL : circleR;

    if (isInsideCircle(mx, my, target)) {
      if (!started) {
        started = true;
        startTime = performance.now();
      }
      clickCount++;
      activeTarget = activeTarget === 0 ? 1 : 0;
      updateHUD();
      render();

      if (clickCount >= targetClicks) {
        const elapsed = performance.now() - startTime;
        setTimeout(() => showResults(elapsed), 300);
      }
    } else {
      if (started) {
        missCount++;
        updateHUD();
      }
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    render();
  });

  // --- Start ---
  $('#btn-start').addEventListener('click', () => {
    studentId = $('#input-id').value.trim();
    if (!studentId) {
      $('#input-id').focus();
      $('#input-id').style.borderColor = '#ff6b6b';
      return;
    }
    targetClicks = getSelectedValue('clicks') || 20;
    clickCount = 0;
    missCount = 0;
    activeTarget = 0;
    started = false;
    startTime = 0;

    showScreen('experiment');
    resizeCanvas();
    updateHUD();
    render();
  });

  $('#input-id').addEventListener('input', () => {
    $('#input-id').style.borderColor = '';
  });

  // --- Results ---
  function showResults(elapsedMs) {
    showScreen('results');
    const sec = (elapsedMs / 1000).toFixed(2);
    $('#stat-student-id').textContent = studentId;
    $('#stat-miss').textContent = missCount;
    $('#stat-time').textContent = `${sec} 秒`;
  }

  $('#btn-csv').addEventListener('click', () => {
    const sec = $('#stat-time').textContent.replace(' 秒', '');
    const csv = '学籍番号,ミス回数,所要時間(秒)\n' + `${studentId},${missCount},${sec}`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitts_${studentId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#btn-retry').addEventListener('click', () => {
    showScreen('top');
  });
})();
