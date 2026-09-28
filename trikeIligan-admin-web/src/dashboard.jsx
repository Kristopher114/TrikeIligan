import { FaMotorcycle } from "react-icons/fa6";
import {
    MdOutlineTerminal,
    MdOutlineBadge,
    MdOutlineRoute,
    MdSettings,
    MdOutlineMap
} from "react-icons/md";
import './dashboard.css';

export default function Dashboard() {
    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo-circle">
                        <FaMotorcycle size={20} color="#1B6E45" />
                    </div>
                    <div className="sidebar-title-container">
                        <h2 className="sidebar-title">TrikeIligan</h2>
                        <span className="sidebar-subtitle">City Dispatch Admin</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">
                        <MdOutlineTerminal size={20} />
                        <span>Terminal</span>
                    </a>
                    <a href="#" className="nav-item">
                        <MdOutlineBadge size={20} />
                        <span>Drivers</span>
                    </a>
                    <a href="#" className="nav-item">
                        <MdOutlineRoute size={20} />
                        <span>Rides</span>
                    </a>
                    <a href="#" className="nav-item">
                        <MdSettings size={20} />
                        <span>Config</span>
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div className="secure-badge">
                        <div className="secure-header">
                            <span className="status-dot"></span>
                            <strong>Terminal Secure</strong>
                        </div>
                        <p className="secure-text">All database backup dispatch channels are fully active.</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Top Header */}
                <header className="top-header">
                    <div>
                        <h1 className="page-title">System Dashboard</h1>
                        <p className="page-subtitle">Manage dispatcher logs, riders, and platform performance stats in real-time.</p>
                    </div>

                    <div className="admin-profile">
                        <div className="admin-info">
                            <strong>Administrator</strong>
                            <span className="admin-status">System Terminal Active <span className="status-dot-green"></span></span>
                        </div>
                        <div className="admin-avatar">
                            <img src="https://i.pravatar.cc/150?img=47" alt="Admin" />
                        </div>
                    </div>
                </header>

                {/* Stats Row */}
                <section className="stats-row">
                    <div className="stat-card">
                        <p className="stat-label">ACTIVE DRIVERS</p>
                        <h2 className="stat-value">34 / 50 Online</h2>
                        <p className="stat-trend trend-up">↗ +12% vs last hour</p>
                    </div>

                    <div className="stat-card">
                        <p className="stat-label">ACTIVE RIDES</p>
                        <h2 className="stat-value">18 Trips</h2>
                        <p className="stat-trend trend-up">↗ +8% vs last hour</p>
                    </div>

                    <div className="stat-card">
                        <p className="stat-label">TODAY'S REVENUE</p>
                        <h2 className="stat-value">₱8,450.00</h2>
                        <p className="stat-trend trend-down">↘ -3% vs yesterday</p>
                    </div>
                </section>

                {/* Bottom Row */}
                <section className="bottom-row">
                    {/* Map View */}
                    <div className="map-card">
                        <div className="card-header">
                            <div className="card-title">
                                <MdOutlineMap size={20} color="#1B6E45" />
                                <h3>Live Iligan Dispatch View</h3>
                            </div>
                            <a href="#" className="card-action">Expand Map</a>
                        </div>
                        <div className="map-container">
                            {/* Placeholder for actual Leaflet/Google Map */}
                            <div className="map-placeholder-bg"></div>
                        </div>
                    </div>

                    {/* Dispatch Logs */}
                    <div className="logs-card">
                        <div className="card-header">
                            <h3>Dispatch Logs</h3>
                            <a href="#" className="card-action">See All (142)</a>
                        </div>
                        <div className="logs-list">
                            {/* Log Item 1 */}
                            <div className="log-item">
                                <div className="log-details">
                                    <h4>Ramon Castillo</h4>
                                    <p className="log-route">Robinsons Mall → St. Michael's College</p>
                                    <span className="log-payment">GCash Auto</span>
                                </div>
                                <div className="log-status-col">
                                    <span className="badge badge-completed">Completed</span>
                                    <strong className="log-amount">₱145.00</strong>
                                </div>
                            </div>

                            {/* Log Item 2 */}
                            <div className="log-item">
                                <div className="log-details">
                                    <h4>Karlo Santos</h4>
                                    <p className="log-route">Suarez Junction → Gaisano Mall Iligan</p>
                                    <span className="log-payment">GCash Auto</span>
                                </div>
                                <div className="log-status-col">
                                    <span className="badge badge-cancelled">Cancelled</span>
                                    <strong className="log-amount">₱120.00</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
