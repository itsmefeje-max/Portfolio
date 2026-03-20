export class ISSService {
  constructor() {
    this.history = [];
    this.updateInterval = 5000;
    this.timerId = null;
    this.isReady = false;
    this.lastError = null;
  }

  async start() {
    if (this.timerId) return;
    await this.fetchData();
    this.timerId = window.setInterval(() => {
      void this.fetchData();
    }, this.updateInterval);
  }

  stop() {
    if (!this.timerId) return;
    window.clearInterval(this.timerId);
    this.timerId = null;
  }

  async fetchData() {
    try {
      const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!response.ok) {
        throw new Error(`ISS response failed with ${response.status}`);
      }

      const data = await response.json();
      const entry = {
        lat: Number(data.latitude) || 0,
        lon: Number(data.longitude) || 0,
        alt: Number(data.altitude) || 408,
        vel: Number(data.velocity) || 27600,
        visibility: data.visibility || 'daylight',
        timestamp: Date.now()
      };

      this.history.push(entry);
      if (this.history.length > 360) {
        this.history.shift();
      }

      this.isReady = true;
      this.lastError = null;
    } catch (error) {
      this.lastError = error;
      console.error('ISSService: failed to fetch telemetry.', error);
    }
  }

  getPosition() {
    if (this.history.length === 0) {
      return { lat: 0, lon: 0, alt: 408, vel: 27600, visibility: 'unknown' };
    }

    if (this.history.length === 1) {
      return this.history[0];
    }

    const now = Date.now();
    const last = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 2];
    const dt = Math.max(1, last.timestamp - prev.timestamp);
    const ratio = Math.min((now - last.timestamp) / dt, 3);

    let dLon = last.lon - prev.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;

    let lon = last.lon + dLon * ratio;
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    return {
      lat: last.lat + (last.lat - prev.lat) * ratio,
      lon,
      alt: Math.max(380, last.alt + (last.alt - prev.alt) * ratio),
      vel: last.vel,
      visibility: last.visibility,
      timestamp: last.timestamp
    };
  }

  getHistory() {
    return this.history;
  }

  getStatus() {
    if (this.isReady) return this.lastError ? 'Degraded' : 'Live';
    if (this.lastError) return 'Offline';
    return 'Syncing';
  }
}
