class Experiment {
  constructor(config) {
    this.distances = config.distances;
    this.widths = config.widths;
    this.repeats = config.repeats;
    this.practiceCount = config.practice;
    this.trials = [];
    this.results = [];
    this.currentIndex = 0;
    this.phase = 'practice';
    this.state = 'waiting-start';
    this.startTime = 0;
    this._generateTrials();
  }

  _generateTrials() {
    const conditions = [];
    for (const d of this.distances) {
      for (const w of this.widths) {
        for (let i = 0; i < this.repeats; i++) {
          conditions.push({ d, w });
        }
      }
    }
    this._shuffle(conditions);

    const practice = [];
    for (let i = 0; i < this.practiceCount; i++) {
      const d = this.distances[Math.floor(Math.random() * this.distances.length)];
      const w = this.widths[Math.floor(Math.random() * this.widths.length)];
      practice.push({ d, w, practice: true });
    }

    this.trials = [
      ...practice,
      ...conditions.map(c => ({ ...c, practice: false }))
    ];
    this.mainCount = conditions.length;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  get currentTrial() {
    return this.trials[this.currentIndex] || null;
  }

  get progress() {
    if (!this.currentTrial) return { phase: 'done', current: 0, total: 0 };
    const isPractice = this.currentTrial.practice;
    if (isPractice) {
      const practiceDone = this.currentIndex;
      return { phase: '練習', current: practiceDone + 1, total: this.practiceCount };
    }
    const mainIndex = this.currentIndex - this.practiceCount;
    return { phase: '本番', current: mainIndex + 1, total: this.mainCount };
  }

  get done() {
    return this.currentIndex >= this.trials.length;
  }

  beginTrial() {
    this.state = 'waiting-click';
    this.startTime = performance.now();
  }

  recordClick(x, y, targetX, targetY, targetW) {
    const mt = performance.now() - this.startTime;
    const trial = this.currentTrial;
    const dx = x - targetX;
    const dy = y - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hit = dist <= targetW / 2;

    if (!trial.practice) {
      this.results.push({
        d: trial.d,
        w: trial.w,
        id: Math.log2(trial.d / trial.w + 1),
        mt,
        hit,
        clickX: x,
        clickY: y,
        targetX,
        targetY,
      });
    }

    this.currentIndex++;
    this.state = 'waiting-start';
    return { mt, hit };
  }
}
