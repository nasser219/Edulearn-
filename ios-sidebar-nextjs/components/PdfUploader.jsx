"use client";

import { useState } from 'react';
import { uploadPdf } from '../lib/uploadPdf';

export default function PdfUploader() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [publicUrl, setPublicUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrorMessage('');
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setErrorMessage('');

    try {
      const url = await uploadPdf(file);
      setPublicUrl(url);
      setStatus('success');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setPublicUrl('');
    setErrorMessage('');
  };

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      margin: '2rem auto',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 1.5rem', color: '#1a1a1a', fontWeight: '800' }}>رفع ملف PDF 📄</h3>

      {status === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{
            display: 'block',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            border: '2px dashed #e2e8f0',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {file ? file.name : "اختر ملف PDF للرفع (أقصى حجم 10 ميجا)"}
            </span>
          </label>
          <button 
            onClick={handleUpload}
            disabled={!file}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: file ? '#3b82f6' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: file ? 'pointer' : 'not-allowed',
              transition: 'transform 0.1s, background-color 0.2s'
            }}
          >
            بدء الرفع
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div style={{ padding: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontBold: true }}>جاري الرفع...</p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ padding: '1rem' }}>
          <div style={{ color: '#10b981', fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ color: '#1a1a1a', fontWeight: '700', margin: '0 0 1rem' }}>تم الرفع بنجاح!</p>
          <a 
            href={publicUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '0.8rem',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              wordBreak: 'break-all',
              marginBottom: '1.5rem'
            }}
          >
            عرض الملف المرفوع
          </a>
          <button onClick={reset} style={{
            color: '#64748b',
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}>رفع ملف آخر</button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '1rem' }}>
          <div style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
          <p style={{ color: '#ef4444', fontWeight: '700', margin: '0 0 1rem' }}>فشل الرفع</p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{errorMessage}</p>
          <button onClick={reset} style={{
            padding: '0.8rem 1.5rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}>حاول مرة أخرى</button>
        </div>
      )}
    </div>
  );
}
