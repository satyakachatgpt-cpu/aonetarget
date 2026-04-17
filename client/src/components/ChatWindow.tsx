
import React, { useState, useEffect, useRef } from 'react';
import { chatsAPI } from '../services/apiClient';

interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderType: 'student' | 'admin';
    message: string;
    createdAt: string;
    isEdited?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    student: any;
}

const ChatWindow: React.FC<Props> = ({ isOpen, onClose, student }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [actionMenu, setActionMenu] = useState<{ x: number, y: number, msg: ChatMessage } | null>(null);
    const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
    const longPressTimer = useRef<any>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const chatWindowRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<any>(null);
    const messagesRef = useRef<ChatMessage[]>([]); // Ref to track current messages for polling comparison

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open-nav-hide');
            if (student) initializeChat();
        } else {
            document.body.style.overflow = 'unset';
            document.body.classList.remove('modal-open-nav-hide');
            stopPolling();
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.classList.remove('modal-open-nav-hide');
            stopPolling();
        };
    }, [isOpen, student]);

    const [userScrolled, setUserScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userScrolled) {
            scrollToBottom();
        }
    }, [messages]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user is within 50px of bottom, consider them NOT scrolled away
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setUserScrolled(!isAtBottom);
    };

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const startPolling = (cId: string) => {
        stopPolling();
        pollRef.current = setInterval(() => {
            fetchMessages(cId);
        }, 3000);
    };

    const initializeChat = async () => {
        try {
            setLoading(true);
            const chat = await chatsAPI.startChat(student.phone || student.id, student.name);
            setChatId(chat.id);
            await fetchMessages(chat.id);
            await chatsAPI.markRead(chat.id, 'student');
            startPolling(chat.id);
        } catch (error) {
            console.error('Failed to initialize chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (cId: string) => {
        try {
            const data = await chatsAPI.getMessages(cId);
            // Only update state if content changed to avoid unnecessary re-renders/scrolls
            // Using ref to compare against the most recent state (avoiding stale closures)
            if (JSON.stringify(data) !== JSON.stringify(messagesRef.current)) {
                setMessages(data);
                messagesRef.current = data;
                if (data.length > 0) {
                    await chatsAPI.markRead(cId, 'student');
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleCopy = (text: string) => {
        if (!navigator.clipboard) {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
            document.body.removeChild(textArea);
        } else {
            navigator.clipboard.writeText(text).catch(err => console.error('Copy failed', err));
        }
        setActionMenu(null);
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMsg(msg);
        setNewMessage(msg.message);
        setActionMenu(null);
    };

    const cancelEdit = () => {
        setEditingMsg(null);
        setNewMessage('');
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !chatId || sending) return;
        setSending(true);
        try {
            if (editingMsg) {
                await chatsAPI.editMessage(chatId, editingMsg.id, newMessage.trim());
                setEditingMsg(null);
            } else {
                const msgData = {
                    senderId: student.phone || student.id,
                    senderName: student.name,
                    senderType: 'student',
                    message: newMessage.trim()
                };
                await chatsAPI.sendMessage(chatId, msgData);
            }
            setNewMessage('');
            setUserScrolled(false);
            // Delay slightly to allow DB consistency before re-fetch
            setTimeout(() => fetchMessages(chatId), 100);
        } catch (error: any) {
            console.error('Failed to process message:', error);
            const errorMsg = error.message || 'Check your connection.';
            alert(`Could not save message: ${errorMsg}`);
        } finally {
            setSending(false);
        }
    };

    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const handleOpenMenu = (x: number, y: number, msg: ChatMessage) => {
        // Bounds-aware positioning
        const menuWidth = 130;
        const menuHeight = 100;
        
        let top = y;
        let left = x;

        // Container-aware positioning
        if (chatWindowRef.current) {
            const rect = chatWindowRef.current.getBoundingClientRect();
            
            // Adjust X
            if (x + menuWidth > rect.right - 10) {
                left = x - menuWidth;
            }
            if (left < rect.left + 10) {
                left = rect.left + 10;
            }

            // Adjust Y
            if (y + menuHeight > rect.bottom - 10) {
                top = y - menuHeight;
            }
            if (top < rect.top + 10) {
                top = rect.top + 10;
            }
        }

        setMenuStyle({ top, left });
        setActionMenu({ x, y, msg });
    };

    // Long Press Handlers
    const onTouchStart = (e: React.TouchEvent | React.MouseEvent, msg: ChatMessage) => {
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        touchStartPos.current = { x, y };

        longPressTimer.current = setTimeout(() => {
            handleOpenMenu(x, y, msg);
        }, 600); // 600ms long press
    };

    const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!touchStartPos.current) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const dist = Math.sqrt(Math.pow(x - touchStartPos.current.x, 2) + Math.pow(y - touchStartPos.current.y, 2));
        if (dist > 10) { // Cancel if moved more than 10px
            clearTimeout(longPressTimer.current);
        }
    };

    const onTouchEnd = () => {
        clearTimeout(longPressTimer.current);
    };

    const onContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
        e.preventDefault();
        handleOpenMenu(e.clientX, e.clientY, msg);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

            <div 
                ref={chatWindowRef}
                style={{ height: 'calc(100vh - 72px)' }} 
                className="relative bg-white w-full max-w-lg sm:h-[580px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 to-[#0097A7] p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <span className="material-symbols-rounded text-white text-2xl">support_agent</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base">Support Chat</h3>
                            <p className="text-white/70 text-[10px]">Active now</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors">
                        <span className="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>

                {/* Messages */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50"
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-medium">Connecting to support...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
                            <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-rounded text-4xl text-cyan-600">forum</span>
                            </div>
                            <div>
                                <p className="font-bold text-gray-700">Start a Conversation</p>
                                <p className="text-xs text-gray-400 mt-1">Send a message and our team will get back to you shortly.</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isStudent = msg.senderType === 'student';
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                                    onContextMenu={(e) => onContextMenu(e, msg)}
                                    onPointerDown={(e) => onTouchStart(e, msg)}
                                    onPointerMove={onTouchMove}
                                    onPointerUp={onTouchEnd}
                                    onPointerLeave={onTouchEnd}
                                    onPointerCancel={onTouchEnd}
                                >
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md relative group select-none ${isStudent
                                        ? 'bg-cyan-600 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                        <div className={`flex items-center justify-end gap-1 mt-1 ${isStudent ? 'text-white/60' : 'text-gray-400'}`}>
                                            {msg.isEdited && <span className="text-[8px] italic font-medium">Edited</span>}
                                            <span className="text-[9px] font-bold">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isStudent && <span className="material-symbols-rounded text-[12px]">done_all</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Floating Action Menu */}
                {actionMenu && (
                    <div className="fixed inset-0 z-[110]" onClick={() => setActionMenu(null)}>
                        <div
                            className="absolute bg-white rounded-xl shadow-xl py-1 min-w-[130px] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-100"
                            style={menuStyle}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(actionMenu.msg.message); }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 active:bg-gray-100"
                            >
                                <span className="material-symbols-rounded text-lg opacity-60">content_copy</span>
                                <span>Copy</span>
                            </button>
                            {actionMenu.msg.senderType === 'student' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); startEditing(actionMenu.msg); }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-50 active:bg-gray-100"
                                >
                                    <span className="material-symbols-rounded text-lg opacity-60">edit</span>
                                    <span>Edit</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="px-3 pb-4 pt-1 bg-white border-t border-gray-100 shrink-0">
                    {editingMsg && (
                        <div className="flex items-center justify-between px-2 py-1 mb-1 text-[10px] text-cyan-600 font-bold bg-cyan-50 rounded-lg animate-in slide-in-from-bottom-2">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-rounded text-xs">edit</span>
                                Editing Message
                            </span>
                            <button onClick={cancelEdit} className="hover:text-cyan-800">
                                <span className="material-symbols-rounded text-xs">close</span>
                            </button>
                        </div>
                    )}
                    <div className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={editingMsg ? "Edit message..." : "Type your message..."}
                            className="flex-1 bg-gray-100 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-cyan-600 font-medium transition-all"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="w-11 h-11 bg-cyan-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 active:scale-95 disabled:opacity-50 transition-all font-bold"
                        >
                            {sending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : editingMsg ? (
                                <span className="material-symbols-rounded text-xl">check</span>
                            ) : (
                                <span className="material-symbols-rounded text-xl">send</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
