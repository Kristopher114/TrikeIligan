# Trike Iligan - Development Session Summary

# August 6, 2026

This document serves as a complete log of everything we accomplished during our development session for the **Trike Iligan** React Native / Expo application.

## 1. Environment & Metro Bundler Fixes

- **Vector Icons Resolution**: Fixed initial Metro bundler errors where `@expo/vector-icons` and `FontAwesome6` font files were failing to resolve.
- **Platform OS Crash**: Fixed a red-screen crash in `home.tsx` by importing the `Platform` module from `react-native`.
- **SafeAreaView Update**: Replaced the deprecated `SafeAreaView` from `react-native` with the modern, recommended version from `react-native-safe-area-context` to remove yellow warning boxes.
- **Syntax Error Resolution**: Fixed a broken `</View>` closing tag in `signup.tsx` that was causing the Metro Bundler to fail with a parsing error.

## 2. Dev Client & Network Troubleshooting

- **Tunneling Issues**: Diagnosed a `CommandError: failed to start tunnel` issue caused by an Ngrok outage/network block.
- **Connection Alternatives**: Provided instructions on how to bypass Wi-Fi and Tunnel issues by utilizing a direct USB connection (`adb` reverse proxy) to run `--dev-client` builds flawlessly.
- **Java NullPointerException**: Explained and resolved a native Android crash (`ReactActivityDelegate.onKeyDown`) that occurred when hardware keys were pressed while the app was disconnected from the bundler.

## 3. Sign Up Screen Improvements

- **Password Visibility Toggle**: Implemented the logic and state (`useState`) to toggle password visibility (changing dots to text) when clicking the eye icon.
- **Layout Alignment**: Fixed the Flexbox styling (`flexDirection: 'row'`) so the password text input and the eye icon sit perfectly side-by-side in a unified container.
- **Stationary Headers**: Restructured the layout so that the "Create an Account" title and subtitle remain securely pinned at the top of the screen, while the input forms scroll beneath them.
- **Keyboard Avoidance**: Installed `react-native-keyboard-aware-scroll-view` to replace the standard `ScrollView`. This automatically pushes the password input up when tapped, preventing the keyboard from covering the input field on Android devices.
- **Sign Up and Log in Validations**: We put validations in the `src/app/signup.tsx` and `src/app/login.tsx` files to validate the email and password.

## 4. Home Screen (Map & Bottom Sheet) Overhaul

- **Search Bar UI**: Changed the red `location-sharp` icon to a green magnifying glass (`search`) and perfectly aligned it horizontally with the placeholder text.
- **Interactive Search Input**: Upgraded the static "Where are you going?" text into a fully functional and interactive `<TextInput>` component.
- **Custom Draggable Bottom Sheet**:
  - Overhauled the static bottom sheet to behave like a standard navigation app (e.g., Google Maps).
  - Used React Native's built-in `Animated` and `PanResponder` APIs to create a highly performant, custom draggable drawer from scratch (avoiding heavy external libraries).
  - **Full Screen Map**: Adjusted the map placeholder to take up the entire background (`StyleSheet.absoluteFillObject`).
  - **Snap Points**: Implemented logic so the sheet defaults to 58% down the screen, but smoothly snaps to 15% from the top (expanding fully) when the user grabs the newly-added grey drag handle and swipes up.

### Update: August 12, 2026 - Migration to 100% Free Open-Source Map Engine

- **Removed Google Maps (`react-native-maps`)**:
  - Scrapped the native Google Maps implementation to avoid API key and billing requirements, ensuring the app remains 100% free to build and run.
  - Scrubbed dummy API keys from `app.json` and `AndroidManifest.xml`.
- **Integrated Leaflet & OpenStreetMap**:
  - Installed `react-native-webview` to securely host a local HTML map engine.
  - Embedded **Leaflet** with free OpenStreetMap tiles directly into the Home screen.
  - Fixed Android WebView security constraints by enabling `javaScriptEnabled` and `domStorageEnabled` to allow Leaflet to render natively.
- **Implemented Free Location Search (Nominatim API)**:
  - Built a fully functional search bar that queries OpenStreetMap's **Nominatim API** for real locations in the Philippines.
  - Bypassed API blocks by supplying a custom `User-Agent` header (`TrikeIliganApp/1.0`).
  - Implemented seamless map interactivity: Tapping a search result injects Javascript into the WebView to `flyTo()` the coordinates and drop a marker, without reloading the map!
  - Resolved stubborn `java.net.BindException` network port bugs by forcefully disabling the Gradle Daemon in `gradle.properties` and purging corrupted lock files.

### Update: August 13, 2026 - JoyRide-Style Route Screen & Android Bug Fixes

- **New Intermediary Route Screen (`route.tsx`)**:
  - Designed a premium UI mirroring JoyRide's booking flow, featuring stacked Pick-up (Green) and Drop-off (Purple) inputs.
  - Implemented real-time location search utilizing Photon API with dynamic state handling.
  - Integrated "Recent" and "Favorites" tabs.
- **Advanced Map Screen Handoff (`map.tsx`)**:
  - Re-engineered map logic to support distinct `PICKUP` and `DESTINATION` modes.
  - Users can now tap a map icon in either input field to jump to the interactive map, drop a pin, and instantly return to the route screen with the physical address auto-filled.
  - Fixed a major Expo Router caching bug by using `useEffect` to force state updates when the map screen is pushed from the router stack.
- **Critical React Native Android Fixes**:
  - **Z-Index Touch Stealing**: Removed dynamic `elevation` from active input fields. Android's shadow system was pulling the active Pick-up box forward in 3D space, causing its touch boundary to overlap the Drop-off box and intercept touches.
  - **Layout Shift Keyboard Drops**: Updated conditional rendering of search loading spinners. Using `position: 'absolute'` ensures spinners don't dynamically change the container width, preventing `TextInput` resize events that would abruptly dismiss the Android keyboard.
  - **Infinite WebView Geocode Loop**: Prevented the Leaflet map from endlessly reloading by extracting the HTML source into a stable memory reference (`useMemo`/constant) outside the render block.
  - **Network Spam & Rate Limits**: Implemented a 600ms debouncer on map dragging to prevent spamming the geocoding server. Switched reverse-geocoding (pin-to-address) to the Nominatim API for higher pinpoint accuracy.

### Update: August 13, 2026 3:07 AM - Neon Database Integration & Backend Authentication

- **Database Initialization**:
  - Connected the Express server to a cloud-based **Neon (PostgreSQL)** database using the `pg` client.
  - Designed and built a robust 5-table schema (`Users`, `Passengers`, `Drivers`, `Rides`, `TrikeLocations`) using `CREATE TABLE IF NOT EXISTS` and `DROP TABLE` mechanisms for rapid prototyping.
  - *Vital Command Run*: `node init-db.js` to successfully execute the schema creation script.
  - *Vital Command Run*: `node check-data.js` to manually inspect and verify records inserted into the database.
- **Backend Authentication Architecture (`trikego-backend/index.js`)**:
  - Engineered `/api/signup` and `/api/login` endpoints listening on `0.0.0.0` to accept external network traffic.
  - Implemented `bcryptjs` for secure password hashing and verification.
  - Constructed a SQL `JOIN` query combining the core `Users` table and role-specific `Passengers` table to verify credentials and extract the `username`.
- **Frontend Integration (`signup.tsx` & `login.tsx`)**:
  - Refactored the frontend forms to properly `fetch()` from the Express API endpoints.
  - Updated registration state to correctly handle the new `username` field.
  - Passed the logged-in user's `fullName` parameter from `login.tsx` straight to the Home Screen.
- **Network Troubleshooting & Native Modules**:
  - Diagnosed `java.net.ConnectException` timeouts caused by a disconnected Windows Mobile Hotspot.
  - *Vital Command Run*: `ipconfig` to discover the active Wi-Fi IPv4 address (`192.168.1.39`) and successfully re-routed the app's `fetch` calls through the stable network.
  - Encountered an `[AsyncStorageError: Native module is null]` crash when attempting to add `@react-native-async-storage/async-storage` to a pre-compiled Expo Development Build.
  - *Vital Command Run*: `npx expo run:android` to fire up the Android Gradle Daemon and completely rebuild the underlying native `.apk` from scratch, properly linking the Java native code required for persistent device storage.

### Update: August 23, 2026 - Cloud Deployment (Render) & Network Fixes
- **Backend Cloud Deployment Preparation**:
  - Prepared the `trikego-backend` Express server for production deployment on **Render Web Services**.
  - Updated `package.json` with a dedicated `"start": "node index.js"` script to instruct Render on how to boot the server.
  - Created a `.gitignore` file to strictly prevent sensitive files (`.env` containing database credentials) and heavy folders (`node_modules/`) from being uploaded to GitHub.
- **Render Monorepo Troubleshooting**:
  - Resolved a severe deployment crash (`ENOENT: no such file or directory, open '/opt/render/project/src/package.json'`) caused by linking the root repository instead of the backend folder.
  - Fixed by explicitly setting the **Root Directory** inside the Render Dashboard to `trikego-backend`, allowing Render to successfully locate dependencies and execute `npm install`.
- **Database & Local Network Integrity**:
  - Verified cloud database persistence by re-running the verification script.
  - *Vital Command Run*: `node check-data.js` to successfully retrieve passenger and user records from the Neon PostgreSQL database.
  - Resolved recurrent 60-second fetch timeouts (`java.net.ConnectException`) caused by dynamic IP address changes on the local Windows network. Successfully remapped the frontend API calls in `signup.tsx` and `login.tsx` back to the stable Mobile Hotspot IP address (`192.168.137.1`).

### September 3, 2026
- **Ride History Feature**:
  - Implemented a new `/api/rides/:userId` backend endpoint in `index.js` that queries the PostgreSQL `Rides` table and joins with the `Users` table to fetch driver details.
  - Modified `login.tsx` to capture and persist the `userId` securely in `AsyncStorage` upon successful authentication.
  - Built out the **Recent Rides** screen (`rides.tsx`) using a `FlatList` to render past rides, displaying the destination, driver name, fare cost, and date/status.
- **UI & Component Refactoring**:
  - Abstracted the bottom navigation tab bar into a highly reusable `TabBar.tsx` component.
  - Integrated `TabBar.tsx` universally across `home.tsx`, `rides.tsx`, and `profile.tsx`, utilizing `flex: 1` spacing to anchor the bar cleanly and consistently to the absolute bottom of all screens.
  - Cleaned up the `src/components` directory by safely removing unused Expo default boilerplate components (`ui/collapsible.tsx`, `ThemedText.tsx`, etc.).
- **System Architecture & Monorepo Scaling**:
  - Successfully scaled the project into a proper **Monorepo** structure.
  - Generated the `trikeIligan-rider` (Driver app) using `npx create-expo-app` alongside the existing `trikeIligan` (Passenger app) and `trikego-backend`.
  - Confirmed the integrity of the shared root Git repository to avoid nested-git conflicts, allowing for seamless full-stack deployments to GitHub and Render.
  - Diagnosed `cron-job.org` 503 HTTP errors, determining them to be temporary deployment downtime rather than crashes, and confirmed a 100% healthy active server connection via PowerShell REST tests.

### September 5, 2026 - Real-Time Socket.IO Integration (Passenger App)
- **Socket.IO Client Setup**: 
  - Installed `socket.io-client@4.7.2` (downgraded specifically to bypass a known Metro bundler `webtransport` resolution error on Expo).
  - Wired the Passenger App (`rider-selection.tsx`) to connect securely to the live Render backend via websockets.
- **Dynamic Booking & Fare System**: 
  - Successfully connected the passenger's "Confirm Booking" flow to emit the `passenger_request_ride` event to the driver pool.
  - Replaced the hardcoded driver profile with real-time dynamic data directly from the driver accepting the ride.
  - Implemented the "Finding a Driver..." radar UI, which listens for the `ride_accepted_<userId>` event from the backend.
  - Automatically parses the incoming driver's `driverName`, `driverVehicle`, and `driverRating` straight from the PostgreSQL database through the Socket and displays it on the "Ride Confirmed" screen.
