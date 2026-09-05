# TrikeIligan Rider App - Development Log

## September 5, 2026

### 1. Production Backend Deployment

- Successfully deployed the `trikego-backend` Node.js/PostgreSQL server to **Render** (`https://trikeiligan.onrender.com`).
- Updated the API endpoints in both the **Rider App** and the **Passenger App** (e.g., `login.tsx`, `signup.tsx`) to point to the live Render URL instead of the local Wi-Fi IP address.

### 2. Render Keep-Alive Service

- Render's free tier spins down inactive servers after 15 minutes of inactivity, causing a slow "cold start" for users.
- To fix this, we created a new `keep-alive-service` using Docker.
- Wrote a `docker-compose.yml` script that runs a lightweight Alpine Linux container in the background to automatically ping the backend's `/api/ping` endpoint every 5 minutes (300 seconds), keeping the server awake 24/7.

### 3. Backend & Database Fixes

- Fixed an `AsyncStorage` crash ("Native module is null") that was breaking the login flow.
- Fixed a SQL JOIN query in `check-data.js` to correctly fetch mock Driver data (matching `license_number`, `vehicle_plate`, etc.) from the PostgreSQL database.

### 4. Rider App Map Implementation

- **OpenStreetMap Integration:** Replaced the default Google Maps implementation (`react-native-maps`) which was rendering blank on Android due to missing API keys.
- Implemented a robust `WebView` mapping solution using **Leaflet JS**.
- Integrated `expo-location` to request foreground location permissions.
- Connected the GPS to the map so the Driver's custom marker actively tracks and updates their real-world location in real-time.

### 5. Rider UI Polish

- **Side Menu:** Replaced the instant "Logout" behavior on the top-left menu button.
- Built a custom React Native `<Modal>` that slides in a sleek Side Menu with a dark semi-transparent backdrop.
- The sidebar now houses the Driver's Profile Header, "Ride History", "Earnings", "Settings", and a dedicated "Logout" button.

### 6. Real-Time Socket.IO Integration (Driver App)
- **Socket.IO Client Setup**:
  - Installed `socket.io-client@4.7.2` to ensure stable websocket connections through Expo's Metro bundler.
  - Established persistent, real-time connections to the live Render backend (`trikeiligan.onrender.com`).
- **Dynamic Driver Profile & Ride Dispatch**:
  - Engineered the "GO ONLINE" button to instantly emit the driver's availability to the active driver pool on the backend.
  - Upgraded the driver login (`login.tsx`) to fetch and securely cache the actual `vehicle_model` and `rating` from the PostgreSQL database into device `AsyncStorage`.
  - Replaced all hardcoded driver information with the real authenticated driver's data when accepting a ride (`driver_accept_ride`).
- **Complex UI State Management**:
  - Built out 5 distinct operational modes for the Driver Map screen: `IDLE`, `ONLINE`, `REQUEST` (15s countdown timer), `ACTIVE RIDE`, and `COMPLETED`.
  - Implemented a 15-second visual countdown timer and a sleek "New Ride Request" bottom sheet that auto-dismisses if a ride isn't accepted in time.
