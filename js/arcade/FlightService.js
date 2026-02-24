
export class FlightService {
  constructor() {
    this.flights = [];
    this.lastUpdate = Date.now();
    this.init();
  }

  init() {
    // Generate mock flights
    const count = 3000;
    const hubs = [
        { lat: 40.7128, lon: -74.0060 }, // NYC
        { lat: 51.5074, lon: -0.1278 }, // London
        { lat: 35.6762, lon: 139.6503 }, // Tokyo
        { lat: 25.2048, lon: 55.2708 }, // Dubai
        { lat: -33.8688, lon: 151.2093 }, // Sydney
        { lat: 48.8566, lon: 2.3522 }, // Paris
        { lat: 34.0522, lon: -118.2437 }, // LA
        { lat: 1.3521, lon: 103.8198 }, // Singapore
        { lat: 55.7558, lon: 37.6173 }, // Moscow
        { lat: -23.5505, lon: -46.6333 }, // Sao Paulo
        { lat: 22.3193, lon: 114.1694 }, // Hong Kong
        { lat: 50.1109, lon: 8.6821 }, // Frankfurt
        { lat: 39.9042, lon: 116.4074 }, // Beijing
        { lat: 19.4326, lon: -99.1332 }, // Mexico City
        { lat: 28.6139, lon: 77.2090 }  // New Delhi
    ];

    for(let i=0; i<count; i++) {
        const hub = hubs[Math.floor(Math.random() * hubs.length)];
        // Random spread from hub (Gaussian-ish)
        const lat = hub.lat + (Math.random() - 0.5) * 120 * Math.random();
        const lon = hub.lon + (Math.random() - 0.5) * 120 * Math.random();

        this.flights.push({
            id: `FL${Math.floor(Math.random()*9000)+1000}`,
            lat: lat,
            lon: lon,
            alt: 8000 + Math.random() * 4000, // 8-12km
            speed: 700 + Math.random() * 300, // km/h
            heading: Math.random() * 360,
            origin: "UNK",
            dest: "UNK",
            airline: this.getRandomAirline()
        });
    }
  }

  getRandomAirline() {
      const airlines = ["American", "Delta", "United", "British Airways", "Lufthansa", "Emirates", "ANA", "Singapore", "Qantas", "Air France"];
      return airlines[Math.floor(Math.random() * airlines.length)];
  }

  getFlights() {
    const now = Date.now();
    // Always update if requested, assuming 60fps loop calls this
    // But maybe throttle to avoid heavy calc?
    // InstancedMesh update is heavy if count is high.
    // The prompt says "Update interval: 5–10 seconds." for *retrieval*.
    // Movement: "Interpolated smoothly."
    // So I should update positions every frame for smooth movement.

    if (now - this.lastUpdate > 16) { // ~60fps cap
        const dt = (now - this.lastUpdate) / 1000; // seconds
        this.updateFlights(dt);
        this.lastUpdate = now;
    }
    return this.flights;
  }

  updateFlights(dt) {
    // Simple movement: lat/lon change based on heading/speed
    // 1 deg lat ~ 111km.
    // Speed in km/h -> km/s = speed / 3600

    for(const f of this.flights) {
        const dist = (f.speed / 3600) * dt; // distance in km
        const distDeg = dist / 111; // rough degree change

        const rad = (90 - f.heading) * (Math.PI / 180); // Math angle (0=East) vs Nav (0=North)
        // Nav 0 (N) -> Math 90
        // Nav 90 (E) -> Math 0
        // Nav 180 (S) -> Math -90

        const dLat = distDeg * Math.sin(rad);
        const dLon = distDeg * Math.cos(rad); // simplified

        f.lat += dLat;
        f.lon += dLon; // This will distort near poles but okay for visual

        // Wrap around
        if (f.lon > 180) f.lon -= 360;
        if (f.lon < -180) f.lon += 360;
        if (f.lat > 90) f.lat = 90 - (f.lat - 90);
        if (f.lat < -90) f.lat = -90 - (f.lat + 90);
    }
  }
}
