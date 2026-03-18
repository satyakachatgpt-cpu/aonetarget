import React, { useState, useEffect, useRef } from 'react';

interface Chat {
  id: string;
  studentId: string;
  studentName: string;
  lastMessage: string;
  lastMessageBy: string;
  unreadAdmin: number;
  unreadStudent: number;
  updatedAt: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'student' | 'admin';
  message: string;
  createdAt: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const AVATAR_COLORS = [
  { bg: '#EDE9FE', color: '#5B21B6' },
  { bg: '#DBEAFE', color: '#1D4ED8' },
  { bg: '#D1FAE5', color: '#065F46' },
  { bg: '#FEE2E2', color: '#991B1B' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#FCE7F3', color: '#9D174D' },
];
const avColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 65) % AVATAR_COLORS.length];

const ChatSupport: React.FC<Props> = ({ showToast }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChats();
    const p = setInterval(fetchChats, 5000);
    return () => { clearInterval(p); if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markRead(selectedChat.id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchMessages(selectedChat.id), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedChat?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchChats = async () => {
    try {
      const r = await fetch('/api/chats');
      const d = await r.json();
      setChats(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchMessages = async (id: string) => {
    try {
      const r = await fetch(`/api/chats/${id}/messages`);
      const d = await r.json();
      setMessages(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/chats/${id}/read`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerType: 'admin' })
      });
      setChats(p => p.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c));
    } catch (_) { }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: 'admin', senderName: 'Admin', senderType: 'admin', message: newMessage.trim() })
      });
      if (r.ok) { setNewMessage(''); await fetchMessages(selectedChat.id); fetchChats(); inputRef.current?.focus(); }
    } catch (_) { showToast('Failed to send message', 'error'); } finally { setSending(false); }
  };

  const fmtTime = (d: string) => {
    const dt = new Date(d), now = new Date();
    if (dt.toDateString() === now.toDateString())
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (dt.toDateString() === y.toDateString()) return 'Yesterday';
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const fmtMsg = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const totalUnread = chats.reduce((s, c) => s + (c.unreadAdmin || 0), 0);
  const filtered = chats.filter(c =>
    c.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Page Header (same style as Blog Posts) ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
            Chat Support
          </h2>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', fontWeight: 500 }}>
            Total {chats.length} conversation{chats.length !== 1 ? 's' : ''}
            {totalUnread > 0 && (
              <span style={{
                marginLeft: 8, background: '#FEE2E2', color: '#DC2626',
                fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 20
              }}>
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>

        {/* Search bar (same as Blog Posts) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span className="material-icons-outlined" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 17, color: '#9CA3AF', pointerEvents: 'none'
            }}>search</span>
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: 240, padding: '9px 14px 9px 36px',
                border: '1.5px solid #E5E7EB', borderRadius: 10,
                fontSize: 13, color: '#374151', outline: 'none',
                fontFamily: 'inherit', background: '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#1A237E')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
        </div>
      </div>

      {/* ── Main Chat Panel ── */}
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 210px)',
        minHeight: 540,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1.5px solid #E5E7EB',
        background: '#fff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>

        {/* ══ Sidebar ══ */}
        <div style={{
          width: 320, minWidth: 320,
          borderRight: '1.5px solid #F3F4F6',
          display: 'flex', flexDirection: 'column',
          background: '#FAFAFA',
        }}>

          {/* Sidebar header row */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1.5px solid #F3F4F6',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Conversations
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#1A237E',
              background: '#EEF2FF', padding: '2px 9px', borderRadius: 20
            }}>
              {filtered.length}
            </span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, border: '2.5px solid #E5E7EB',
                  borderTopColor: '#1A237E', borderRadius: '50%',
                  animation: 'chat-spin 0.7s linear infinite'
                }} />
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, padding: 24, textAlign: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: 36, color: '#D1D5DB' }}>chat_bubble_outline</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', margin: 0 }}>
                  {searchQuery ? 'No results found' : 'No conversations yet'}
                </p>
                <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: 0 }}>Student messages will appear here</p>
              </div>
            ) : filtered.map((chat, idx) => {
              const col = avColor(chat.studentName);
              const hasUnread = (chat.unreadAdmin || 0) > 0;
              const isActive = selectedChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    width: '100%', border: 'none', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '11px 14px',
                    background: isActive ? '#EEF2FF' : 'transparent',
                    borderBottom: '1px solid #F3F4F6',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.15s',
                    borderLeft: isActive ? '3px solid #1A237E' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: col.bg, color: col.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0, position: 'relative',
                  }}>
                    {chat.studentName?.charAt(0)?.toUpperCase() || 'S'}
                    {hasUnread && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#DC2626', color: '#fff',
                        fontSize: 8.5, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #FAFAFA',
                      }}>
                        {chat.unreadAdmin}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: 13, fontWeight: hasUnread ? 700 : 600,
                        color: hasUnread ? '#111827' : '#374151',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 150,
                      }}>
                        {chat.studentName || 'Student'}
                      </span>
                      <span style={{
                        fontSize: 10, color: hasUnread ? '#1A237E' : '#C4CAD4',
                        fontWeight: hasUnread ? 700 : 400, flexShrink: 0
                      }}>
                        {fmtTime(chat.updatedAt)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 11.5, margin: 0,
                      color: hasUnread ? '#374151' : '#9CA3AF',
                      fontWeight: hasUnread ? 500 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 190,
                    }}>
                      {chat.lastMessageBy === 'admin' && (
                        <span style={{ color: '#1A237E', fontWeight: 600 }}>You: </span>
                      )}
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ Chat Area ══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
          {selectedChat ? (
            <>
              {/* Chat header — same card-style header as other pages */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 20px',
                borderBottom: '1.5px solid #F3F4F6',
                background: '#fff',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: avColor(selectedChat.studentName).bg,
                  color: avColor(selectedChat.studentName).color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, position: 'relative', flexShrink: 0,
                }}>
                  {selectedChat.studentName?.charAt(0)?.toUpperCase() || 'S'}
                  <span style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 9, height: 9, borderRadius: '50%',
                    background: '#22C55E', border: '2px solid #fff',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    {selectedChat.studentName}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                    Student &nbsp;&middot;&nbsp; ID: {selectedChat.studentId}
                  </p>
                </div>
              </div>


              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '24px 28px',
                display: 'flex', flexDirection: 'column', gap: 4,
                background: '#fff',
              }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="material-icons-outlined" style={{ fontSize: 44, color: '#D1D5DB' }}>chat_bubble_outline</span>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#6B7280', margin: 0 }}>No messages yet</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Send a reply to start the conversation</p>
                  </div>
                ) : messages.map((msg, i) => {
                  const isAdmin = msg.senderType === 'admin';
                  const prev = messages[i - 1];
                  const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                  const col = avColor(msg.senderName);
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                          <span style={{
                            background: '#F3F4F6', color: '#6B7280',
                            fontSize: 11, fontWeight: 500,
                            padding: '3px 14px', borderRadius: 20,
                          }}>
                            {fmtDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div style={{
                        display: 'flex', alignItems: 'flex-end',
                        gap: 8, marginBottom: 2,
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                      }}>
                        {!isAdmin && (
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: col.bg, color: col.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {msg.senderName?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                        )}
                        <div style={{
                          maxWidth: '60%',
                          padding: '9px 14px',
                          fontSize: 13.5,
                          lineHeight: 1.55,
                          wordBreak: 'break-word',
                          background: isAdmin ? '#1A237E' : '#fff',
                          color: isAdmin ? '#fff' : '#1F2937',
                          borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          border: isAdmin ? 'none' : '1.5px solid #E5E7EB',
                          boxShadow: isAdmin
                            ? '0 2px 10px rgba(26,35,126,0.18)'
                            : '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                          <span>{msg.message}</span>
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'flex-end', gap: 3,
                            marginTop: 4, fontSize: 10,
                            color: isAdmin ? 'rgba(255,255,255,0.5)' : '#C4CAD4',
                          }}>
                            <span>{fmtMsg(msg.createdAt)}</span>
                            {isAdmin && (
                              <span className="material-icons-outlined" style={{ fontSize: 12 }}>done_all</span>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#EEF2FF', color: '#1A237E',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, flexShrink: 0,
                          }}>
                            A
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid #F3F4F6',
                background: '#fff',
                display: 'flex', alignItems: 'center', gap: 8,
                flexShrink: 0,
              }}>
                <span className="material-icons-outlined" style={{ fontSize: 20, color: '#C4CAD4', flexShrink: 0, cursor: 'pointer' }}>sentiment_satisfied_alt</span>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  style={{
                    flex: 1,
                    height: 40,
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 10,
                    padding: '0 14px',
                    fontSize: 13.5,
                    color: '#111827',
                    background: '#F9FAFB',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1A237E'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#F9FAFB'; }}
                />

                <span className="material-icons-outlined" style={{ fontSize: 20, color: '#C4CAD4', flexShrink: 0, cursor: 'pointer' }}>attach_file</span>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: 40, height: 40,
                    borderRadius: 10,
                    background: !newMessage.trim() || sending ? '#F3F4F6' : '#111827',
                    border: 'none',
                    cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: !newMessage.trim() || sending ? '#9CA3AF' : '#fff',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {sending
                    ? <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#111', borderRadius: '50%', animation: 'chat-spin 0.7s linear infinite' }} />
                    : <span className="material-icons-outlined" style={{ fontSize: 18 }}>send</span>
                  }
                </button>
              </div>
            </>
          ) : (
            /* Empty state — same minimal style */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, background: '#FAFAFA',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <span className="material-icons-outlined" style={{ fontSize: 36, color: '#D1D5DB' }}>forum</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>Select a Conversation</p>
              <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                Choose a student from the left panel to view their chat
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes chat-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ChatSupport;
