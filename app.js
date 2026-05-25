(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

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
  let circleRadius = 12.5;
  let circleDiameter = 25;
  let targetClicks = 20;
  let clickCount = 0;
  let missCount = 0;
  let activeTarget = 0;
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
    ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ff6b6b' : '#3a3f52';
    ctx.fill();
    ctx.strokeStyle = isActive ? '#ff8787' : '#4a5068';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
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
    return dx * dx + dy * dy <= circleRadius * circleRadius;
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
    circleDiameter = getSelectedValue('size') || 25;
    circleRadius = circleDiameter / 2;
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
  let lastElapsed = 0;

  function showResults(elapsedMs) {
    lastElapsed = elapsedMs;
    const sec = (elapsedMs / 1000).toFixed(2);
    showScreen('results');
    $('#stat-student-id').textContent = studentId;
    $('#stat-size').textContent = `${circleDiameter}px`;
    $('#stat-miss').textContent = missCount;
    $('#stat-time').textContent = `${sec} 秒`;

    saveToSheet(sec);
  }

  // --- Save to Google Sheets ---
  function saveToSheet(sec) {
    const status = $('#save-status');
    if (!CONFIG.GAS_URL) {
      status.textContent = '※ スプレッドシート未設定';
      status.className = 'save-status warn';
      return;
    }

    status.textContent = '保存中...';
    status.className = 'save-status saving';

    const data = {
      studentId,
      size: circleDiameter,
      clicks: targetClicks,
      miss: missCount,
      time: sec,
      timestamp: new Date().toISOString(),
    };

    fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(() => {
        status.textContent = '保存しました';
        status.className = 'save-status success';
      })
      .catch(() => {
        status.textContent = '保存に失敗しました';
        status.className = 'save-status error';
      });
  }

  // --- Sheet link ---
  $('#btn-sheet').addEventListener('click', () => {
    if (CONFIG.SHEET_URL) {
      window.open(CONFIG.SHEET_URL, '_blank');
    } else {
      alert('スプレッドシートURLが設定されていません');
    }
  });

  // --- CSV ---
  $('#btn-csv').addEventListener('click', () => {
    const sec = (lastElapsed / 1000).toFixed(2);
    const csv = '学籍番号,サイズ(px),クリック回数,ミス回数,所要時間(秒)\n'
      + `${studentId},${circleDiameter},${targetClicks},${missCount},${sec}`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitts_${studentId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Retry ---
  $('#btn-retry').addEventListener('click', () => {
    showScreen('top');
  });
})();
