import React, { useState, useEffect } from 'react';
import { messagesAPI } from '../../services/apiClient';

interface Message {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Messages: React.FC<Props> = ({ showToast }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await messagesAPI.getAll();
      setMessages(data);
    } catch (error) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.read) {
      try {
        await messagesAPI.update(message.id, { ...message, read: true });
        setMessages(messages.map(m => m.id === message.id ? { ...m, read: true } : m));
      } catch (error) {
        console.error('Failed to mark as read');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await messagesAPI.delete(id);
        showToast('Message deleted successfully!');
        if (selectedMessage?.id === id) setSelectedMessage(null);
        loadMessages();
      } catch (error) {
        showToast('Failed to delete message', 'error');
      }
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 h-[600px] flex animate-fade-in overflow-hidden">
      <div className="w-80 border-r border-gray-50 bg-gray-50/50 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h4 className="text-sm font-black text-navy uppercase tracking-widest">Inbox</h4>
          {unreadCount > 0 && (
            <p className="text-[10px] text-blue-500 font-bold mt-1">{unreadCount} unread messages</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 opacity-50">
              <span className="material-icons-outlined text-4xl text-gray-300">mail</span>
              <p className="text-xs text-gray-400 mt-2">No messages</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                onClick={() => handleSelectMessage(message)}
                className={`p-4 rounded-2xl cursor-pointer transition-all ${
                  selectedMessage?.id === message.id 
                    ? 'bg-navy text-white' 
                    : message.read 
                      ? 'bg-white hover:bg-gray-100' 
                      : 'bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className={`text-xs font-black truncate ${selectedMessage?.id === message.id ? 'text-white' : 'text-navy'}`}>
                    {message.senderName}
                  </p>
                  {!message.read && selectedMessage?.id !== message.id && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                  )}
                </div>
                <p className={`text-[10px] font-bold truncate ${selectedMessage?.id === message.id ? 'text-white/70' : 'text-gray-500'}`}>
                  {message.subject}
                </p>
                <p className={`text-[9px] mt-1 ${selectedMessage?.id === message.id ? 'text-white/50' : 'text-gray-400'}`}>
                  {new Date(message.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <>
            <div className="p-6 border-b border-gray-50 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-navy">{selectedMessage.subject}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  From: {selectedMessage.senderName} ({selectedMessage.senderEmail})
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => handleDelete(selectedMessage.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <span className="material-icons-outlined">delete</span>
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.content}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <span className="material-icons-outlined text-8xl">forum</span>
            <p className="font-black mt-4 uppercase tracking-[0.4em]">Select Conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

