import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Hardware Timeout Threshold (45s to prevent false offline disconnects)
let deviceHeartbeatTimeoutSec = 45; 

// In-Memory Real-Time State for the 5 Exam Halls
let halls = [
    { id: 'HALL-G-01', wing: 'North Wing, Level 1', status: 'Offline', assigned: false, assignment: null, logs: [], isInvigilatorPresent: false, lastHeartbeat: 0, manualOverride: false, beaconSignalStartTime: null },
    { id: 'HALL-G-02', wing: 'West Wing, Level 1', status: 'Offline', assigned: false, assignment: null, logs: [], isInvigilatorPresent: false, lastHeartbeat: 0, manualOverride: false, beaconSignalStartTime: null },
    { id: 'HALL-G-03', wing: 'East Wing, Level 2', status: 'Offline', assigned: false, assignment: null, logs: [], isInvigilatorPresent: false, lastHeartbeat: 0, manualOverride: false, beaconSignalStartTime: null },
    { id: 'HALL-G-04', wing: 'South Wing, Level 2', status: 'Offline', assigned: false, assignment: null, logs: [], isInvigilatorPresent: false, lastHeartbeat: 0, manualOverride: false, beaconSignalStartTime: null },
    { id: 'HALL-G-05', wing: 'Central Wing, Level 3', status: 'Offline', assigned: false, assignment: null, logs: [], isInvigilatorPresent: false, lastHeartbeat: 0, manualOverride: false, beaconSignalStartTime: null }
];

// Helper to find hall flexibly
function findHall(hallId) {
    if (!hallId) return null;
    const cleanSearch = hallId.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return halls.find(h => {
        const cleanId = h.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanId === cleanSearch || h.id.toLowerCase() === hallId.toString().toLowerCase();
    });
}

// Background job: Check if ESP32 hardware nodes have timed out (Offline detection)
setInterval(() => {
    const now = Date.now();
    halls.forEach(hall => {
        if (hall.lastHeartbeat > 0 && (now - hall.lastHeartbeat) > (deviceHeartbeatTimeoutSec * 1000)) {
            if (hall.status !== 'Offline') {
                hall.status = 'Offline';
                hall.isInvigilatorPresent = false;
                hall.beaconSignalStartTime = null;
                hall.logs.unshift({
                    message: `ESP32 hardware heartbeat lost. Hall marked Offline.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        }
    });
}, 3000);

// Background job: Automatically clear expired exams and cleanly reset status
setInterval(() => {
    const now = new Date();
    halls.forEach(hall => {
        if (hall.assigned && hall.assignment) {
            const [year, month, day] = hall.assignment.date.split('-').map(Number);
            const [h, m] = hall.assignment.time.split('-')[0].split(':').map(Number); // Safe time split
            const examStart = new Date(year, month - 1, day, h, m, 0);
            const durationMins = Number(hall.assignment.duration) || 180;
            const examEnd = new Date(examStart.getTime() + durationMins * 60 * 1000);

            if (now > examEnd) {
                const prevInvig = hall.assignment.invigilatorName;
                hall.assigned = false;
                hall.assignment = null;
                hall.isInvigilatorPresent = false;
                hall.manualOverride = false;
                hall.beaconSignalStartTime = null;
                hall.status = hall.status === 'Offline' ? 'Offline' : 'Online';
                
                hall.logs.unshift({
                    message: `Exam finished. Assignment for ${prevInvig} cleared. Hall returned to ${hall.status}.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        }
    });
}, 5000);

// --- API ENDPOINTS ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'coordinator' && password === 'password') {
        res.json({ success: true, role: 'coordinator' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials. Coordinator access only.' });
    }
});

app.get('/api/halls', (req, res) => res.json(halls));

app.get('/api/assignment/:hallId', (req, res) => {
    const hall = findHall(req.params.hallId);
    if (!hall) return res.status(404).json({ assigned: false });
    res.json({
        assigned: hall.assigned,
        assignment: hall.assignment,
        presenceDetected: hall.isInvigilatorPresent,
        logs: hall.logs
    });
});

app.post('/api/assign', (req, res) => {
    const { hallId, invigilatorName, phone, beaconId, examName, date, time, duration } = req.body;
    const hall = findHall(hallId);

    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });
    if (hall.status === 'Offline') {
        return res.status(400).json({ success: false, error: 'Cannot assign! ESP32 hardware node is Offline.' });
    }

    hall.assigned = true;
    hall.assignment = { invigilatorName, phone, beaconId, examName, date, time, duration };
    hall.status = 'Waiting for Invigilator';
    hall.manualOverride = false;
    hall.beaconSignalStartTime = null;
    hall.logs.unshift({
        message: `Assigned ${invigilatorName} (Token: ${beaconId}) for ${examName}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({ success: true, hall });
});

app.post('/api/hall/:hallId/override', (req, res) => {
    const hall = findHall(req.params.hallId);
    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });

    hall.isInvigilatorPresent = true;
    hall.status = 'Present';
    hall.manualOverride = true;
    hall.beaconSignalStartTime = null;
    hall.logs.unshift({
        message: `Coordinator manually forced presence override for hall ${hall.id}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({ success: true, hall });
});

app.post('/api/hall/:hallId/cancel', (req, res) => {
    const hall = findHall(req.params.hallId);
    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });

    const prevInvig = hall.assignment ? hall.assignment.invigilatorName : 'Invigilator';
    hall.assigned = false;
    hall.assignment = null;
    hall.isInvigilatorPresent = false;
    hall.manualOverride = false;
    hall.beaconSignalStartTime = null;
    hall.status = hall.status === 'Offline' ? 'Offline' : 'Online';
    
    hall.logs.unshift({
        message: `Assignment for ${prevInvig} cancelled. Hall returned to ${hall.status}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({ success: true, hall });
});

app.post('/api/hall/:hallId/clear-logs', (req, res) => {
    const hall = findHall(req.params.hallId);
    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });

    hall.logs = [];
    res.json({ success: true, message: 'Logs cleared successfully' });
});

app.post('/api/esp32/heartbeat', (req, res) => {
    const { hallId } = req.body;
    const hall = findHall(hallId);
    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });

    hall.lastHeartbeat = Date.now();
    if (hall.status === 'Offline') {
        hall.status = hall.manualOverride ? 'Present' : (hall.assigned ? (hall.isInvigilatorPresent ? 'Present' : 'Waiting for Invigilator') : 'Online');
        hall.logs.unshift({ message: 'ESP32 Hardware connected online.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
    res.json({ 
        success: true, 
        assigned: hall.assigned, 
        beaconId: hall.assignment ? hall.assignment.beaconId : null 
    });
});

app.post('/api/esp32/presence', (req, res) => {
    const { hallId, present, isInvigilatorPresent } = req.body;
    const hall = findHall(hallId);
    if (!hall) return res.status(404).json({ success: false, error: 'Hall not found' });

    hall.lastHeartbeat = Date.now();
    if (hall.status === 'Offline') hall.status = 'Online';

    const isPresentFlag = present !== undefined ? present : isInvigilatorPresent;

    if (hall.assigned && !hall.manualOverride) {
        const now = Date.now();
        if (isPresentFlag) {
            if (!hall.beaconSignalStartTime) {
                hall.beaconSignalStartTime = now;
            }
            
            const elapsedSec = (now - hall.beaconSignalStartTime) / 1000;
            if (elapsedSec >= 45 && !hall.isInvigilatorPresent) {
                hall.isInvigilatorPresent = true;
                hall.status = 'Present';
                hall.logs.unshift({
                    message: `Invigilator ${hall.assignment.invigilatorName} verified (Continuous 45s BLE signal confirmed).`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        } else {
            hall.beaconSignalStartTime = null;
            if (hall.isInvigilatorPresent) {
                hall.isInvigilatorPresent = false;
                hall.status = 'Waiting for Invigilator';
                hall.logs.unshift({
                    message: `Invigilator beacon lost/out of range!`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        }
    }
    res.json({ success: true, currentStatus: hall.status, verifiedPresent: hall.isInvigilatorPresent });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`INVI Backend running on port ${PORT}`));