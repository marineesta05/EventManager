import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GoogleCallback = () => {
  const [status, setStatus] = useState('Processing');
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state'); // Récupérer l'ID utilisateur
        
        if (!code) {
          throw new Error('No authorization code found');
        }
  
        // Envoyer le code au backend pour échange contre les tokens
        const response = await axios.post('http://localhost:3003/auth/google/tokens', {
          code,
          userId: state
        });
  
        // Rediriger vers la page de confirmation
        navigate('/calendar-connected');
      } catch (err) {
        console.error('Error:', err);
        setError(err.message || 'Authentication failed');
      }
    };
  
    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <h2 style={{ color: '#dc3545' }}>Authentication Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Loading indicator while processing
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px 20px',
      maxWidth: '500px',
      margin: '100px auto'
    }}>
      <h2>Processing Google Calendar Authentication</h2>
      <p>Please wait while we complete the connection...</p>
      <div style={{ 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 2s linear infinite',
        margin: '20px auto'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleCallback;