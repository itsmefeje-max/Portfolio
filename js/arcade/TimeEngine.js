
export class TimeEngine {
  constructor() {
    this.startDate = new Date();
  }

  getUTCTime() {
    return new Date();
  }

  /**
   * Calculates the Greenwich Mean Sidereal Time (GMST) in radians.
   * This is the angle of the Earth's rotation around its axis.
   * @param {Date} date - The date to calculate for.
   * @returns {number} GMST in radians.
   */
  getGMST(date) {
    const now = date || new Date();
    const time = now.getTime();
    const jd = (time / 86400000) + 2440587.5;
    const d = jd - 2451545.0;

    // GMST in degrees
    let gmst = 280.46061837 + 360.98564736629 * d;
    gmst %= 360;
    if (gmst < 0) gmst += 360;

    return (gmst * Math.PI) / 180;
  }

  /**
   * Calculates the Sun's position in ECI (Earth-Centered Inertial) coordinates.
   * Coordinate system: Y is North (Earth's axis), X is Vernal Equinox.
   * @param {Date} date - The date to calculate for.
   * @returns {Object} { x, y, z } normalized direction vector.
   */
  getSunPosition(date) {
    const now = date || new Date();
    const time = now.getTime();
    const jd = (time / 86400000) + 2440587.5;
    const d = jd - 2451545.0;

    // Mean anomaly of the Sun
    let g = 357.529 + 0.98560028 * d;
    g %= 360;
    if (g < 0) g += 360;
    const gRad = (g * Math.PI) / 180;

    // Mean longitude of the Sun
    let q = 280.459 + 0.98564736 * d;
    q %= 360;
    if (q < 0) q += 360;
    const qRad = (q * Math.PI) / 180;

    // Ecliptic longitude
    let L = q + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
    L %= 360;
    if (L < 0) L += 360;
    const LRad = (L * Math.PI) / 180;

    // Obliquity of the ecliptic
    const e = 23.439 - 0.00000036 * d;
    const eRad = (e * Math.PI) / 180;

    // Right ascension
    let ra = Math.atan2(Math.cos(eRad) * Math.sin(LRad), Math.cos(LRad));

    // Declination
    let dec = Math.asin(Math.sin(eRad) * Math.sin(LRad));

    // Convert to Cartesian (ECI) where Y is North
    // x = cos(dec) * cos(ra)
    // z = -cos(dec) * sin(ra)  (Assuming Z points towards "back" or West of X? Need to align with Three.js)
    // y = sin(dec)

    // In Three.js, usually:
    // Y is Up (North)
    // Z is "Front"
    // X is "Right"
    // Let's align RA=0 with X axis.

    const x = Math.cos(dec) * Math.cos(ra);
    const z = Math.cos(dec) * Math.sin(ra); // Let's try +sin(ra) for Z. We can adjust rotation later.
    const y = Math.sin(dec);

    return { x, y, z };
  }

  /**
   * Calculates the subsolar point (latitude and longitude where the sun is overhead).
   * @param {Date} date
   * @returns {Object} { lat, lon } in degrees.
   */
  getSubSolarPoint(date) {
    const sunPos = this.getSunPosition(date);
    const gmst = this.getGMST(date);

    // Declination is latitude
    const dec = Math.asin(sunPos.y);
    const lat = (dec * 180) / Math.PI;

    // Right Ascension is longitude relative to Vernal Equinox
    const ra = Math.atan2(sunPos.z, sunPos.x);

    // Longitude = RA - GMST
    let lonRad = ra - gmst;

    // Normalize to -PI to +PI
    while (lonRad <= -Math.PI) lonRad += 2 * Math.PI;
    while (lonRad > Math.PI) lonRad -= 2 * Math.PI;

    const lon = (lonRad * 180) / Math.PI;

    return { lat, lon };
  }
}
