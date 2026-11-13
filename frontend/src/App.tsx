import React, { useState, useEffect, useRef } from 'react';
import HallStatusBadge from './components/HallStatusBadge';
import {
  Wifi,
  WifiOff,
  Phone,
  MessageSquare,
  Shield,
  LogOut,
  X,
  ChevronRight,
  Edit3,
  Trash2,
  Clock,
} from 'lucide-react';

const API_BASE_URL = 'https://invi-backend-4xf1.onrender.com';

const playAlarmSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const playBeep = (startTime: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, startTime);
      gainNode.gain.setValueAtTime(0.1, startTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    };

    for (let i = 0; i < 12; i++) {
      playBeep(audioCtx.currentTime + (i * 0.8));
    }
  } catch (err) {
    console.error('Audio context error:', err);
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  const [halls, setHalls] = useState<any[]>([]);
  const [selectedHall, setSelectedHall] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  const prevHallsRef = useRef<any[]>([]);

  useEffect(() => {
    fetchHalls();
    const interval = setInterval(fetchHalls, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchHalls = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/halls`);
      const data = await res.json();
      
      if (prevHallsRef.current.length > 0) {
        let shouldAlarm = false;
        data.forEach((newHall: any) => {
          const oldHall = prevHallsRef.current.find((h: any) => h.id === newHall.id);
          if (oldHall) {
            if (oldHall.status !== 'Offline' && newHall.status === 'Offline') {
              shouldAlarm = true;
            }
          }
        });
        if (shouldAlarm) {
          playAlarmSound();
        }
      }
      prevHallsRef.current = data;
      setHalls(data);
    } catch (err) {
      console.error('Error fetching halls:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        alert(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Could not connect to backend server for authentication.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
    setSelectedHall(null);
  };

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedHall?.status === 'Offline') {
      alert('Cannot assign! ESP32 hardware node is Offline.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const invigilatorName = formData.get('invigilatorName') as string;
    const phone = formData.get('phone') as string;
    const examName = formData.get('examName') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const duration = formData.get('duration') as string;
    const hallId = selectedHall.id;

    const payload = {
      hallId,
      invigilatorName,
      phone,
      beaconId: formData.get('beaconId'),
      examName,
      date,
      time,
      duration,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setIsAssignModalOpen(false);
        setSelectedHall(null);
        fetchHalls();

        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Hello ${invigilatorName}, you have been assigned to Exam Hall ${hallId} for ${examName} on ${date} at ${time} (${duration} mins). Please report on time.`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#5B1E31]/10 text-[#5B1E31] mb-3">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">INVI Coordinator Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Automated Exam Security & Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="coordinator"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5B1E31]/20 focus:border-[#5B1E31] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5B1E31]/20 focus:border-[#5B1E31] text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#5B1E31] text-white font-medium rounded-xl hover:bg-[#411422] transition-colors shadow-lg shadow-[#5B1E31]/20 text-sm mt-2"
            >
              Sign In as Coordinator
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5B1E31] text-white flex items-center justify-center font-bold">INVI</div>
          <div>
            <h1 className="text-base font-bold text-gray-900">INVI Examination Monitoring System</h1>
            <p className="text-xs text-gray-500">Coordinator Management Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Examination Hall Nodes</h2>
            <p className="text-sm text-gray-500">Halls reflect real-time ESP32 hardware status and active exam countdowns.</p>
          </div>
        </div>

        <div className="space-y-4">
          {halls.map((hall) => {
            const isOffline = hall.status === 'Offline';
            let badgeStatus = 'Sensor Offline';

            if (isOffline) {
              badgeStatus = 'Sensor Offline';
            } else if (!hall.assigned) {
              badgeStatus = 'Unassigned';
            } else {
              badgeStatus = hall.isInvigilatorPresent ? 'Present' : 'Waiting for Invigilator';
            }

            return (
              <div
                key={hall.id}
                onClick={() => setSelectedHall(hall)}
                className={`rounded-2xl border p-5 transition-all cursor-pointer flex justify-between items-center ${
                  isOffline 
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-emerald-500/50 bg-emerald-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">{hall.id}</h3>
                    <HallStatusBadge status={badgeStatus} />
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{hall.wing}</p>
                  {!isOffline && hall.assigned && (
                    <div className="p-2 bg-[#5B1E31]/5 border border-[#5B1E31]/10 rounded-xl inline-block">
                      <span className="text-[10px] font-bold uppercase text-[#5B1E31] block">Status</span>
                      <span className="text-xs font-semibold text-gray-800">Invigilator Assigned</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-[#5B1E31]">
                  <span>Manage Hall</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {selectedHall && (
        <RoomManagementModal 
          hall={selectedHall} 
          onClose={() => setSelectedHall(null)} 
          onOpenAssign={() => {
            if (selectedHall.status === 'Offline') {
              alert('Cannot assign! ESP32 hardware node is Offline.');
              return;
            }
            setIsAssignModalOpen(true);
          }} 
        />
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900">Assign / Reassign {selectedHall?.id}</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Invigilator Name</label>
                <input name="invigilatorName" required type="text" placeholder="e.g. ram" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Phone Number</label>
                <input name="phone" required type="tel" placeholder="e.g. 9701239500" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">BLE Hardware Token ID</label>
                <input name="beaconId" required type="text" placeholder="e.g. RAM" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Examination Name</label>
                <input name="examName" required type="text" placeholder="e.g. MATHS" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Date</label>
                  <input name="date" required type="date" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Start Time</label>
                  <input name="time" required type="time" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Duration (Minutes)</label>
                <input name="duration" required type="number" defaultValue={180} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#5B1E31] text-white font-medium rounded-xl hover:bg-[#411422] transition-colors text-sm">
                Save & Dispatch Assignment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomManagementModal({ hall, onClose, onOpenAssign }: { hall: any; onClose: () => void; onOpenAssign: () => void }) {
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [presenceDetected, setPresenceDetected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [examProgress, setExamProgress] = useState<string>('Initializing timer...');

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignment/${hall.id}`);
        const data = await res.json();
        if (data.assigned) {
          setAssignmentDetails(data.assignment);
          setPresenceDetected(data.presenceDetected);

          const assignmentDate = data.assignment.date; 
          const startTimeStr = data.assignment.time;   
          
          const [year, month, day] = assignmentDate.split('-').map(Number);
          const [h, m] = startTimeStr.split(':').map(Number);

          const now = new Date();
          const examStart = new Date(year, month - 1, day, h, m, 0);

          const durationMins = Number(data.assignment.duration) || 180;
          const examEnd = new Date(examStart.getTime() + durationMins * 60 * 1000);

          if (now < examStart) {
            const diff = examStart.getTime() - now.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const mins = Math.floor((diff / 1000 / 60) % 60);
            
            if (days > 0) {
              setExamProgress(`Exam starts in ${days}d ${hrs}h ${mins}m`);
            } else {
              setExamProgress(`Exam starts in ${hrs}h ${mins}m`);
            }
          } else if (now >= examStart && now <= examEnd) {
            const elapsed = now.getTime() - examStart.getTime();
            const elapsedHrs = Math.floor(elapsed / (1000 * 60 * 60));
            const elapsedMins = Math.floor((elapsed / 1000 / 60) % 60);
            setExamProgress(`Running: ${elapsedHrs}h ${elapsedMins}m elapsed (${durationMins}m total)`);
          } else {
            setExamProgress('Exam Completed');
            setAssignmentDetails(null); 
          }
        } else {
          setAssignmentDetails(null);
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Error fetching assignment:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignment();
    const interval = setInterval(fetchAssignment, 3000);
    return () => clearInterval(interval);
  }, [hall]);

  const isOffline = hall.status === 'Offline';
  let badgeStatus = 'Sensor Offline';
  if (isOffline) {
    badgeStatus = 'Sensor Offline';
  } else if (!assignmentDetails) {
    badgeStatus = 'Unassigned';
  } else {
    badgeStatus = presenceDetected ? 'Present' : 'Waiting for Invigilator';
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#5B1E31]/10 text-[#5B1E31] flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{hall.id}</h3>
            <p className="text-xs text-gray-500">{hall.wing}</p>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-[#5B1E31] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-[#5B1E31] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            Live Activity History ({logs.length})
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isOffline ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-600" />}
                  <span className="text-sm font-medium text-gray-800">
                    ESP32 Hardware: {isOffline ? 'Offline' : 'Online'}
                  </span>
                </div>
                <HallStatusBadge status={badgeStatus} />
              </div>

              {isLoading ? (
                <p className="text-xs text-gray-400 italic">Syncing telemetry...</p>
              ) : assignmentDetails ? (
                <div className="pt-3 border-t border-gray-200 text-xs space-y-2 text-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Invigilator: {assignmentDetails.invigilatorName}</span>
                    <div className="flex gap-2">
                      <a href={`tel:${assignmentDetails.phone}`} className="p-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                      <a href={`https://api.whatsapp.com/send?phone=${assignmentDetails.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Hello ${assignmentDetails.invigilatorName}, regarding your exam assignment for Hall ${hall.id}.`)}`} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-1 font-medium">
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    </div>
                  </div>
                  <p><strong>Exam:</strong> {assignmentDetails.examName}</p>
                  <p><strong>Token ID:</strong> {assignmentDetails.beaconId}</p>
                  <p><strong>Schedule:</strong> {assignmentDetails.date} at {assignmentDetails.time} ({assignmentDetails.duration} mins)</p>
                  
                  <div className="mt-2 p-2.5 bg-[#5B1E31]/10 border border-[#5B1E31]/20 rounded-lg flex items-center gap-2 text-[#5B1E31] font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>{examProgress}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">No active assignment in this hall. Hall is ready for dispatch.</p>
              )}
            </div>

            {assignmentDetails && !presenceDetected && !isOffline && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/hall/${hall.id}/override`, { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                      alert('Manual presence override applied successfully.');
                    }
                  } catch (err) {
                    console.error('Override error:', err);
                  }
                }}
                className="w-full py-2 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors text-xs"
              >
                ⚠️ Manual Override: Force 'Present' Status
              </button>
            )}

            {!isOffline && (
              <div className="flex gap-2">
                <button
                  onClick={onOpenAssign}
                  className="flex-1 py-3 bg-[#5B1E31] text-white font-medium rounded-xl hover:bg-[#411422] transition-colors shadow-lg shadow-[#5B1E31]/20 text-sm flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> {assignmentDetails ? 'Re-assign / Update' : 'Assign Invigilator'}
                </button>
                {assignmentDetails && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to cancel the assignment for ${hall.id}?`)) {
                        try {
                          const res = await fetch(`${API_BASE_URL}/api/hall/${hall.id}/cancel`, { method: 'POST' });
                          const data = await res.json();
                          if (data.success) {
                            const cleanPhone = assignmentDetails.phone.replace(/\D/g, '');
                            const msg = `Hello ${assignmentDetails.invigilatorName}, your exam assignment for Hall ${hall.id} has been cancelled.`;
                            window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                            setAssignmentDetails(null);
                          }
                        } catch (err) {
                          console.log('Cancel assignment error:', err);
                        }
                      }
                    }}
                    className="px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1.5"
                    title="Cancel Assignment & Notify"
                  >
                    <Trash2 className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Activity Logs ({logs.length})</span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/hall/${hall.id}/clear-logs`, { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                      setLogs([]);
                    }
                  } catch (err) {
                    console.error('Error clearing logs:', err);
                  }
                }}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
              >
                Clear History
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2 text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-400 italic text-center py-4">No activity history logged yet.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-xs">
                    <span className="text-gray-800 font-medium">{log.message}</span>
                    <span className="text-gray-400 font-mono text-[10px]">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}