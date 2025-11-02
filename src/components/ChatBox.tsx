// src/components/ChatBox.tsx

import React, { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

// Importaciones generadas por Amplify
import { messagesByChat, notificationsByUser } from '../graphql/queries.ts';
import { createMessage, createNotification, updateNotification, deleteNotification } from '../graphql/mutations.ts';
import { onCreateMessage } from '../graphql/subscriptions.ts';
// --- CAMBIO #1: Importar el tipo 'ModelSortDirection' ---
import { Message, ModelSortDirection } from '../API.ts';

import './ChatBox.css';


interface ChatBoxProps {
  orderId: string;
  recipientUserId?: string; // ID del usuario que recibirá la notificación
  recipientName?: string; // Nombre del usuario que recibirá la notificación
}

const ChatBox: React.FC<ChatBoxProps> = ({ orderId, recipientUserId, recipientName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooster, setIsBooster] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const setupChat = async () => {
      const client = generateClient();
      setLoading(true);
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      const username = (payload && payload['name']) ? payload['name'] as string : 'UsuarioDesconocido';

      // Detectar si el usuario actual es booster
      const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
      const userIsBooster = groups.includes('BOOSTER') || groups.includes('ADMIN');

      console.log('💬 ChatBox - User info:', { username, groups, userIsBooster });

      setCurrentUser(username);
      setIsBooster(userIsBooster);

      try {
        const response = await client.graphql({
          query: messagesByChat,
          variables: { 
            chatId: orderId,
            // --- CAMBIO #2: Usar el enum en lugar del string ---
            sortDirection: ModelSortDirection.ASC 
          }
        });
        const fetchedMessages = response.data.messagesByChat.items as Message[];
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
      setLoading(false);

      const subscription = client.graphql({
  query: onCreateMessage,
  variables: { filter: { chatId: { eq: orderId } } }
}).subscribe({
  next: ({ data }) => {
    const newMessage = data.onCreateMessage;
    if (newMessage) {
      // --- INICIO DE LA CORRECCIÓN ---
      // Comprobamos que el mensaje no esté ya en la lista para evitar duplicados
      setMessages(prevMessages => {
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages; // Si ya existe, no hacemos nada
        }
        return [...prevMessages, newMessage]; // Si no existe, lo añadimos
      });
      // --- FIN DE LA CORRECCIÓN ---
    }
  },
  error: (error) => console.warn(error)
});

      return () => subscription.unsubscribe();
    };

    setupChat();
  }, [orderId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() === '' || !currentUser) return;

    const messageToSend = {
      chatId: orderId,
      content: currentMessage,
      sender: currentUser,
    };

    try {
      const client = generateClient();
      setCurrentMessage('');

      // 1. Enviar el mensaje
      await client.graphql({
        query: createMessage,
        variables: { input: messageToSend }
      });

      // 2. Crear/Actualizar notificación para el receptor (si tenemos su userId)
      if (recipientUserId) {
        await createOrUpdateChatNotification(
          client,
          recipientUserId,
          orderId,
          currentUser,
          currentMessage
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setCurrentMessage(messageToSend.content);
    }
  };

  // Función auxiliar para crear o actualizar notificación de chat
  const createOrUpdateChatNotification = async (
    client: any,
    userId: string,
    orderId: string,
    senderName: string,
    messageContent: string
  ) => {
    try {
      console.log('💬 Creating/updating chat notification for user:', userId);

      // 1. Buscar si ya existe una notificación de mensaje para este chat
      const existingNotifications = await client.graphql({
        query: notificationsByUser,
        variables: {
          userId: userId,
          sortDirection: ModelSortDirection.DESC,
          limit: 50
        }
      });

      const chatNotification = existingNotifications.data.notificationsByUser.items.find(
        (n: any) => n.type === 'new_message' && n.orderId === orderId && !n.isRead
      );

      const notificationMessage = `Nuevo mensaje de ${senderName}`;

      if (chatNotification) {
        // 2a. Ya existe una notificación no leída del chat → Actualizarla
        console.log('📝 Updating existing chat notification:', chatNotification.id);

        // Eliminar la vieja y crear una nueva (para que aparezca como más reciente)
        await client.graphql({
          query: deleteNotification,
          variables: {
            input: {
              id: chatNotification.id
            }
          }
        });

        // Crear nueva con timestamp actualizado
        await client.graphql({
          query: createNotification,
          variables: {
            input: {
              userId: userId,
              type: 'new_message',
              message: notificationMessage,
              orderId: orderId,
              isRead: false
            }
          }
        });

        console.log('✅ Chat notification replaced successfully');
      } else {
        // 2b. No existe notificación → Crear una nueva
        console.log('📝 Creating new chat notification');

        await client.graphql({
          query: createNotification,
          variables: {
            input: {
              userId: userId,
              type: 'new_message',
              message: notificationMessage,
              orderId: orderId,
              isRead: false
            }
          }
        });

        console.log('✅ Chat notification created successfully');
      }
    } catch (error) {
      console.error('❌ Error creating/updating chat notification:', error);
      // No lanzar error para no bloquear el envío del mensaje
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loader">Cargando chat...</div>
        ) : (
          <>
            {messages.map((msg) => {
              // Determinar el nombre a mostrar
              let displayName = msg.sender;
              if (msg.sender === currentUser) {
                displayName = 'Tú';
              } else if (isBooster) {
                // Si soy booster, mostrar "Cliente" en lugar del nombre real del cliente
                displayName = 'Cliente';
                console.log('🔍 Mensaje del cliente detectado - Ocultando nombre:', msg.sender, '→ Cliente');
              }
              // Si soy cliente, mostrar el nombre real del booster (displayName = msg.sender)

              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${msg.sender === currentUser ? 'sent' : 'received'}`}
                >
                  <div className="sender-name">{displayName}</div>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="chat-input"
        />
        <button type="submit" className="send-button">Enviar</button>
      </form>
    </div>
  );
};

export default ChatBox;