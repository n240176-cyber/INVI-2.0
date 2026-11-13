import React, { useState, useEffect } from 'react';

export default function CoordinatorSettingsPanel({ onSave }) {
    const [settings, setSettings] = useState({
        firstMissingWarningMin: 5,
        criticalWarningMin: 2,
        gracePeriodSec: 10,
        lateArrivalDelaySec: 30
    });

    useEffect(() => {
        fetch('http://localhost:5000/api/thresholds')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(err => console.error("Failed to load thresholds:", err));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/thresholds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await response.json();
            if (data.success) {
                alert("Global threshold settings saved to backend successfully!");
                if (onSave) onSave();
            }
        } catch (err) {
            console.error("Failed to save settings:", err);
            alert("Error connecting to backend server.");
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl my-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Coordinator Threshold Settings</h3>
            <p className="text-sm text-slate-500 mb-6">
                Manage the timing parameters that control when automated warnings and CallMeBot reminders trigger.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            First Warning (Minutes Before Exam)
                        </label>
                        <input
                            type="number"
                            name="firstMissingWarningMin"
                            value={settings.firstMissingWarningMin}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5B1E31]/20 focus:outline-none text-sm"
                            min="1"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Critical Call Warning (Minutes Before Exam)
                        </label>
                        <input
                            type="number"
                            name="criticalWarningMin"
                            value={settings.criticalWarningMin}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5B1E31]/20 focus:outline-none text-sm"
                            min="1"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            BLE Grace Period (Seconds)
                        </label>
                        <input
                            type="number"
                            name="gracePeriodSec"
                            value={settings.gracePeriodSec}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5B1E31]/20 focus:outline-none text-sm"
                            min="0"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Late-Arrival Delay (Seconds)
                        </label>
                        <input
                            type="number"
                            name="lateArrivalDelaySec"
                            value={settings.lateArrivalDelaySec}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#5B1E31]/20 focus:outline-none text-sm"
                            min="0"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#5B1E31] text-white font-medium rounded-xl hover:bg-[#411422] transition text-sm shadow-md"
                    >
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
}