
export class HUDLayer {
  constructor() {
    this.utcEl = document.getElementById('utc-time');
    this.issLatEl = document.getElementById('iss-lat');
    this.issLonEl = document.getElementById('iss-lon');
    this.issAltEl = document.getElementById('iss-alt');
    this.issVelEl = document.getElementById('iss-vel');
    this.userLocEl = document.getElementById('user-loc');
    this.statusEl = document.getElementById('status-msg');
  }

  updateTime(date) {
    if (this.utcEl) {
        // Format: YYYY-MM-DD HH:MM:SS UTC
        this.utcEl.textContent = date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
  }

  updateISS(issData) {
    if (!issData) return;
    if (this.issLatEl) this.issLatEl.textContent = issData.lat.toFixed(4);
    if (this.issLonEl) this.issLonEl.textContent = issData.lon.toFixed(4);
    if (this.issAltEl) this.issAltEl.textContent = `${issData.alt.toFixed(2)} km`;
    if (this.issVelEl) this.issVelEl.textContent = `${issData.vel.toFixed(0)} km/h`;
  }

  updateUser(location) {
    if (!location) return;
    if (this.userLocEl) {
      this.userLocEl.textContent = `${location.city}, ${location.country}`;
    }
  }

  setStatus(msg) {
    if (this.statusEl) this.statusEl.textContent = msg;
  }
}
