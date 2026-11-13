import React from 'react';

export default function HallStatusBadge({ status }) {
    let badgeClass = "px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ";
    let dotClass = "w-2 h-2 rounded-full ";

    switch (status) {
        case 'Present':
            badgeClass += "bg-emerald-50 text-emerald-700 border border-emerald-200";
            dotClass += "bg-emerald-500 animate-pulse";
            break;
        case 'Waiting for Invigilator':
            badgeClass += "bg-amber-50 text-amber-700 border border-amber-200";
            dotClass += "bg-amber-500 animate-pulse";
            break;
        case 'Warning':
            badgeClass += "bg-orange-50 text-orange-700 border border-orange-200";
            dotClass += "bg-orange-500";
            break;
        case 'Critical':
            badgeClass += "bg-rose-50 text-rose-700 border border-rose-200";
            dotClass += "bg-rose-500 animate-ping";
            break;
        case 'Sensor Offline':
            badgeClass += "bg-slate-100 text-slate-600 border border-slate-200";
            dotClass += "bg-slate-400";
            break;
        case 'Unassigned':
            badgeClass += "bg-slate-100 text-slate-700 border border-slate-200";
            dotClass += "bg-slate-400";
            break;
        default:
            badgeClass += "bg-blue-50 text-blue-700 border border-blue-200";
            dotClass += "bg-blue-500";
    }

    return (
        <span className={badgeClass}>
            <span className={dotClass}></span>
            {status}
        </span>
    );
}