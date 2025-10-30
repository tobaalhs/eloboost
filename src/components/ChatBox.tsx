// src/components/ChatBox.tsx

import React, { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

// Importaciones generadas por Amplify
import { messagesByChat } from '../graphql/queries.ts';
import { createMessage } from '../graphql/mutations.ts';
import { onCreateMessage } from '../graphql/subscriptions.ts';
// --- CAMBIO #1: Importar el tipo 'ModelSortDirection' ---
import { Message, ModelSortDirection } from '../API.ts';

import './ChatBox.css';


interface ChatBoxProps {
  orderId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ orderId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      setCurrentUser(username);

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
      await client.graphql({
        query: createMessage,
        variables: { input: messageToSend }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setCurrentMessage(messageToSend.content); 
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loader">Cargando chat...</div>
        ) : (
          <>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message-bubble ${msg.sender === currentUser ? 'sent' : 'received'}`}
              >
                <div className="sender-name">{msg.sender === currentUser ? 'Tú' : msg.sender}</div>
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
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