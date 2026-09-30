import React from 'react';
import { MdOutlineMap } from "react-icons/md";
import '../css/dashboard.css';

export default function Monitoring() {
    return (
        <>
            {/* Top Header */}
            <header className="top-header">
                <div>
                    <h1 className="header-title">Live Iligan Dispatch View</h1>
                    <p className="header-subtitle">Real-time driver location and ride matching.</p>
                </div>

                {/* Time / Search placeholder */}
                <div className="header-actions">
                    <input type="text" placeholder="Search driver or ride ID..." className="search-input" />
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
                            <div className="stat-value">24</div>
                            <div className="stat-trend positive">↑ 12% from yesterday</div>
                        </div>
                        <div className="stat-card">
                            <h3>Ongoing Rides</h3>
                            <div className="stat-value">8</div>
                            <div className="stat-trend neutral">Same as average</div>
                        </div>
                        <div className="stat-card">
                            <h3>Daily Revenue</h3>
                            <div className="stat-value">₱4,250</div>
                            <div className="stat-trend positive">↑ 5% from yesterday</div>
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="map-container">
                        <div className="map-placeholder">
                            <MdOutlineMap size={48} color="#A5D6A7" style={{ marginBottom: 16 }} />
                            <h3>Live Map Rendering...</h3>
                            <p>Interactive map of Iligan City plotting active tricycles will appear here.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column (Dispatch Logs) */}
                <div className="grid-right">
                    <div className="logs-card">
                        <div className="logs-header">
                            <h3>Recent Dispatch Logs</h3>
                            <button className="filter-btn">Filter</button>
                        </div>
                        <div className="logs-list">
                            {/* Log Item 1 */}
                            <div className="log-item">
                                <div className="log-icon status-completed"></div>
                                <div className="log-details">
                                    <h4>Ride #TRK-1024</h4>
                                    <p>Completed • Tibanga to Poblacion</p>
                                </div>
                                <div className="log-time">2m ago</div>
                            </div>

                            {/* Log Item 2 */}
                            <div className="log-item">
                                <div className="log-icon status-progress"></div>
                                <div className="log-details">
                                    <h4>Ride #TRK-1025</h4>
                                    <p>In Progress • Suarez to Pala-o</p>
                                </div>
                                <div className="log-time">5m ago</div>
                            </div>

                            {/* Log Item 3 */}
                            <div className="log-item">
                                <div className="log-icon status-pending"></div>
                                <div className="log-details">
                                    <h4>Ride #TRK-1026</h4>
                                    <p>Pending Match • Villa Verde</p>
                                </div>
                                <div className="log-time">Just now</div>
                            </div>
                        </div>
                        <button className="view-all-btn">View All Logs</button>
                    </div>
                </div>
            </div>
        </>
    );
}
