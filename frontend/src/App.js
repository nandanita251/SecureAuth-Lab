import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function App() {
  // --- 1. STATE MANAGEMENT ---
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  // --- 2. CORE FUNCTIONS ---

  // Fetch the latest security logs from Python Backend
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/logs`);
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Audit Log Fetch Error:", err);
    }
  };

  // Initial load of logs when the page opens
  useEffect(() => {
    fetchLogs();
  }, []);

  // Step 1: Submit Email to check if user exists or needs setup
  const handleEmailSubmit = async () => {
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/step1`, { email });
      if (res.data.status === 'setup_required') {
        setQrUri(res.data.qr_uri);
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
      setStep(2);
    } catch (err) {
      setError('Connection Refused: Is the Python server running on port 5000?');
    }
  };

  // Step 2: Verify the 6-digit TOTP code from Google Authenticator
  const verifyCode = async () => {
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/step2`, { email, code });
      if (res.data.success) {
        await fetchLogs(); // Update logs to show success
        setStep(3);
      }
    } catch (err) {
      await fetchLogs(); // Update logs to show failure
      setError('Invalid Authenticator Code. Please try again.');
    }
  };

  // --- 3. UI RENDERING ---
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-800">
      
      {/* MAIN AUTHENTICATION CARD */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 min-h-[450px] flex flex-col justify-between transition-all duration-500">         
        {/* Step Progress Bar */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-2 w-24 rounded-full transition-colors duration-500 ${step >= i ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: IDENTIFICATION */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-2">Secure Login</h2>
            <p className="text-gray-500 mb-6">Enter your email to initiate 3-Factor Authentication.</p>
            <input 
              type="email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="examiner@college.edu" 
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleEmailSubmit} className="w-full mt-4 bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">
              Next Step →
            </button>
          </div>
        )}

        {/* STEP 2: POSSESSION FACTOR (TOTP) */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2">Authenticator App</h2>
            
            {isNewUser ? (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-col items-center text-center">
                <p className="text-sm font-bold text-indigo-600 mb-3 uppercase tracking-tighter">New Device Pairing Required</p>
                <div className="bg-white p-2 rounded-lg shadow-sm border mb-3">
                  <QRCode value={qrUri} size={160} />
                </div>
                <p className="text-[10px] text-gray-500 uppercase">Scan with Google Authenticator or Authy</p>
              </div>
            ) : (
              <p className="text-gray-500 mb-6">Enter the 6-digit code for <br/><span className="font-bold text-slate-700">{email}</span></p>
            )}

            <input 
              className="w-full p-3 border border-gray-300 rounded-lg text-center tracking-[0.75em] text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="000000"
              maxLength="6"
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={verifyCode} className="w-full mt-4 bg-slate-800 text-white p-3 rounded-lg font-bold hover:bg-slate-900 transition">
              Verify Possession Factor
            </button>
          </div>
        )}

        {/* STEP 3: CONTEXTUAL FACTOR (DEVICE) */}
        {step === 3 && (
          <div className="text-center animate-in zoom-in duration-500">
            <h2 className="text-2xl font-bold mb-2">Device Context</h2>
            <p className="text-gray-500 mb-6">Analyzing hardware fingerprint and network integrity...</p>
            
            <div className="bg-slate-900 p-4 rounded-lg text-left mb-6 font-mono text-[10px] leading-relaxed">
               <p className="text-green-400">✓ OS: {navigator.platform}</p>
               <p className="text-green-400">✓ CRYPTO_ENGINE: AES-GCM-256</p>
               <p className="text-indigo-400">● IP_ADDR: 122.170.xxx.xx</p>
               <p className="text-indigo-400">● LOC: Palsana, India</p>
            </div>

            <button onClick={() => setStep(4)} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 shadow-xl transition">
              Confirm Trusted Device
            </button>
          </div>
        )}

        {/* STEP 4: ACCESS GRANTED */}
        {step === 4 && (
          <div className="text-center animate-bounce">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl text-green-600">✓</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Success</h2>
            <p className="text-gray-500 mt-2">MFA Lifecycle Completed.</p>
            <button onClick={() => window.location.reload()} className="mt-8 text-indigo-600 font-bold hover:underline text-sm">
              Restart Security Demo
            </button>
          </div>
        )}
      </div>

      {/* --- REAL-TIME AUDIT LOG CONSOLE --- */}
      <div className="max-w-md w-full mt-8 bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
          <h3 className="text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Live Security Audit Trail
          </h3>
          <button onClick={fetchLogs} className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-tighter transition">
            Sync Logs
          </button>
        </div>
        
        <div className="space-y-3">
          {auditLogs.map((log, index) => (
            <div key={index} className="flex justify-between items-center text-[9px] font-mono group">
              <div className="flex flex-col">
                <span className="text-slate-500">{log.timestamp}</span>
                <span className="text-slate-200 group-hover:text-indigo-300 transition">{log.email}</span>
              </div>
              <div className={`px-2 py-0.5 rounded border ${
                log.status === 'Success' 
                ? 'text-green-400 border-green-900 bg-green-900/20' 
                : 'text-red-400 border-red-900 bg-red-900/20'
              }`}>
                {log.status.toUpperCase()}
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="text-slate-600 text-[10px] text-center italic py-4">Waiting for authentication events...</p>
          )}
        </div>
      </div>

    </div>
  );
}