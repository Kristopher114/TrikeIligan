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

### September 18-19, 2026 - Vehicle Classification & Ride Filtering

- **Vehicle Type Implementation**:
  - Upgraded the database schema to classify every driver with a specific `vehicle_type` ('SINGLE' or 'TRICYCLE').
  - Modified the backend Socket.IO dispatch logic (`passenger_request_ride`) to automatically filter available drivers.
  - Drivers will now *only* receive a `new_ride_request` popup if their registered vehicle type perfectly matches the passenger's requested vehicle type.

### September 22, 2026 - Ride Lifecycle & Cancellation Handling

- **Ride Arrival & Handshake**:
  - Implemented real-time status syncing. Tapping `"PASSENGER PICKED UP"` now updates the passenger's app UI to show they are actively in-transit.
  - Tapping `"CONFIRM PAYMENT & RATE"` emits a `ride_completed` signal, gracefully ending the driver's active ride session and prompting the passenger to rate the driver.
- **Robust Cancellation Shield**:
  - Engineered a bulletproof socket listener for passenger cancellations.
  - **Searching phase**: If the passenger cancels before the driver accepts, the app receives a `cancel_ride_offer` event and instantly dismisses the ringing request modal.
  - **Active phase**: If the passenger cancels *after* the driver has accepted (while driving to pickup or during the ride), the app receives a `ride_cancelled_by_passenger_<driverId>` event.
  - Solved a complex React `useEffect` lifecycle bug to guarantee the cancellation listeners correctly bind *after* the network socket connects.
  - The driver app now instantly wipes the active ride screen and alerts the driver via a `"Ride Cancelled"` modal, immediately returning them to the idle pool to receive new requests.
  
### September 28, 2026 - Digital Wallet & Driver Cashout System

- **Ride History (Passenger & Driver)**:
  - Passengers can view a detailed log of their past rides, including pickup/dropoff locations, fares, and the specific payment method (CASH or WALLET).
  - Built a new `GET /api/driver-rides/:driverId` endpoint and a dedicated `rides.tsx` history screen for drivers, allowing them to track the passengers they have serviced.
- **Wallet Payment Integration**:
  - Engineered an end-to-end digital wallet system. Passengers can pay for rides using their PayPal-topped-up Wallet.
  - The backend executes a precise SQL transaction during `ride_completed` to instantly deduct funds from the passenger and credit them to the driver's wallet.
  - Drivers receive an immediate `wallet_payment_success` socket event, triggering a green "Payment Received!" modal in the Driver app.
- **Driver Dashboard & Real-Time Stats**:
  - Implemented `/api/driver-stats/:id` to aggregate a driver's total rides and gross daily earnings across all payment types using PostgreSQL's `CURRENT_DATE`.
  - The Driver app seamlessly updates "Today's Earnings" and "Total Rides" on the dashboard without requiring a manual refresh.
- **Driver PayPal Cashout**:
  - Developed a robust `POST /api/wallet/payout` backend endpoint utilizing the official PayPal `v1/payments/payouts` Sandbox API.
  - Added a dedicated `earnings.tsx` cashout screen for drivers to withdraw their digital earnings instantly to their personal PayPal account.
  - Secured the process using PostgreSQL `FOR UPDATE` row-level locking to prevent race conditions during withdrawals, logging every successful transfer into the `Transactions` table as a `WITHDRAWAL`.

### September 30, 2026 - Driver Approval Flow & Cloudinary Uploads

- **Driver Approval Security**:
  - Restricted the driver app login flow. Drivers must now have an `APPROVED` status in the database to access the dashboard.
  - Created a dedicated `pending.tsx` standby screen. If a driver signs up or attempts to log in before an Admin approves them, they are securely locked to this screen which states "Your application is still in approval".
  - Added resilient fallback logic for legacy driver accounts that had missing or `null` statuses.
- **License Photo Uploads via Cloudinary**:
  - Integrated `expo-image-picker` allowing new drivers to select a photo of their driver's license during the registration flow.
  - Engineered a robust, end-to-end direct image upload system using `expo-file-system/legacy` to bypass common React Native `FormData` crash bugs.
  - Driver photos are securely streamed directly to a Cloudinary cloud storage bucket using unsigned presets, returning a live image URL that is stored natively in PostgreSQL.

### September 30, 2026 - Driver App Polish & Map Overhaul

- **Dynamic Fare Configuration**:
  - Implemented a live query to fetch the `base_fare` directly from the PostgreSQL `System_Config` table.
  - Re-designed the 3-column driver dashboard to cleanly display the dynamic base fare directly, preventing visual overflow and text wrapping issues on smaller screens.
- **Location Reliability Improvements**:
  - Engineered a `handleRefreshLocation` manual toggle button directly onto the map screen.
  - Decreased default location accuracy requests to `Balanced` and added robust `try-catch` fallbacks to Iligan City center coordinates, successfully resolving critical `Location request failed due to unsatisfied device settings` crashes on emulators and spotty GPS devices.

### October 12, 2026 - Driver Profile Management, Vehicle Model Normalization & Live Photo Broadcast

- **Driver Edit Profile Screen (`profile.tsx`)**:
  - Re-engineered the driver profile into an interactive profile editing screen matching the design aesthetics of the passenger app.
  - Drivers can view and update their personal details (**Full Name**, **Phone Number**, **Email Address**, **Vehicle Model**, and **Vehicle Plate Number**).
  - Prominently displays verified driver badges: **Approval Status** (`APPROVED`, `PENDING`, `REJECTED`), driver **Rating**, **Vehicle Type** (`Tricycle` / `Single`), and read-only **License Number**.
  - Connected directly to `GET /api/user-profile/:id` and `PUT /api/user-profile/:id` to synchronize changes with PostgreSQL `Users` and `Drivers` tables while refreshing device `AsyncStorage`.
- **Cloudinary Avatar Uploads for Drivers**:
  - Integrated `expo-image-picker` with an interactive camera badge overlay, enabling drivers to change their profile picture directly from the app.
  - Streams selected photos directly to Cloudinary using `expo-file-system/legacy` to guarantee stability and prevent upload deprecation issues.
  - Automatically updates the user's `profile_picture_url` in the database and updates `userProfileImage` in local cache.
- **Vehicle Model Normalization ("Kawasaki Barako 175" vs "Trike")**:
  - Identified and fixed a bug where the vehicle model defaulted to `"Trike"` instead of the actual motorcycle model (`Kawasaki Barako 175`).
  - Removed the hardcoded `user.vehicle_model || 'Trike'` fallback in backend `/api/driver-login`, updating it to resolve to the true model or `'Kawasaki Barako 175'`.
  - Updated driver database records in Neon PostgreSQL, ensuring `vehicle_model` contains `'Kawasaki Barako 175'`.
  - Upgraded `/api/driver-signup` to automatically set default vehicle models upon driver registration.
  - Implemented client-side sanitization across `profile.tsx`, `login.tsx`, and `home.tsx` to automatically purge stale `"Trike"` values from `driverVehicle` storage.
- **Real-Time Driver Photo Broadcast on Ride Acceptance (`home.tsx`)**:
  - Updated the `driver_accept_ride` socket dispatch in `home.tsx` to include the driver's verified profile picture (`driverPhoto`, `driverImage`, `driver`).
  - Enables the passenger's confirmed rider selection card to render the assigned driver's real image in real time.

### October 19, 2026 - Real-Time Push & Device Notifications & App Wallet Alert Flow

- **Native Push Notification Architecture (`expo-notifications@57.0.23`)**:
  - Integrated `expo-notifications` for standalone production builds without Expo Go limitations.
  - Setup custom Android notification channels (`rides` and `payments`) with MAX importance and distinct vibration patterns.
  - Automatic push token registration with backend on driver profile load.
- **Match Notifications**:
  - Driver automatically receives system banner and push alert upon accepting a ride (`Ride Matched! ✅ - You are matched with {passengerName}! Heading to pickup`).
- **Cancellation Notifications**:
  - **Passenger Cancels**: Driver app automatically triggers `Ride Cancelled ⚠️` local notification and push alert, closes active ride modal, and returns driver to looking for rides.
  - **Driver Cancels/Declines**: Emits socket events and triggers confirmation notifications to keep driver informed.
- **App Wallet Notifications & Real-Time Mode Indicator**:
  - **Ride Request**: Driver sees `[Wallet]` badge and receives an alert if the passenger requested with Wallet payment.
  - **During Trip**: If the passenger switches payment to Wallet, the driver is instantly notified: `Payment Mode: App Wallet 💳 - Passenger is paying directly via App Wallet (₱{fare}). No cash collection required!`.
  - **Ride Completion**: When passenger pays via Wallet, driver receives a `Wallet Payment Received! 💰` alert and green success modal displaying credited funds.

