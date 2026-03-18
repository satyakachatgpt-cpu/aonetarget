import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
    id: string;
    groupId: string;
    sender: string;
    text: string;
    time: string;
    isAdmin: boolean;
    attachment?: string;
}

interface Group {
    id: string;
    name: string;
}

const CourseGroupChat: React.FC = () => {
    const [message, setMessage] = useState('');
    const [activeGroupId, setActiveGroupId] = useState('1');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [groups, setGroups] = useState<Group[]>([
        { id: '1', name: 'General Discussion' },
        { id: '2', name: 'Doubt Solving' }
    ]);
    const [onlyAdminCanMessage, setOnlyAdminCanMessage] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeGroupId]);

    const handleSendMessage = () => {
        if (!message.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            groupId: activeGroupId,
            sender: 'Admin',
            text: message.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAdmin: true
        };

        setMessages(prev => [...prev, newMessage]);
        setMessage('');
    };

    const handleAddGroup = () => {
        const groupName = prompt('Enter group name:');
        if (groupName && groupName.trim()) {
            const newGroup = {
                id: Date.now().toString(),
                name: groupName.trim()
            };
            setGroups(prev => [...prev, newGroup]);
            setActiveGroupId(newGroup.id);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newMessage: ChatMessage = {
                id: Date.now().toString(),
                groupId: activeGroupId,
                sender: 'Admin',
                text: `Sent an attachment: ${file.name}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isAdmin: true,
                attachment: file.name
            };
            setMessages(prev => [...prev, newMessage]);
            alert(`File "${file.name}" attached successfully!`);
        }
    };

    const currentMessages = messages.filter(m => m.groupId === activeGroupId);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] p-6 animate-fade-in font-sans">
            <h1 className="text-[20px] font-bold text-[#111827] mb-6 tracking-tight">Course Group Chat</h1>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white rounded-[24px] border border-[#e2e8f0] shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden min-h-[500px]">
                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#ffffff]">
                        {currentMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div className="opacity-15 flex flex-col items-center text-center">
                                    <span className="material-symbols-outlined text-[80px] text-[#2c3e50]">forum</span>
                                    <p className="text-[14px] font-black text-[#2c3e50] mt-4 uppercase tracking-[0.2em]">No messages yet in<br />{groups.find(g => g.id === activeGroupId)?.name}</p>
                                </div>
                            </div>
                        ) : (
                            currentMessages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-bold text-gray-500">{msg.sender}</span>
                                        <span className="text-[10px] text-gray-400">{msg.time}</span>
                                    </div>
                                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[14px] font-medium shadow-sm flex flex-col gap-2 ${msg.isAdmin ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                        {msg.attachment && (
                                            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${msg.isAdmin ? 'bg-white/10' : 'bg-white'}`}>
                                                <span className="material-symbols-outlined text-sm">attachment</span>
                                                <span className="truncate max-w-[150px]">{msg.attachment}</span>
                                            </div>
                                        )}
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar Area */}
                    <div className="p-8 pt-0 bg-white">
                        <div className="relative flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl px-3 py-1.5 transition-all shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 group">
                            {/* Attachment Button */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                            >
                                <span className="material-symbols-outlined text-[24px] font-medium">add_circle</span>
                            </button>

                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Enter message here.."
                                className="flex-1 bg-transparent px-3 py-3 outline-none border-none ring-0 text-[15px] font-medium text-gray-700 placeholder:text-gray-400 caret-indigo-500"
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSendMessage}
                                className={`w-10 h-10 flex items-center justify-center transition-all rotate-[-45deg] shrink-0 ${message.trim() ? 'text-indigo-600 active:scale-90 font-bold' : 'text-gray-400'}`}
                            >
                                <span className="material-symbols-outlined text-[26px]">send</span>
                            </button>
                        </div>

                        {/* Admin Toggle */}
                        <div className="flex justify-end items-center gap-3 mt-5 px-1">
                            <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest leading-none">Only Admin Can Message</span>
                            <button
                                onClick={() => setOnlyAdminCanMessage(!onlyAdminCanMessage)}
                                className={`w-11 h-[22px] rounded-full relative transition-all duration-300 shadow-inner ${onlyAdminCanMessage ? 'bg-[#6366f1]' : 'bg-[#e2e8f0]'}`}
                            >
                                <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${onlyAdminCanMessage ? 'left-[22px]' : 'left-[3px]'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Groups Sidebar */}
                <div className="w-[340px] bg-white rounded-[24px] border border-[#e2e8f0] shadow-[0_2px_15px_rgba(0,0,0,0.02)] p-7 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-[17px] font-bold text-[#111827] tracking-tight leading-none">Groups</h3>
                        {/* Add Group Button */}
                        <button
                            onClick={handleAddGroup}
                            className="w-9 h-9 flex items-center justify-center bg-[#f8fafc] text-gray-400 border border-[#f1f5f9] rounded-xl hover:bg-gray-100 hover:text-indigo-600 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        <div className="space-y-3">
                            {groups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => setActiveGroupId(group.id)}
                                    className={`w-full p-4 border rounded-2xl font-bold text-[14px] text-left transition-all active:scale-[0.98] cursor-pointer ${activeGroupId === group.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                >
                                    {group.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                .font-sans {
                    font-family: 'Plus+Jakarta+Sans', sans-serif;
                }

                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
                }
                
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }

                button:disabled {
                    cursor: not-allowed;
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
};

export default CourseGroupChat;
