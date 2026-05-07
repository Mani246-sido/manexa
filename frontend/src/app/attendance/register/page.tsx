'use client';
import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useMutation, useQuery } from '@tanstack/react-query';
import { attendanceApi, adminApi } from '@/lib/api';
import { Camera, CheckCircle, Search } from 'lucide-react';

export default function FaceRegisterPage() {
  const webcamRef = useRef<any>(null);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data } = useQuery({
    queryKey: ['students-search', search],
    queryFn: () => adminApi.getUsers({ role: 'student', search }).then(r => r.data),
    enabled: search.length > 1,
  });

  const registerMutation = useMutation({
    mutationFn: (data: object) => attendanceApi.registerFace(data),
    onSuccess: () => { setSuccess(true); setSelectedStudent(null); setTimeout(() => setSuccess(false), 3000); }
  });

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc || !selectedStudent) return;
    registerMutation.mutate({ studentId: selectedStudent._id, image: imageSrc });
  }, [webcamRef, selectedStudent, registerMutation]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">Register Student Face</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Capture a clear face photo to enable face recognition attendance</p>
      </div>

      {/* Student Search */}
      <div className="card space-y-3">
        <label className="text-sm font-medium text-white">Search Student</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="input pl-9" placeholder="Type student name or roll number..."
            value={search} onChange={e => { setSearch(e.target.value); setSelectedStudent(null); }} />
        </div>
        {data?.users && search.length > 1 && !selectedStudent && (
          <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {data.users.slice(0, 5).map((s: any) => (
              <button key={s._id} onClick={() => { setSelectedStudent(s); setSearch(s.name); }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors">
                <p className="text-sm font-medium text-white">{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Roll: {s.rollNumber} | Class {s.class}-{s.section}</p>
              </button>
            ))}
          </div>
        )}
        {selectedStudent && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#6c63ff15', border: '1px solid #6c63ff40' }}>
            <CheckCircle size={16} style={{ color: '#6c63ff' }} />
            <span className="text-sm text-white font-medium">{selectedStudent.name} selected</span>
          </div>
        )}
      </div>

      {/* Camera */}
      {selectedStudent && (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-white">Capture Face for: <span style={{ color: '#6c63ff' }}>{selectedStudent.name}</span></p>
          <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-xl"
              onUserMedia={() => setCameraReady(true)} />
          </div>
          <button onClick={capture} disabled={!cameraReady || registerMutation.isPending}
            className="w-full btn-primary flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)' }}>
            {registerMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Camera size={16} /> Register Face</>}
          </button>
        </div>
      )}

      {success && (
        <div className="card flex items-center gap-3" style={{ border: '1px solid #22c55e40', background: '#22c55e10' }}>
          <CheckCircle style={{ color: '#22c55e' }} />
          <p className="text-sm text-green-400">Face registered successfully!</p>
        </div>
      )}

      {registerMutation.isError && (
        <div className="card" style={{ border: '1px solid #ef444440', background: '#ef444410' }}>
          <p className="text-sm text-red-400">
            {(registerMutation.error as any)?.response?.data?.message || 'Registration failed'}
          </p>
        </div>
      )}
    </div>
  );
}
