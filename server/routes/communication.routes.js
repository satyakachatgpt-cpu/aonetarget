import express from 'express';
import {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getNotifications,
  createNotification,
  sendBatchNotification,
  updateNotification,
  bulkUpdateNotifications,
  deleteNotification,
  getUnreadAdminCount,
  getChats,
  startChat,
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  markChatAsRead,
  getLiveChatMessages,
  sendLiveChatMessage
} from '../controllers/communication.controller.js';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Messages
router.get('/messages', getMessages);
router.post('/messages', adminMiddleware, createMessage);
router.put('/messages/:id', adminMiddleware, updateMessage);
router.delete('/messages/:id', adminMiddleware, deleteMessage);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', adminMiddleware, createNotification);
router.post('/notifications/send', adminMiddleware, sendBatchNotification);
router.put('/notifications/bulk-update', adminMiddleware, bulkUpdateNotifications);
router.put('/notifications/:id', adminMiddleware, updateNotification);
router.delete('/notifications/:id', adminMiddleware, deleteNotification);

// Chats (Phase 19D)
router.get('/chats/unread/admin', adminMiddleware, getUnreadAdminCount);
router.post('/chats/start', authMiddleware, startChat);
router.get('/chats/:chatId/messages', authMiddleware, getChatMessages);
router.post('/chats/:chatId/messages', authMiddleware, sendChatMessage);
router.put('/chats/:chatId/messages/:messageId', authMiddleware, editChatMessage);
router.put('/chats/:chatId/read', authMiddleware, markChatAsRead);

// Live Chat (Phase 19D)
router.get('/live-chat/:videoId/messages', getLiveChatMessages);
router.post('/live-chat/:videoId/messages', authMiddleware, sendLiveChatMessage);

// Dynamic routes after static
router.get('/chats', authMiddleware, getChats);

export default router;
