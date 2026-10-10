(function (root) {
  "use strict";
  const FP = (root.FP = root.FP || {}),
    rad = Math.PI / 180;
  // R = Rz(alpha) Rx(beta) Ry(gamma). Third row is world-up in device coordinates.
  // Rotate x/y by the display angle; alpha (compass heading) is deliberately unused.
  FP.gravity = (beta, gamma, angle = 0) => {
    if (![beta, gamma, angle].every(Number.isFinite)) return null;
    const b = beta * rad,
      g = gamma * rad,
      a = angle * rad,
      x = -Math.cos(b) * Math.sin(g),
      y = Math.sin(b),
      z = Math.cos(b) * Math.cos(g);
    return [
      Math.cos(a) * x - Math.sin(a) * y,
      Math.sin(a) * x + Math.cos(a) * y,
      z,
    ];
  };
  class Gesture {
    constructor({ emit = () => {}, rotation = () => {}, invert = false } = {}) {
      this.emit = emit;
      this.rotation = rotation;
      this.invert = invert;
      this.reset();
    }
    reset() {
      this.neutral = null;
      this.calibration = [];
      this.armed = false;
      this.lastAction = -Infinity;
      this.lastTime = -Infinity;
      this.candidate = null;
      this.neutralSince = null;
      this.angle = null;
      this.smooth = null;
      this.pitch = 0;
      this.lastVector = null;
    }
    disarm() {
      this.armed = false;
      this.candidate = null;
      this.neutralSince = null;
    }
    calibrate() {
      this.reset();
    }
    sample({ beta, gamma, angle = 0, t }) {
      const v = FP.gravity(beta, gamma, angle);
      if (!v || !Number.isFinite(t) || t <= this.lastTime) return false;
      angle = ((angle % 360) + 360) % 360;
      if (this.angle !== null && angle !== this.angle) {
        this.reset();
        this.angle = angle;
        this.rotation();
        return false;
      }
      this.angle = angle;
      if (this.lastVector) {
        const dot = Math.max(
            -1,
            Math.min(
              1,
              v.reduce((s, n, i) => s + n * this.lastVector[i], 0),
            ),
          ),
          jump = Math.acos(dot) / rad;
        if (jump > 30 + Math.max(0, t - this.lastTime) * 0.9) return false;
      }
      const dt = this.lastTime === -Infinity ? 100 : t - this.lastTime;
      this.lastTime = t;
      this.lastVector = v;
      if (!this.neutral) {
        if (Math.abs(v[1]) < 0.45) {
          this.calibration = [];
          return false;
        }
        if (
          this.calibration.length &&
          Math.acos(
            Math.max(
              -1,
              Math.min(
                1,
                v.reduce((s, n, i) => s + n * this.calibration[0].v[i], 0),
              ),
            ),
          ) /
            rad >
            8
        )
          this.calibration = [];
        this.calibration.push({ v, t });
        if (t - this.calibration[0].t < 500) return false;
        const avg = [0, 1, 2].map(
            (i) =>
              this.calibration.reduce((n, s) => n + s.v[i], 0) /
              this.calibration.length,
          ),
          len = Math.hypot(...avg);
        this.neutral = avg.map((n) => n / len);
        this.smooth = 0;
        this.armed = true;
        this.emit("neutral");
        return true;
      }
      const ny = this.neutral[1],
        nz = this.neutral[2];
      let pitch =
        Math.atan2(
          (v[2] * ny - v[1] * nz) * Math.sign(ny),
          v[1] * ny + v[2] * nz,
        ) / rad;
      if (this.invert) pitch = -pitch;
      // Circular low-pass interpolation avoids an Euler / ±180 discontinuity.
      const delta = ((pitch - this.smooth + 540) % 360) - 180;
      this.smooth += delta * (1 - Math.exp(-dt / 100));
      this.pitch = ((this.smooth + 540) % 360) - 180;
      pitch = this.pitch;
      if (Math.abs(pitch) <= 15) {
        this.candidate = null;
        if (this.neutralSince === null) this.neutralSince = t;
        if (
          !this.armed &&
          t - this.neutralSince >= 150 &&
          t - this.lastAction >= 650
        ) {
          this.armed = true;
          this.emit("neutral");
        }
        return true;
      }
      this.neutralSince = null;
      if (!this.armed) return true;
      const action = pitch <= -45 ? "correct" : pitch >= 45 ? "pass" : null;
      if (!action) {
        this.candidate = null;
        return true;
      }
      if (!this.candidate || this.candidate.action !== action) {
        this.candidate = { action, t };
        return true;
      }
      if (t - this.candidate.t >= 100 && t - this.lastAction >= 650) {
        this.lastAction = t;
        this.disarm();
        this.emit(action);
      }
      return true;
    }
  }
  FP.Gesture = Gesture;
})(globalThis);
