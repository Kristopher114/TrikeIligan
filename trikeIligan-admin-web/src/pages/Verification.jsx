import React, { useEffect, useState } from 'react';
import '../css/dashboard.css';

export default function Verification() {
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingDrivers();
    }, []);

    const fetchPendingDrivers = async () => {
        try {
            const res = await fetch('https://trikeiligan.onrender.com/api/admin/drivers/pending');
            const result = await res.json();
            if (result.status === 'success') {
                setPendingDrivers(result.data);
            }
        } catch (error) {
            console.error("Error fetching pending drivers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (driverId) => {
        try {
            const res = await fetch(`https://trikeiligan.onrender.com/api/admin/drivers/${driverId}/approve`, {
                method: 'POST'
            });
            if (res.ok) {
                setPendingDrivers(pendingDrivers.filter(d => d.user_id !== driverId));
            }
        } catch (error) {
            console.error("Error approving driver:", error);
        }
    };

    const handleReject = async (driverId) => {
        try {
            const res = await fetch(`https://trikeiligan.onrender.com/api/admin/drivers/${driverId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: "Invalid documents" })
            });
            if (res.ok) {
                setPendingDrivers(pendingDrivers.filter(d => d.user_id !== driverId));
            }
        } catch (error) {
            console.error("Error rejecting driver:", error);
        }
    };

    return (
        <div style={{ padding: '32px' }}>
            <h1 className="header-title" style={{ marginBottom: 24 }}>Driver Verification</h1>
            
            {loading ? (
                <p>Loading pending drivers...</p>
            ) : pendingDrivers.length === 0 ? (
                <p>No drivers pending approval.</p>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '12px 8px' }}>Name</th>
                                <th style={{ padding: '12px 8px' }}>License Plate</th>
                                <th style={{ padding: '12px 8px' }}>Documents</th>
                                <th style={{ padding: '12px 8px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingDrivers.map((driver) => (
                                <tr key={driver.driver_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px 8px' }}>{driver.full_name}</td>
                                    <td style={{ padding: '16px 8px' }}>{driver.vehicle_plate || 'N/A'}</td>
                                    <td style={{ padding: '16px 8px' }}>
                                        <button style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}
                                                onClick={() => alert(`Showing license image for ${driver.full_name}`)}>
                                            View License
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px 8px', display: 'flex', gap: 8 }}>
                                        <button 
                                            onClick={() => handleApprove(driver.user_id)}
                                            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1B6E45', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                            Approve
                                        </button>
                                        <button 
                                            onClick={() => handleReject(driver.user_id)}
                                            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontWeight: 600 }}>
                                            Reject
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
