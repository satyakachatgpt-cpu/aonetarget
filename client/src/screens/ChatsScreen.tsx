import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'student' | 'admin';
  message: string;
  createdAt: string;
}

const ChatsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const s = JSON.parse(storedStudent);
      setStudent(s);
      initChat(s);
    } else {
      setLoading(false);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const initChat = async (s: any) => {
    try {
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: s.id || s._id, studentName: s.name })
      });
      const chat = await res.json();
      setChatId(chat.id);
      await fetchMessages(chat.id);
      await markRead(chat.id);

      pollRef.current = setInterval(() => {
        fetchMessages(chat.id);
      }, 3000);
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (cId: string) => {
    try {
      const res = await fetch(`/api/chats/${cId}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markRead = async (cId: string) => {
    try {
      await fetch(`/api/chats/${cId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerType: 'student' })
      });
    } catch (e) {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (chatId) markRead(chatId);
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !student || !chatId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: student.id || student._id,
          senderName: student.name,
          senderType: 'student',
          message: newMessage.trim()
        })
      });
      if (res.ok) {
        setNewMessage('');
        await fetchMessages(chatId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const groupedMessages = messages.reduce((acc: { date: string; msgs: ChatMessage[] }[], msg) => {
    const dateStr = formatDate(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateStr, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ height: '100vh' }}>
      <header className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white pt-6 pb-4 px-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-rounded text-white">support_agent</span>
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold">Aone Support</h1>
            <p className="text-[10px] text-white/70">Usually replies within minutes</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e2e8f0\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-rounded animate-spin text-4xl text-[#303F9F]">progress_activity</span>
              <p className="text-sm text-gray-400 mt-3">Loading chat...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-[280px]">
              <div className="w-20 h-20 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-4xl text-[#1A237E]">chat</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Start a Conversation</h3>
              <p className="text-xs text-gray-400">Send a message to connect with our support team. We're here to help!</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-4">
                  <span className="bg-white/80 backdrop-blur-sm text-[10px] text-gray-500 px-4 py-1.5 rounded-full shadow-sm font-medium">
                    {group.date}
                  </span>
                </div>
                {group.msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-3 ${msg.senderType === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.senderType === 'admin' && (
                      <div className="w-7 h-7 bg-[#1A237E] rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                        <span className="text-white text-[10px] font-bold">A1</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2.5 shadow-sm ${
                        msg.senderType === 'student'
                          ? 'bg-[#1A237E] text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-gray-800 rounded-2xl rounded-bl-md'
                      }`}
                    >
                      {msg.senderType === 'admin' && (
                        <p className="text-[10px] font-bold text-[#D32F2F] mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-[9px] mt-1.5 text-right ${
                        msg.senderType === 'student' ? 'text-white/50' : 'text-gray-400'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-3 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px) + 70px)' }}>
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20 text-sm placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-12 h-12 bg-[#1A237E] text-white rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-[#303F9F] transition-colors shadow-lg shadow-[#1A237E]/30 shrink-0"
          >
            <span className="material-symbols-rounded text-xl">{sending ? 'progress_activity' : 'send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatsScreen;
