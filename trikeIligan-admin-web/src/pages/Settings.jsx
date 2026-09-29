import React, { useEffect, useState } from 'react';
import '../css/dashboard.css';

export default function Settings() {
    const [config, setConfig] = useState({ base_fare: 20.0, per_km_rate: 5.0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('https://trikeiligan.onrender.com/api/admin/config');
            const result = await res.json();
            if (result.status === 'success') {
                setConfig({
                    base_fare: parseFloat(result.data.base_fare),
                    per_km_rate: parseFloat(result.data.per_km_rate)
                });
            }
        } catch (error) {
            console.error("Error fetching config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('https://trikeiligan.onrender.com/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setMessage('Configuration saved successfully!');
            }
        } catch (error) {
            console.error("Error saving config:", error);
            setMessage('Error saving configuration.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 32 }}>Loading settings...</div>;

    return (
        <div style={{ padding: '32px', maxWidth: 600 }}>
            <h1 className="header-title" style={{ marginBottom: 8 }}>System Configuration</h1>
            <p className="header-subtitle" style={{ marginBottom: 32 }}>Adjust global pricing rules for all rides.</p>
            
            <form onSubmit={handleSave} style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Base Fare (₱)</label>
                    <input 
                        type="number" 
                        step="0.5"
                        value={config.base_fare} 
                        onChange={(e) => setConfig({ ...config, base_fare: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 16 }}
                    />
                    <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>The starting price when a passenger books a ride.</p>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Per-Kilometer Rate (₱)</label>
                    <input 
                        type="number" 
                        step="0.5"
                        value={config.per_km_rate} 
                        onChange={(e) => setConfig({ ...config, per_km_rate: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 16 }}
                    />
                    <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Additional charge applied for every kilometer traveled.</p>
                </div>

                <button 
                    type="submit" 
                    disabled={saving}
                    style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: '#1B6E45', color: 'white', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>

                {message && (
                    <p style={{ marginTop: 16, textAlign: 'center', color: message.includes('Error') ? '#DC2626' : '#1B6E45', fontWeight: 500 }}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
