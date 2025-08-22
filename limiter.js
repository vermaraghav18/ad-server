// limiter.js
class Limiter {
  constructor(max = 6) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }
  async run(fn) {
    if (this.active >= this.max) {
      await new Promise(res => this.queue.push(res));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      if (this.queue.length) this.queue.shift()();
    }
  }
}
module.exports = (max = 6) => new Limiter(max);
