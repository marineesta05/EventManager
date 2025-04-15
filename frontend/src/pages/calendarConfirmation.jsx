import React from 'react';
import { useNavigate } from 'react-router-dom';

const CalendarConnected = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#d4edda',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#28a745" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
        </div>
        
        <h1 style={{ color: '#28a745', fontSize: '24px', marginBottom: '20px' }}>
          Google Calendar connecté avec succès!
        </h1>
        
        <p style={{ color: '#555', marginBottom: '25px', fontSize: '16px', lineHeight: '1.5' }}>
          Votre compte Google Calendar a été connecté avec succès. Vous pouvez maintenant ajouter automatiquement vos réservations d'événements à votre agenda.
        </p>
        
        <button 
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 25px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0069d9'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

export default CalendarConnected;