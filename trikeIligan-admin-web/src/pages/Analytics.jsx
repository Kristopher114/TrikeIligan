import React, { useEffect, useState } from 'react';
import { MdOutlineGetApp } from "react-icons/md";
import '../css/dashboard.css';

export default function Analytics() {
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('https://trikeiligan.onrender.com/api/admin/reports');
            const result = await res.json();
            if (result.status === 'success') {
                setReports(result.data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!reports) return;
        
        // Simple CSV generation
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Metric,Value\n"
            + `Total Rides Completed,${reports.totalRides}\n`
            + `Total Revenue,₱${reports.totalRevenue}\n`
            + `Active Drivers,${reports.activeDrivers}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "trikeiligan_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div style={{ padding: 32 }}>Loading analytics...</div>;

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h1 className="header-title">Analytics & Reports</h1>
                    <p className="header-subtitle">Overview of TrikeIligan's performance</p>
                </div>
                <button 
                    onClick={handleExport}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1B6E45', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                    <MdOutlineGetApp size={20} />
                    Export CSV
                </button>
            </div>
            
            {reports && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                    <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 14, textTransform: 'uppercase' }}>Total Completed Rides</h3>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#0F172A' }}>
                            {reports.totalRides}
                        </div>
                    </div>
                    
                    <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 14, textTransform: 'uppercase' }}>Total Gross Revenue</h3>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#1B6E45' }}>
                            ₱{reports.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 14, textTransform: 'uppercase' }}>Total Active Drivers</h3>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#0F172A' }}>
                            {reports.activeDrivers}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
