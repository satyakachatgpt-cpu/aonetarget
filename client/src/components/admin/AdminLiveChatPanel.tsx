import React, { useState, useEffect, useRef } from 'react';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  message: string;
  role?: string;
  createdAt: string;
}

interface AdminLiveChatPanelProps {
  videoId: string;
  isVisible: boolean;
  onClose: () => void;
}

const AdminLiveChatPanel: React.FC<AdminLiveChatPanelProps> = ({ videoId, isVisible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({ 
      top: scrollContainerRef.current.scrollHeight, 
      behavior: 'smooth' 
    });
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/live-chat/${videoId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const adminName = localStorage.getItem('adminName') || 
                        localStorage.getItem('adminUser') || 
                        'Teacher';
      const response = await fetch(`/api/live-chat/${videoId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senderId: "admin",
          senderName: "Instructor",
          message: inputText,
          role: "admin"
        })
      });

      if (response.ok) {
        setInputText('');
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) {
      console.error('No messageId provided');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      const url = `/api/live-chat/${videoId}/messages/${messageId}`;
      console.log('Deleting message:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Delete response:', response.status, data);
      
      if (response.ok) {
        setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
      } else {
        console.error('Delete failed:', data);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchMessages();
      pollingIntervalRef.current = setInterval(fetchMessages, 4000);
      scrollToBottom();
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isVisible, videoId]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const el = scrollContainerRef.current;
    const isNearBottom = 
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  if (!isVisible) return null;

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-full md:w-[360px] bg-gray-900 border-l border-gray-800 flex flex-col z-[50] shadow-2xl transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <h2 className="text-white font-semibold text-lg">Live Chat</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isAdminMsg = msg.role === 'admin' || msg.senderId === 'admin';
            return (
              <div 
                key={msg._id} 
                className={`flex flex-col gap-0.5 ${isAdminMsg ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    isAdminMsg 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-800 text-gray-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold opacity-75 mb-0.5">
                      {msg.senderName || (isAdminMsg ? 'Instructor' : 'Student')}
                    </span>
                    <p className="text-sm break-words">{msg.message}</p>
                    <span className="text-[10px] opacity-50 mt-1 self-end">
                      {formatTime(msg.createdAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const id = msg._id?.toString() || String(msg._id);
                        console.log('Delete clicked, id:', id, 'full msg:', msg);
                        handleDeleteMessage(id);
                      }}
                      className="text-[9px] text-red-500 hover:text-red-300
                                 px-1 mt-0.5 cursor-pointer select-none block"
                      type="button"
                    >
                      🗑 delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-800 bg-gray-900"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span className="font-medium text-sm">Send</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminLiveChatPanel;
