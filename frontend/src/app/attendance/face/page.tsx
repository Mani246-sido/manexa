'use client';
import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useMutation } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api';
import { Camera, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function FaceAttendancePage() {
  const webcamRef = useRef<any>(null);
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [result, setResult] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const faceMutation = useMutation({
    mutationFn: (data: object) => attendanceApi.markByFace(data),
    onSuccess: (res) => setResult(res.data),
    onError: (err: any) => setResult({ error: err.response?.data?.message || 'Failed' }),
  });

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setResult(null);
    faceMutation.mutate({ image: imageSrc, class: cls, section });
  }, [webcamRef, cls, section, faceMutation]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">Face Recognition Attendance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Point camera at students to auto-mark attendance</p>
      </div>

      {/* Filters */}
      <div className="card flex gap-4">
        <input className="input flex-1" placeholder="Class (optional)" value={cls}
          onChange={e => setCls(e.target.value)} />
        <input className="input flex-1" placeholder="Section (optional)" value={section}
          onChange={e => setSection(e.target.value)} />
      </div>

      {/* Camera */}
      <div className="card space-y-4">
        <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--surface2)', minHeight: 300 }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.8}
            className="w-full rounded-xl"
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={() => setCameraReady(false)}
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p style={{ color: 'var(--muted)' }}>Camera loading...</p>
            </div>
          )}
        </div>

        <button onClick={capture} disabled={!cameraReady || faceMutation.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          style={{ background: 'var(--accent)' }}>
          {faceMutation.isPending
            ? <><Loader size={18} className="animate-spin" /> Processing...</>
            : <><Camera size={18} /> Capture & Recognize</>}
        </button>
      </div>

      {/* Results */}
      {result && !result.error && (
        <div className="card space-y-3">
          <h3 className="font-bold text-white">Recognition Results</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {result.recognized?.length || 0} recognized • {result.unrecognized || 0} unrecognized
          </p>
          <div className="space-y-2">
            {(result.recognized || []).map((s: any) => (
              <div key={s.studentId} className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: '#22c55e10', border: '1px solid #22c55e30' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>#{s.rollNumber}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: '#22c55e' }}>{s.confidence}%</span>
              </div>
            ))}
          </div>
          {result.unrecognized > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl"
              style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
              <XCircle size={16} style={{ color: '#ef4444' }} />
              <span className="text-sm" style={{ color: '#ef4444' }}>{result.unrecognized} face(s) not recognized</span>
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="card" style={{ border: '1px solid #ef444440', background: '#ef444410' }}>
          <p className="text-sm text-red-400">{result.error}</p>
        </div>
      )}
    </div>
  );
}
