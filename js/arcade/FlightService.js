export class FlightService {
  constructor() {
    this.flights = [];
    this.lastUpdate = Date.now();
    this.lastFetch = 0;
    this.FETCH_INTERVAL = 20000; // 20 seconds
    this.isFetching = false;
    this.init();
  }

  init() {
     this.fetchFlights();
  }

  async fetchFlights() {
    const now = Date.now();
    // Prevent overlapping fetches or too frequent fetches
    if (this.isFetching || (now - this.lastFetch < this.FETCH_INTERVAL && this.flights.length > 0)) {
        return;
    }

    this.isFetching = true;
    try {
        const response = await fetch('https://opensky-network.org/api/states/all');
        if (!response.ok) {
            throw new Error(`OpenSky API Error: ${response.status}`);
        }
        const data = await response.json();
        this.processData(data.states);
        this.lastFetch = Date.now();
    } catch (error) {
        console.error("FlightService Fetch Error:", error);
    } finally {
        this.isFetching = false;
    }
  }

  processData(states) {
      if (!states) return;

      const newFlights = [];
      // Dynamic limit based on device performance
      const isMobile = window.innerWidth < 768;
      const limit = isMobile ? 2500 : 10000;

      let count = 0;
      for (const s of states) {
          if (count >= limit) break;

          // s[0]: icao24 (string)
          // s[1]: callsign (string)
          // s[5]: longitude (float)
          // s[6]: latitude (float)
          // s[7]: baro_altitude (float)
          // s[8]: on_ground (boolean)
          // s[9]: velocity (float)
          // s[10]: true_track (float)
          // s[13]: geo_altitude (float)

          // Filter on_ground
          if (s[8]) continue;

          // Check coordinates
          if (s[5] === null || s[6] === null) continue;

          const icao = s[0];
          const callsign = s[1] ? s[1].trim() : icao;
          const lat = s[6];
          const lon = s[5];
          const alt = s[7] !== null ? s[7] : s[13];
          const speed = s[9] !== null ? s[9] * 3.6 : 0; // m/s to km/h
          const heading = s[10] !== null ? s[10] : 0;

          if (alt === null) continue;

          // Use callsign (or icao) as the airline identifier to replace fake names
          const airline = callsign || icao;

          // Use callsign or icao as ID
          const id = callsign || icao;

          newFlights.push({
              id: id,
              lat: lat,
              lon: lon,
              alt: alt,
              speed: speed,
              heading: heading,
              airline: airline
          });
          count++;
      }
      this.flights = newFlights;
  }

  getFlights() {
    const now = Date.now();

    // Trigger fetch if needed
    if (now - this.lastFetch > this.FETCH_INTERVAL) {
        this.fetchFlights();
    }

    // Interpolate
    // Only update if time passed
    if (now - this.lastUpdate > 16) {
        const dt = (now - this.lastUpdate) / 1000;
        this.updateFlights(dt);
        this.lastUpdate = now;
    }

    return this.flights;
  }

  updateFlights(dt) {
      for(const f of this.flights) {
        // Simple linear extrapolation
        // 1 deg lat ~ 111km
        const dist = (f.speed / 3600) * dt; // km
        const distDeg = dist / 111;

        const rad = (90 - f.heading) * (Math.PI / 180);
        const dLat = distDeg * Math.sin(rad);
        const dLon = distDeg * Math.cos(rad);

        f.lat += dLat;
        f.lon += dLon;

        // Wrap around
        if (f.lon > 180) f.lon -= 360;
        if (f.lon < -180) f.lon += 360;
        if (f.lat > 90) f.lat = 90 - (f.lat - 90);
        if (f.lat < -90) f.lat = -90 - (f.lat + 90);
      }
  }
}
