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
            let badgeStatus = 'Sensor Offline';
            if (hall.status !== 'Offline') {
              if (!hall.assigned) {
                badgeStatus = 'Unassigned';
              } else {
                badgeStatus = hall.isInvigilatorPresent ? 'Present' : 'Waiting for Invigilator';
              }
            }

            const isOffline = hall.status === 'Offline';

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
                  {hall.assigned && (
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