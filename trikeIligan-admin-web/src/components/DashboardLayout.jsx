import { FaMotorcycle } from "react-icons/fa6";
import {
    MdOutlineTerminal,
    MdOutlineBadge,
    MdOutlineRoute,
    MdSettings,
    MdOutlineMap
} from "react-icons/md";
import { NavLink, Outlet } from 'react-router-dom';
import '../css/dashboard.css';

export default function DashboardLayout() {
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
                    <NavLink to="/dashboard/monitoring" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MdOutlineTerminal size={20} />
                        <span>Terminal (Monitoring)</span>
                    </NavLink>
                    <NavLink to="/dashboard/verification" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MdOutlineBadge size={20} />
                        <span>Verification</span>
                    </NavLink>
                    <NavLink to="/dashboard/analytics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MdOutlineRoute size={20} />
                        <span>Analytics</span>
                    </NavLink>
                    <NavLink to="/dashboard/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MdSettings size={20} />
                        <span>Settings</span>
                    </NavLink>
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

            {/* Main Content Area via Outlet */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
