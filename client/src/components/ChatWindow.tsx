
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<any>(null);

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
            if (JSON.stringify(data) !== JSON.stringify(messages)) {
                setMessages(data);
                if (data.length > 0) {
                    await chatsAPI.markRead(cId, 'student');
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !chatId || sending) return;
        setSending(true);
        try {
            const msgData = {
                senderId: student.phone || student.id,
                senderName: student.name,
                senderType: 'student',
                message: newMessage.trim()
            };
            await chatsAPI.sendMessage(chatId, msgData);
            setNewMessage('');
            setUserScrolled(false);
            await fetchMessages(chatId);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

            <div style={{ height: 'calc(100vh - 72px)' }} className="relative bg-white w-full max-w-lg sm:h-[580px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
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
                        messages.map((msg, idx) => (
                            <div key={msg.id} className={`flex ${msg.senderType === 'student' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${msg.senderType === 'student'
                                    ? 'bg-cyan-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{msg.message}</p>
                                    <p className={`text-[9px] mt-1.5 font-bold ${msg.senderType === 'student' ? 'text-white/60' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-3 pb-4 pt-1 bg-white border-t border-gray-100 shrink-0">
                    <div className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type your message..."
                            className="flex-1 bg-gray-100 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-cyan-600 font-medium transition-all"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="w-11 h-11 bg-cyan-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20 hover:bg-cyan-700 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {sending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
