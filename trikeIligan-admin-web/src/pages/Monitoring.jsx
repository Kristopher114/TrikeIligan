import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MdOutlineMap, MdRefresh, MdClose, MdSearch, MdMyLocation } from "react-icons/md";
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/dashboard.css';

const BACKEND_URL = 'https://trikeiligan.onrender.com';
const ILIGAN_CENTER = [8.2280, 124.2452];

// Format short ride ID for display (e.g. ride_1792483523207 -> #TRK-3207)
function formatRideId(id) {
    if (!id) return '#TRK-0000';
    const clean = String(id).replace(/[^a-zA-Z0-9]/g, '');
    return `#TRK-${clean.slice(-4).toUpperCase()}`;
}

// Format relative elapsed time
function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
}

// Status dot & badge styling helper
function getStatusMeta(status) {
    switch (status) {
        case 'COMPLETED':
            return { label: 'Completed', dotClass: 'dot-completed', badgeClass: 'badge-completed' };
        case 'IN_PROGRESS':
            return { label: 'In Progress', dotClass: 'dot-progress', badgeClass: 'badge-progress' };
        case 'ACCEPTED':
            return { label: 'Driver Assigned', dotClass: 'dot-accepted', badgeClass: 'badge-accepted' };
        case 'CANCELLED':
            return { label: 'Cancelled', dotClass: 'dot-cancelled', badgeClass: 'badge-cancelled' };
        case 'PENDING':
        case 'SEARCHING':
        default:
            return { label: 'Pending Match', dotClass: 'dot-pending', badgeClass: 'badge-pending' };
    }
}

export default function Monitoring() {
    const [liveStats, setLiveStats] = useState({
        activeDrivers: 0,
        ongoingRides: 0,
        dailyRevenue: 0
    });

    const [onlineDrivers, setOnlineDrivers] = useState([]);
    const [dispatchLogs, setDispatchLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRide, setSelectedRide] = useState(null);
    const [showAllModal, setShowAllModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersMapRef = useRef(new Map());
    const hasAutoCenteredRef = useRef(false);

    // Fetch currently online drivers from REST API
    const fetchOnlineDrivers = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/online-drivers`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
                setOnlineDrivers(data.data);
                setLiveStats(prev => ({
                    ...prev,
                    activeDrivers: Math.max(prev.activeDrivers, data.data.length)
                }));
            }
        } catch (err) {
            console.error('Error fetching online drivers:', err);
        }
    }, []);

    // Fetch dispatch logs from backend REST API
    const fetchDispatchLogs = useCallback(async (statusToFetch = filterStatus) => {
        try {
            setLoadingLogs(true);
            const queryParam = statusToFetch && statusToFetch !== 'ALL' ? `?status=${statusToFetch}&limit=50` : '?limit=50';
            const res = await fetch(`${BACKEND_URL}/api/admin/dispatch-logs${queryParam}`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            const data = await res.json();
            if (data && data.data) {
                setDispatchLogs(data.data);
            }
        } catch (err) {
            console.error('Error fetching dispatch logs:', err);
        } finally {
            setLoadingLogs(false);
            setIsRefreshing(false);
        }
    }, [filterStatus]);

    // Initial load and filter change
    useEffect(() => {
        fetchDispatchLogs(filterStatus);
        fetchOnlineDrivers();
    }, [filterStatus, fetchDispatchLogs, fetchOnlineDrivers]);

    // Initialize Leaflet Map inside .map-container
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: ILIGAN_CENTER,
            zoom: 14,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // Ensure proper sizing after layout paint
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);

        return () => {
            clearTimeout(timer);
            markersMapRef.current.clear();
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Sync onlineDrivers state to Leaflet markers in real-time
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const currentMarkers = markersMapRef.current;
        const activeIds = new Set();

        onlineDrivers.forEach((driver) => {
            if (!driver || !driver.driverId) return;
            const lat = Number(driver.lat);
            const lon = Number(driver.lon);
            if (isNaN(lat) || isNaN(lon)) return;

            const id = String(driver.driverId);
            activeIds.add(id);

            const isOnTrip = driver.status === 'ON_TRIP';
            const badgeColor = isOnTrip ? '#2196F3' : '#1B6E45';
            const pulseRgba = isOnTrip ? 'rgba(33, 150, 243, 0.35)' : 'rgba(27, 110, 69, 0.35)';
            const isSingle = driver.vehicleType === 'SINGLE';
            const vehicleEmoji = isSingle ? '🏍️' : '🛺';
            const shortName = (driver.driverName || 'Rider').split(' ')[0];

            const customIcon = L.divIcon({
                className: 'custom-rider-leaflet-icon',
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -50%);">
                        <div style="
                            width:38px;
                            height:38px;
                            border-radius:50%;
                            background:${badgeColor};
                            border:3px solid #FFFFFF;
                            box-shadow:0 0 0 6px ${pulseRgba}, 0 4px 10px rgba(0,0,0,0.28);
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:18px;
                        ">${vehicleEmoji}</div>
                        <div style="
                            margin-top:3px;
                            background:#111827;
                            color:#FFFFFF;
                            font-size:10px;
                            font-weight:700;
                            padding:2px 7px;
                            border-radius:10px;
                            white-space:nowrap;
                            box-shadow:0 2px 4px rgba(0,0,0,0.25);
                        ">${shortName}</div>
                    </div>
                `,
                iconSize: [44, 54],
                iconAnchor: [22, 22],
                popupAnchor: [0, -20]
            });

            const popupHtml = `
                <div style="font-family:'Inter',sans-serif;min-width:190px;padding:2px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                        <strong style="font-size:14px;color:#111;">${driver.driverName || 'Active Rider'}</strong>
                        <span style="
                            background:${isOnTrip ? '#E3F2FD' : '#E8F5E9'};
                            color:${badgeColor};
                            font-size:10px;
                            font-weight:700;
                            padding:2px 8px;
                            border-radius:10px;
                        ">${isOnTrip ? 'ON TRIP' : 'ONLINE'}</span>
                    </div>
                    <div style="font-size:12px;color:#444;margin-bottom:4px;">
                        ${vehicleEmoji} <strong>${driver.vehicleType || 'TRICYCLE'}</strong> • ${driver.driverVehicle || 'Kawasaki Barako 175'}
                    </div>
                    <div style="font-size:11px;color:#777;">
                        📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}
                    </div>
                    <div style="font-size:10px;color:#999;margin-top:4px;">
                        Updated ${formatTimeAgo(driver.updatedAt)}
                    </div>
                </div>
            `;

            if (currentMarkers.has(id)) {
                const existingMarker = currentMarkers.get(id);
                existingMarker.setLatLng([lat, lon]);
                existingMarker.setIcon(customIcon);
                existingMarker.setPopupContent(popupHtml);
            } else {
                const newMarker = L.marker([lat, lon], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);
                currentMarkers.set(id, newMarker);
            }
        });

        // Remove markers for drivers who went offline
        for (const [id, marker] of currentMarkers.entries()) {
            if (!activeIds.has(id)) {
                map.removeLayer(marker);
                currentMarkers.delete(id);
            }
        }

        // Auto-pan to the first online driver once when riders appear
        if (onlineDrivers.length > 0 && !hasAutoCenteredRef.current) {
            const first = onlineDrivers[0];
            if (first && !isNaN(Number(first.lat)) && !isNaN(Number(first.lon))) {
                map.flyTo([Number(first.lat), Number(first.lon)], 15, { duration: 0.8 });
                hasAutoCenteredRef.current = true;
            }
        } else if (onlineDrivers.length === 0) {
            hasAutoCenteredRef.current = false;
        }
    }, [onlineDrivers]);

    // Focus/pan map on a specific online driver and open their popup
    const focusDriverOnMap = (driver) => {
        const map = mapInstanceRef.current;
        if (!map || !driver) return;
        const lat = Number(driver.lat);
        const lon = Number(driver.lon);
        if (isNaN(lat) || isNaN(lon)) return;

        map.flyTo([lat, lon], 16, { duration: 0.7 });
        const marker = markersMapRef.current.get(String(driver.driverId));
        if (marker) {
            setTimeout(() => marker.openPopup(), 350);
        }
    };

    // Recenter map to Iligan City or fit all online drivers
    const handleRecenterMap = () => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (onlineDrivers.length > 1) {
            const bounds = L.latLngBounds(
                onlineDrivers.map(d => [Number(d.lat), Number(d.lon)])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else if (onlineDrivers.length === 1) {
            focusDriverOnMap(onlineDrivers[0]);
        } else {
            map.flyTo(ILIGAN_CENTER, 14, { duration: 0.7 });
        }
    };

    // Real-time WebSocket connection
    useEffect(() => {
        const socket = io(BACKEND_URL);

        socket.on('connect', () => {
            console.log('Connected to dispatch server for live monitoring');
            socket.emit('admin_join'); // Join admin room for stats, logs & driver locations
        });

        // Listen for live stats updates
        socket.on('admin_stats_update', (stats) => {
            console.log('Live stats update:', stats);
            setLiveStats(prev => ({
                ...prev,
                activeDrivers: stats.activeDrivers ?? prev.activeDrivers,
                ongoingRides: stats.ongoingRides ?? prev.ongoingRides,
                dailyRevenue: stats.dailyRevenue !== undefined ? stats.dailyRevenue : prev.dailyRevenue
            }));
        });

        // Listen for live online driver GPS updates
        socket.on('admin_drivers_update', (drivers) => {
            if (Array.isArray(drivers)) {
                setOnlineDrivers(drivers);
                setLiveStats(prev => ({
                    ...prev,
                    activeDrivers: drivers.length
                }));
            }
        });

        // Listen for live dispatch log updates
        socket.on('dispatch_log_update', (logItem) => {
            console.log('Live dispatch log event:', logItem);
            setDispatchLogs(prevLogs => {
                const existingIndex = prevLogs.findIndex(l => l.id === logItem.id);
                if (existingIndex > -1) {
                    const updated = [...prevLogs];
                    updated[existingIndex] = { ...updated[existingIndex], ...logItem };
                    return updated;
                } else {
                    return [logItem, ...prevLogs];
                }
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Manual refresh handler
    const handleManualRefresh = () => {
        setIsRefreshing(true);
        fetchDispatchLogs(filterStatus);
        fetchOnlineDrivers();
    };

    // Filter logs by search input
    const filteredLogs = dispatchLogs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const rideId = formatRideId(log.id).toLowerCase();
        const rawId = String(log.id || '').toLowerCase();
        const passenger = (log.passenger_name || '').toLowerCase();
        const driver = (log.driver_name || '').toLowerCase();
        const pickup = (log.pickup_address || '').toLowerCase();
        const dropoff = (log.dropoff_address || '').toLowerCase();
        const status = (log.status || '').toLowerCase();

        return (
            rideId.includes(q) ||
            rawId.includes(q) ||
            passenger.includes(q) ||
            driver.includes(q) ||
            pickup.includes(q) ||
            dropoff.includes(q) ||
            status.includes(q)
        );
    });

    // Display the first 6 logs in the dashboard card
    const recentLogs = filteredLogs.slice(0, 6);

    return (
        <>
            {/* Top Header */}
            <header className="top-header">
                <div>
                    <h1 className="header-title">Live Iligan Dispatch View</h1>
                    <p className="header-subtitle">Real-time driver location, ongoing rides, and live dispatch logs.</p>
                </div>

                {/* Search Bar */}
                <div className="header-actions">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Search ride ID, driver, address..."
                            className="search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                    const q = searchQuery.toLowerCase();
                                    const matchedDriver = onlineDrivers.find(d =>
                                        (d.driverName || '').toLowerCase().includes(q) ||
                                        (d.driverVehicle || '').toLowerCase().includes(q)
                                    );
                                    if (matchedDriver) {
                                        focusDriverOnMap(matchedDriver);
                                    }
                                }
                            }}
                            style={{ paddingLeft: '32px' }}
                        />
                        <MdSearch size={18} color="#888" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
                    </div>
                    <div className="admin-profile-icon"></div>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* Left Column (Stats + Map) */}
                <div className="grid-left">
                    {/* Stats Row */}
                    <div className="stats-row">
                        <div className="stat-card">
                            <h3>Active Drivers</h3>
                            <div className="stat-value">{liveStats.activeDrivers}</div>
                            <div className="stat-trend positive">Live Tracking Active</div>
                        </div>

                        <div className="stat-card">
                            <h3>Ongoing Rides</h3>
                            <div className="stat-value">{liveStats.ongoingRides}</div>
                            <div className="stat-trend neutral">Active on road</div>
                        </div>

                        <div className="stat-card">
                            <h3>Daily Revenue</h3>
                            <div className="stat-value">
                                ₱{Number(liveStats.dailyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="stat-trend positive">Completed rides today</div>
                        </div>
                    </div>

                    {/* Live Interactive Rider Map */}
                    <div
                        className="map-container"
                        style={{
                            minHeight: '420px',
                            height: '420px',
                            position: 'relative',
                            border: '1px solid #E0E0E0',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Leaflet Mount Container */}
                        <div
                            ref={mapContainerRef}
                            style={{ width: '100%', height: '100%', zIndex: 1 }}
                        />

                        {/* Top-Left Live Status Overlay Pill */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '12px',
                                left: '54px',
                                zIndex: 500,
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(4px)',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#111827',
                                border: '1px solid #E5E7EB'
                            }}
                        >
                            <span
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: onlineDrivers.length > 0 ? '#10B981' : '#9CA3AF',
                                    boxShadow: onlineDrivers.length > 0 ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none'
                                }}
                            />
                            {onlineDrivers.length > 0
                                ? `${onlineDrivers.length} Rider${onlineDrivers.length > 1 ? 's' : ''} Online on Map`
                                : 'Waiting for riders to press GO ONLINE...'}
                        </div>

                        {/* Top-Right Recenter Map Button */}
                        <button
                            onClick={handleRecenterMap}
                            title="Recenter Map / Fit Online Riders"
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                zIndex: 500,
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '7px 11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#1B6E45',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                            }}
                        >
                            <MdMyLocation size={16} />
                            <span>{onlineDrivers.length > 0 ? 'Fit Riders' : 'Iligan Center'}</span>
                        </button>

                        {/* Bottom-Left Online Rider Quick-Select Chips */}
                        {onlineDrivers.length > 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '12px',
                                    right: '12px',
                                    zIndex: 500,
                                    display: 'flex',
                                    gap: '8px',
                                    overflowX: 'auto',
                                    paddingBottom: '2px',
                                    pointerEvents: 'auto'
                                }}
                            >
                                {onlineDrivers.map((driver) => {
                                    const isOnTrip = driver.status === 'ON_TRIP';
                                    return (
                                        <button
                                            key={driver.driverId}
                                            onClick={() => focusDriverOnMap(driver)}
                                            style={{
                                                background: 'rgba(17, 24, 39, 0.9)',
                                                color: '#FFFFFF',
                                                border: `1.5px solid ${isOnTrip ? '#60A5FA' : '#34D399'}`,
                                                borderRadius: '18px',
                                                padding: '5px 12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                            }}
                                            title="Click to locate rider on map"
                                        >
                                            <span>{driver.vehicleType === 'SINGLE' ? '🏍️' : '🛺'}</span>
                                            <span>{driver.driverName || 'Active Rider'}</span>
                                            <span
                                                style={{
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    borderRadius: '8px',
                                                    background: isOnTrip ? '#2563EB' : '#059669',
                                                    color: '#FFF'
                                                }}
                                            >
                                                {isOnTrip ? 'ON TRIP' : 'ONLINE'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Dispatch Logs) */}
                <div className="grid-right">
                    <div className="logs-card">
                        <div className="logs-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Recent Dispatch Logs</h3>
                                <span style={{ fontSize: '11px', color: '#888' }}>
                                    {filteredLogs.length} total rides
                                </span>
                            </div>

                            <div className="filter-wrapper">
                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ACCEPTED">Assigned</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>

                                <button
                                    className="refresh-logs-btn"
                                    onClick={handleManualRefresh}
                                    title="Refresh logs"
                                >
                                    <MdRefresh
                                        size={18}
                                        style={{
                                            transform: isRefreshing ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.4s ease'
                                        }}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="logs-list">
                            {loadingLogs && dispatchLogs.length === 0 ? (
                                <div className="logs-loading">Loading live dispatch logs...</div>
                            ) : recentLogs.length === 0 ? (
                                <div className="logs-empty">No dispatch logs found</div>
                            ) : (
                                recentLogs.map((log) => {
                                    const meta = getStatusMeta(log.status);
                                    const pickupShort = log.pickup_address ? log.pickup_address.split(',')[0] : 'Pickup';
                                    const dropoffShort = log.dropoff_address ? log.dropoff_address.split(',')[0] : 'Dropoff';

                                    return (
                                        <div
                                            key={log.id}
                                            className="log-item"
                                            onClick={() => setSelectedRide(log)}
                                            style={{ cursor: 'pointer' }}
                                            title="Click to view full ride details"
                                        >
                                            <div className="log-left">
                                                <div className={`log-status-dot ${meta.dotClass}`} />
                                                <div className="log-details">
                                                    <h4>{formatRideId(log.id)}</h4>
                                                    <p>{meta.label} • {pickupShort} to {dropoffShort}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                <div className="log-time">{formatTimeAgo(log.created_at)}</div>
                                                {log.base_fare > 0 && (
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1B6E45' }}>
                                                        ₱{parseFloat(log.base_fare).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <button
                            className="view-all-btn"
                            onClick={() => setShowAllModal(true)}
                        >
                            View All Logs ({filteredLogs.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Ride Detail Modal */}
            {selectedRide && (
                <div className="admin-modal-overlay" onClick={() => setSelectedRide(null)}>
                    <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Ride {formatRideId(selectedRide.id)}</h3>
                                <span style={{ fontSize: '11px', color: '#888' }}>ID: {selectedRide.id}</span>
                            </div>
                            <button className="admin-modal-close" onClick={() => setSelectedRide(null)}>
                                <MdClose size={22} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Status</label>
                                <div style={{ marginTop: '4px' }}>
                                    <span className={`badge ${getStatusMeta(selectedRide.status).badgeClass}`}>
                                        {getStatusMeta(selectedRide.status).label}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Fare & Payment</label>
                                <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 700, color: '#111' }}>
                                    ₱{parseFloat(selectedRide.base_fare || 0).toFixed(2)} ({selectedRide.payment_method || 'CASH'})
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Passenger</label>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: '#222', fontWeight: 500 }}>
                                    {selectedRide.passenger_name || 'Passenger'}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Assigned Driver</label>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: '#222', fontWeight: 500 }}>
                                    {selectedRide.driver_name || 'Unassigned / Not matched'}
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Pickup Location</label>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: '#333', background: '#F8F9FA', padding: '8px 12px', borderRadius: '6px' }}>
                                    {selectedRide.pickup_address || 'Not specified'}
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Drop-off Destination</label>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: '#333', background: '#F8F9FA', padding: '8px 12px', borderRadius: '6px' }}>
                                    {selectedRide.dropoff_address || 'Not specified'}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Created At</label>
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                    {selectedRide.created_at ? new Date(selectedRide.created_at).toLocaleString() : 'N/A'}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Completed At</label>
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                    {selectedRide.completed_at ? new Date(selectedRide.completed_at).toLocaleString() : 'Not completed yet'}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button
                                onClick={() => setSelectedRide(null)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#1B6E45',
                                    color: '#FFFFFF',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View All Logs Modal */}
            {showAllModal && (
                <div className="admin-modal-overlay" onClick={() => setShowAllModal(false)}>
                    <div className="admin-modal-box" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>All Dispatch Logs</h3>
                                <span style={{ fontSize: '11px', color: '#888' }}>
                                    Showing {filteredLogs.length} total records
                                </span>
                            </div>
                            <button className="admin-modal-close" onClick={() => setShowAllModal(false)}>
                                <MdClose size={22} />
                            </button>
                        </div>

                        <div style={{ maxHeight: '60vh', overflowY: 'auto', marginTop: '12px' }}>
                            {filteredLogs.length === 0 ? (
                                <div className="logs-empty">No logs found matching your filter criteria.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {filteredLogs.map(log => {
                                        const meta = getStatusMeta(log.status);
                                        return (
                                            <div
                                                key={log.id}
                                                className="log-item"
                                                onClick={() => {
                                                    setSelectedRide(log);
                                                    setShowAllModal(false);
                                                }}
                                                style={{ cursor: 'pointer', padding: '12px' }}
                                            >
                                                <div className="log-left">
                                                    <div className={`log-status-dot ${meta.dotClass}`} />
                                                    <div className="log-details">
                                                        <h4>{formatRideId(log.id)} • <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#555' }}>{log.passenger_name || 'Passenger'} → {log.driver_name || 'Unassigned'}</span></h4>
                                                        <p>{meta.label} • {log.pickup_address} → {log.dropoff_address}</p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1B6E45' }}>
                                                        ₱{parseFloat(log.base_fare || 0).toFixed(2)}
                                                    </span>
                                                    <div className="log-time">{formatTimeAgo(log.created_at)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button
                                onClick={() => setShowAllModal(false)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#1B6E45',
                                    color: '#FFFFFF',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
