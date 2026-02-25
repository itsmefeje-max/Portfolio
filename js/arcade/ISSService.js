
export class ISSService {
  constructor() {
    this.history = [];
    this.updateInterval = 5000;
    this.isReady = false;
  }

  async start() {
    await this.fetchData();
    setInterval(() => this.fetchData(), this.updateInterval);
  }

  async fetchData() {
    try {
      const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!response.ok) return;
      const data = await response.json();

      const entry = {
        lat: data.latitude,
        lon: data.longitude,
        alt: data.altitude,
        vel: data.velocity,
        timestamp: Date.now()
      };

      this.history.push(entry);
      // Keep track history (approx 20 mins at 5s interval = 240 points)
      if (this.history.length > 250) this.history.shift();

      this.isReady = true;
    } catch (e) {
      console.error("ISS API Error", e);
    }
  }

  getPosition() {
    if (this.history.length === 0) return { lat: 0, lon: 0, alt: 400, vel: 0 };
    if (this.history.length === 1) return this.history[0];

    const now = Date.now();
    const pLast = this.history[this.history.length - 1];
    const pPrev = this.history[this.history.length - 2];

    const dt = pLast.timestamp - pPrev.timestamp;
    const timeSinceLast = now - pLast.timestamp;

    if (dt <= 0) return pLast;

    // Extrapolate
    const ratio = timeSinceLast / dt;

    // Clamp extrapolation to avoid wild jumps if network is down for too long.
    // Instead of snapping back, we cap the ratio so the object stops at the last valid prediction.
    const effectiveRatio = Math.min(ratio, 5.0);

    // Unwind longitude for correct wrapping
    let dLon = pLast.lon - pPrev.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;

    let lat = pLast.lat + (pLast.lat - pPrev.lat) * effectiveRatio;
    let lon = pLast.lon + dLon * effectiveRatio;
    let alt = pLast.alt + (pLast.alt - pPrev.alt) * effectiveRatio;

    // Wrap longitude result
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    return { lat, lon, alt, vel: pLast.vel };
  }

  getHistory() {
    return this.history;
  }
}
