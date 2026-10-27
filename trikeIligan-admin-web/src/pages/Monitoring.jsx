import React, { useState, useEffect, useCallback } from 'react';
import { MdOutlineMap, MdRefresh, MdClose, MdSearch } from "react-icons/md";
import { io } from 'socket.io-client';
import '../css/dashboard.css';

const BACKEND_URL = 'https://trikeiligan.onrender.com';

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

    const [dispatchLogs, setDispatchLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRide, setSelectedRide] = useState(null);
    const [showAllModal, setShowAllModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
    }, [filterStatus, fetchDispatchLogs]);

    // Real-time WebSocket connection
    useEffect(() => {
        const socket = io(BACKEND_URL);

        socket.on('connect', () => {
            console.log('Connected to dispatch server for live monitoring');
            socket.emit('admin_join'); // Join admin room for stats & logs
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

                    {/* Live Map Area Placeholder */}
                    <div className="map-container" style={{ minHeight: '380px' }}>
                        <div className="map-placeholder">
                            <MdOutlineMap size={48} color="#A5D6A7" style={{ marginBottom: 16 }} />
                            <h3>Live Map Rendering Active</h3>
                            <p>Real-time location stream connected to Iligan City tricycle fleet.</p>
                        </div>
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
