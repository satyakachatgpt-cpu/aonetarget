import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/apiClient';

const NotificationPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [showDeniedModal, setShowDeniedModal] = useState(false);

    const setupPush = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const VAPID_PUBLIC_KEY = 'BEl62i_SJbx89uE8UshmW0fH61Yn3T89-Z3T89-Z3T89-Z3T89-Z3T89-Z3T89-Z3T89-Z3T89-Z3T89-Z';
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: VAPID_PUBLIC_KEY
                    });
                }

                if (subscription) {
                    await notificationsAPI.saveSubscription(subscription.toJSON());
                }
            } catch (swError) {
                console.error('Push Registration error:', swError);
            }
        }
    };

    useEffect(() => {
        const checkPermission = async () => {
            // Give it a tiny delay after app starts for better UX
            setTimeout(() => {
                const notificationsAllowed = localStorage.getItem('notificationsAllowed') === 'true';

                if (notificationsAllowed) {
                    if ('Notification' in window && Notification.permission === 'denied') {
                        setShowDeniedModal(true);
                    }
                    return;
                }

                if ('Notification' in window && Notification.permission === 'denied') {
                    setShowDeniedModal(true);
                    return;
                }

                const hasSeenPrompt = localStorage.getItem('hasSeenNotificationPrompt') === 'true';
                if (!hasSeenPrompt) {
                    setShowPrompt(true);
                } else {
                    // They saw the custom prompt before but didn't allow
                    // Show the white modal every time they visit until they allow
                    setShowDeniedModal(true);
                }
            }, 500); // 500ms delay to feel natural
        };

        checkPermission();
    }, []);

    const handleAllow = async () => {
        if ('Notification' in window) {
            try {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        localStorage.setItem('notificationsAllowed', 'true');
                        await setupPush();
                    } else if (permission === 'denied') {
                        setShowPrompt(false);
                        setShowDeniedModal(true);
                        return;
                    }
                } else if (Notification.permission === 'granted') {
                    localStorage.setItem('notificationsAllowed', 'true');
                    await setupPush();
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        } else {
            localStorage.setItem('notificationsAllowed', 'true');
        }
        setShowPrompt(false);
    };

    const handleDontAllow = () => {
        // Show the white modal immediately since they denied our custom prompt
        setShowPrompt(false);
        setShowDeniedModal(true);
    };

    const handleOpenSettings = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    localStorage.setItem('notificationsAllowed', 'true');
                    await setupPush();
                    setShowDeniedModal(false);
                } else {
                    alert('Please enable notifications in your browser settings for this site.');
                }
            } catch (e) {
                console.error('Error handling settings permission:', e);
            }
        } else {
            alert('Please enable notifications in your browser settings for this site.');
        }
    };

    if (showPrompt) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-[#2C2C2E] w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative mb-4 animate-in slide-in-from-bottom duration-500">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-12 bg-[#3A3A3C] rounded-2xl flex items-center justify-center mb-5">
                            <span className="material-symbols-rounded text-white text-2xl">notifications</span>
                        </div>

                        <h2 className="text-white text-base font-bold leading-snug tracking-tight mb-8 px-2">
                            Allow AONE TARGET INSTITUTE to send you notifications?
                        </h2>

                        <div className="w-full space-y-3">
                            <button
                                onClick={handleAllow}
                                className="w-full py-3.5 bg-[#0A84FF] active:bg-[#007AFF] text-white rounded-[14px] font-bold text-[15px] transition-all"
                            >
                                Allow
                            </button>
                            <button
                                onClick={handleDontAllow}
                                className="w-full py-3.5 bg-[#3A3A3C] active:bg-[#48484A] text-gray-300 rounded-[14px] font-bold text-[15px] transition-all"
                            >
                                Don't allow
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showDeniedModal) {
        return (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-[340px] rounded-sm shadow-2xl p-6 overflow-hidden">
                    <h2 className="text-gray-800 text-xl font-bold mb-4">Notifications Not Available</h2>
                    <p className="text-gray-500 text-base leading-relaxed mb-8">
                        You have previously denied Notifications. Please go to settings to enable.
                    </p>
                    <div className="flex justify-end pr-2">
                        <button
                            onClick={handleOpenSettings}
                            className="text-[#00ACC1] hover:text-[#00838F] font-black text-sm uppercase tracking-widest active:bg-gray-50 px-3 py-2 rounded transition-colors"
                        >
                            SETTINGS
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default NotificationPrompt;
