import { FaMotorcycle } from "react-icons/fa6";
import {
    MdOutlineTerminal,
    MdOutlineBadge,
    MdOutlineRoute,
    MdSettings,
    MdLogout
} from "react-icons/md";
import { NavLink, Outlet } from 'react-router-dom';
import '../css/dashboard.css';

export default function DashboardLayout({ onLogout }) {
    let adminName = 'Administrator';
    try {
        const raw = localStorage.getItem('adminData');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.full_name) adminName = parsed.full_name;
            else if (parsed.name) adminName = parsed.name;
            else if (parsed.email) adminName = parsed.email.split('@')[0];
        }
    } catch (_) {}

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

                    <button
                        onClick={onLogout}
                        className="nav-item"
                        style={{
                            background: 'none',
                            border: 'none',
                            width: '100%',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginTop: 'auto',
                            color: '#FFCDD2',
                            padding: '12px 16px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title="Sign out of Admin Dashboard"
                    >
                        <MdLogout size={20} />
                        <span>Log Out</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="secure-badge">
                        <div className="secure-header">
                            <span className="status-dot"></span>
                            <strong>Terminal Secure</strong>
                        </div>
                        <p className="secure-text">Signed in as <strong>{adminName}</strong></p>
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
