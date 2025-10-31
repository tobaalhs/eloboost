// src/components/CustomerCredentialsForm.tsx

import { useState } from 'react';
import { put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import Swal from 'sweetalert2';
import './CustomerCredentialsForm.css';

interface CustomerCredentialsFormProps {
  orderId: string;
  hasCredentials: boolean;
  onCredentialsSaved: () => void;
}

const CustomerCredentialsForm: React.FC<CustomerCredentialsFormProps> = ({
  orderId,
  hasCredentials,
  onCredentialsSaved
}) => {
  const [gameUsername, setGameUsername] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameUsername.trim() || !gamePassword.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor ingresa tanto el usuario como la contraseña.',
      });
      return;
    }

    // Confirmar antes de guardar
    const result = await Swal.fire({
      icon: 'question',
      title: hasCredentials ? '¿Actualizar credenciales?' : '¿Guardar credenciales?',
      html: `
        <p>Estás a punto de ${hasCredentials ? 'actualizar' : 'guardar'} las credenciales de acceso de tu cuenta de League of Legends.</p>
        <p><strong>Usuario:</strong> ${gameUsername}</p>
        <p style="color: #666; font-size: 0.9em;">Asegúrate de que la información sea correcta.</p>
      `,
      showCancelButton: true,
      confirmButtonText: hasCredentials ? 'Actualizar' : 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4CAF50',
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener el token de autenticación
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const restOperation = put({
        apiName: 'eloboostApi',
        path: `/order/${orderId}/credentials`,
        options: {
          headers: {
            Authorization: token || ''
          },
          body: {
            gameUsername,
            gamePassword,
          }
        }
      });

      await restOperation.response;

      Swal.fire({
        icon: 'success',
        title: hasCredentials ? 'Credenciales actualizadas' : 'Credenciales guardadas',
        text: 'Tus credenciales han sido guardadas de forma segura. El booster asignado podrá verlas cuando tome tu orden.',
        confirmButtonColor: '#4CAF50',
      });

      // Limpiar formulario
      setGameUsername('');
      setGamePassword('');
      setShowPassword(false);

      // Notificar al padre para refrescar datos
      onCredentialsSaved();

    } catch (error: any) {
      console.error('Error al guardar credenciales:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudieron guardar las credenciales. Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="credentials-form-container">
      <div className="credentials-form-header">
        <h3>
          {hasCredentials ? '🔐 Actualizar Credenciales' : '🔐 Ingresa tus Credenciales'}
        </h3>
        <p className="credentials-subtitle">
          {hasCredentials
            ? 'Puedes actualizar tus credenciales de inicio de sesión si las cambiaste.'
            : 'Ingresa tu usuario y contraseña de League of Legends para que el booster pueda acceder a tu cuenta.'
          }
        </p>
      </div>

      <div className="credentials-warning">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <strong>Importante:</strong>
          <ul>
            <li>Tus credenciales se almacenan de forma encriptada y segura</li>
            <li>Solo el booster asignado a tu orden podrá verlas</li>
            <li><strong>Si tu cuenta tiene código de verificación (2FA)</strong>, deberás proporcionárselo al booster a través del chat en vivo cuando te lo solicite</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="credentials-form">
        <div className="form-group">
          <label htmlFor="gameUsername">
            Usuario de Riot Games
          </label>
          <input
            type="text"
            id="gameUsername"
            value={gameUsername}
            onChange={(e) => setGameUsername(e.target.value)}
            placeholder="Ejemplo: TuUsuario#LAS"
            className="credentials-input"
            disabled={isSubmitting}
            required
          />
          <small className="input-help">
            Ingresa tu nombre de usuario completo incluyendo el tag (Ej: Usuario#TAG)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="gamePassword">
            Contraseña de Riot Games
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="gamePassword"
              value={gamePassword}
              onChange={(e) => setGamePassword(e.target.value)}
              placeholder="Tu contraseña"
              className="credentials-input"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-credentials-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                {hasCredentials ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              hasCredentials ? 'Actualizar Credenciales' : 'Guardar Credenciales'
            )}
          </button>
        </div>
      </form>

      <div className="credentials-security-note">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Tus credenciales están protegidas con encriptación AES-256</span>
      </div>
    </div>
  );
};

export default CustomerCredentialsForm;
