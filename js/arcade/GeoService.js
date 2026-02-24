
export class GeoService {
  constructor() {
    this.location = null;
    this.status = 'initializing';
  }

  async fetchLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      this.location = {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        timezone: data.timezone,
        ip: data.ip
      };
      this.status = 'ready';
      return this.location;
    } catch (error) {
      console.warn('GeoService: IP Geolocation failed, using fallback.', error);
      // Fallback to coordinates (0,0) or a default location
      this.location = {
        lat: 0,
        lon: 0,
        city: 'Unknown',
        region: 'Orbit',
        country: 'Earth',
        timezone: 'UTC',
        ip: '127.0.0.1'
      };
      this.status = 'error';
      return this.location;
    }
  }

  getLocation() {
    return this.location;
  }
}
