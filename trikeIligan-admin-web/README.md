# TrikeIligan Admin Web Portal

## Overview
This is the Vite-based React application serving as the administrative dashboard for the TrikeIligan platform. It provides centralized control and monitoring over the ecosystem of riders and drivers.

## Recent Features

### September 30, 2026 - Driver Verification Dashboard
- **Verification Portal**:
  - Engineered the main `Verification.jsx` dashboard allowing administrators to review and process all `PENDING` driver applications in real-time.
- **Cloudinary Image Integration**:
  - Built a seamless high-resolution image viewing modal. When admins click "View License", the portal securely fetches and displays the driver's license photo hosted on the Cloudinary CDN.
  - Implemented smart UI fallbacks for legacy drivers, ensuring the dashboard remains clean (displaying "No license photo was uploaded") instead of rendering broken image links.
- **One-Click Approval/Rejection**:
  - Connected the Admin approval UI directly to the live backend.
  - Clicking "Approve" instantly updates the PostgreSQL database to mark the driver as `APPROVED`, instantly unlocking their access to the mobile Driver App.

### September 30, 2026 - Live Socket.IO Dispatch Tracking
- **Live Dispatch Dashboard**:
  - Integrated the `socket.io-client` into the Admin Web application, instantly bridging it to the backend's real-time event pipeline.
  - The `Monitoring.jsx` dashboard now accurately displays live connection counts of on-duty drivers from the `available_drivers` socket room.
  - The dashboard dynamically tracks and visually updates active `IN_PROGRESS` rides across the city in perfect real-time synchronization, without requiring manual browser refreshes.
