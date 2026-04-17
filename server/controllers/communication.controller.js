import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';

const { ObjectId } = mongoose.Types;

function isAdminRequest(req) {
  return !!(req.admin || req.user?.isAdmin || req.user?.role === 'admin');
}

function studentIdentityVariants(req) {
  return [req.user?.studentId, req.user?.phone].filter(Boolean).map(String);
}

async function assertChatAccess(req, res, chatId) {
  if (isAdminRequest(req)) return true;
  const chat = await db.collection('chats').findOne({ id: chatId });
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return false;
  }
  if (!studentIdentityVariants(req).includes(String(chat.studentId))) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

// --- Messages Controllers ---
export const getMessages = async (req, res) => {
  try {
    const messages = await db.collection('messages').find({}).sort({ createdAt: -1 }).toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const result = await db.collection('messages').insertOne({
      ...req.body,
      createdAt: new Date(),
      read: false
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create message' });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('messages').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const result = await db.collection('messages').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// --- Notifications Controllers ---
export const getNotifications = async (req, res) => {
  try {
    const notifications = await db.collection('notifications').find({}).sort({ createdAt: -1 }).toArray();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const notification = {
      ...req.body,
      createdAt: new Date(),
      isRead: false,
      sent: false
    };
    const result = await db.collection('notifications').insertOne(notification);
    res.status(201).json({ _id: result.insertedId, ...notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

export const sendBatchNotification = async (req, res) => {
  try {
    const { batchId, message } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    const course = await findCourse(batchId);
    let idVariants = [batchId];

    if (course) {
      idVariants = await getRelatedCourseIds(course, batchId);
    }

    const objectIdVariants = idVariants
      .filter(id => /^[a-fA-F0-9]{24}$/.test(id))
      .map(id => new ObjectId(id));

    const query = {
      $or: [
        { enrolledCourses: { $in: idVariants } },
        { enrolledCourses: { $in: objectIdVariants } }
      ]
    };

    const students = await db.collection('students').find(query).toArray();

    if (!students.length) {
      return res.status(404).json({ message: 'No students found for this batch' });
    }

    const notifications = students.map(student => {
      const uId = String(student.id || student._id);
      return {
        userId: uId,
        targetStudentId: uId,
        message,
        batchId,
        createdAt: new Date(),
        isRead: false,
        sent: false
      };
    });

    const result = await db.collection('notifications').insertMany(notifications);
    res.status(201).json({
      success: true,
      message: `${students.length} notifications sent successfully`,
      count: result.insertedCount
    });
  } catch (error) {
    console.error('Error sending batch notification:', error);
    res.status(500).json({ error: 'Failed to send batch notification' });
  }
};

export const updateNotification = async (req, res) => {
  try {
    const id = (req.params.id || '').trim();
    const updateData = { ...req.body };
    delete updateData._id;

    let queryId = id;
    if (/^[a-fA-F0-9]{24}$/.test(id)) {
      queryId = new ObjectId(id);
    }

    const result = await db.collection('notifications').updateOne(
      { _id: queryId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification updated successfully' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const bulkUpdateNotifications = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const bulkOps = updates.map(update => {
      const id = String(update._id || '').trim();
      let queryId = id;
      if (/^[a-fA-F0-9]{24}$/.test(id)) {
        queryId = new ObjectId(id);
      }
      return {
        updateOne: {
          filter: { _id: queryId },
          update: { $set: { ...update, _id: undefined } }
        }
      };
    });

    const result = await db.collection('notifications').bulkWrite(bulkOps);
    res.json({
      success: true,
      message: 'Notifications updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('notifications').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// --- Chat Controllers (Phase 19D) ---

export const getUnreadAdminCount = async (req, res) => {
  try {
    const result = await db.collection('chats').aggregate([
      { $group: { _id: null, total: { $sum: '$unreadAdmin' } } }
    ]).toArray();
    res.json({ unread: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

export const getChats = async (req, res) => {
  try {
    const { studentId } = req.query;
    const query = isAdminRequest(req)
      ? (studentId ? { studentId } : {})
      : { studentId: req.user.studentId };
    const chats = await db.collection('chats').find(query).sort({ updatedAt: -1 }).toArray();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export const startChat = async (req, res) => {
  try {
    const requestedStudentId = req.body.studentId;
    const studentId = isAdminRequest(req) ? requestedStudentId : req.user?.studentId;
    const studentName = isAdminRequest(req) ? req.body.studentName : (req.user?.name || req.body.studentName);
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    const existing = await db.collection('chats').findOne({ studentId });
    if (existing) {
      return res.json(existing);
    }
    const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chat = {
      id: chatId,
      studentId,
      studentName: studentName || 'Student',
      lastMessage: '',
      lastMessageBy: '',
      unreadAdmin: 0,
      unreadStudent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection('chats').insertOne(chat);
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    if (!await assertChatAccess(req, res, req.params.chatId)) return;
    const messages = await db.collection('chatMessages')
      .find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .toArray();

    // Normalization for legacy records (Phase 19D compatibility)
    const normalized = messages.map(msg => {
      const type = msg.senderType;
      const sId = String(msg.senderId || '');
      const sName = String(msg.senderName || '').toLowerCase();

      // Case 1: Explicitly saved correctly as admin
      if (type === 'admin') return msg;

      // Case 2: Strict admin identity patterns
      const isSystemAdmin = sId === 'admin' || sId.startsWith('admin_');
      
      // Case 3: Identity-Name match (Safe combined indicator)
      const isIndicatedAdmin = (sName.includes('admin')) && (sId.toLowerCase().includes('admin'));

      if (isSystemAdmin || isIndicatedAdmin) {
        return { ...msg, senderType: 'admin' };
      }

      // Case 4: Default fallback for any uncertainty is student (safer)
      return { ...msg, senderType: type === 'admin' ? 'admin' : 'student' };
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!await assertChatAccess(req, res, chatId)) return;
    const { senderId, senderName, message } = req.body;
    
    // PRODUCTION-GRADE ROLE ENFORCEMENT
    // 1. Determine role strictly from server-side session, NOT client payload.
    const isVerifiedAdmin = isAdminRequest(req);
    const effectiveSenderType = isVerifiedAdmin ? 'admin' : 'student';

    // 2. Determine safe sender identification markers.
    const effectiveSenderId = isVerifiedAdmin 
      ? (req.admin?.id || req.user?.adminId || 'admin') 
      : (req.user?.studentId || senderId);
    
    // 3. Determine safe display name.
    const effectiveSenderName = isVerifiedAdmin 
      ? (senderName || req.user?.name || 'Admin') 
      : (req.user?.name || senderName || 'Student');

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chatMessage = {
      id: msgId,
      chatId,
      senderId: effectiveSenderId,
      senderName: effectiveSenderName,
      senderType: effectiveSenderType,
      message,
      createdAt: new Date()
    };
    await db.collection('chatMessages').insertOne(chatMessage);

    const unreadField = effectiveSenderType === 'student' ? 'unreadAdmin' : 'unreadStudent';
    await db.collection('chats').updateOne(
      { id: chatId },
      {
        $set: {
          lastMessage: message,
          lastMessageBy: effectiveSenderType,
          updatedAt: new Date()
        },
        $inc: { [unreadField]: 1 }
      }
    );

    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const editChatMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { message } = req.body;
    
    if (!await assertChatAccess(req, res, chatId)) return;
    
    const chatMsg = await db.collection('chatMessages').findOne({ id: messageId });
    if (!chatMsg) return res.status(404).json({ error: 'Message not found' });
    
    const isVerifiedAdmin = isAdminRequest(req);
    const isOwner = !isVerifiedAdmin && studentIdentityVariants(req).includes(String(chatMsg.senderId));
    const isAdminEditingOwn = isVerifiedAdmin && chatMsg.senderType === 'admin';

    if (!isOwner && !isAdminEditingOwn) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    const result = await db.collection('chatMessages').updateOne(
      { id: messageId },
      { $set: { message, updatedAt: new Date(), isEdited: true } }
    );
    
    if (result.matchedCount === 0) {
      console.warn(`Edit failed: Message ${messageId} not found in DB`);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Safety: ensure we also update the chat's lastMessage summary if this was the latest message
    const latestMessages = await db.collection('chatMessages')
      .find({ chatId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
      
    if (latestMessages.length > 0 && latestMessages[0].id === messageId) {
      await db.collection('chats').updateOne(
        { id: chatId },
        { $set: { lastMessage: message, updatedAt: new Date() } }
      );
    }

    res.json({ success: true, message: 'Message updated successfully' });
  } catch (error) {
    console.error('Error editing chat message:', error);
    res.status(500).json({ error: 'Server error while saving edit' });
  }
};

export const markChatAsRead = async (req, res) => {
  try {
    if (!await assertChatAccess(req, res, req.params.chatId)) return;
    const readerType = isAdminRequest(req) ? req.body.readerType : 'student';
    const unreadField = readerType === 'admin' ? 'unreadAdmin' : 'unreadStudent';
    await db.collection('chats').updateOne(
      { id: req.params.chatId },
      { $set: { [unreadField]: 0 } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// --- Live Chat Controllers (Phase 19D) ---

export const getLiveChatMessages = async (req, res) => {
  try {
    const messages = await db.collection('liveChatMessages')
      .find({ videoId: req.params.videoId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendLiveChatMessage = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { senderId, senderName, message } = req.body;
    const effectiveSenderId = isAdminRequest(req) ? (senderId || req.user?.adminId || req.user?.id) : req.user?.studentId;
    const effectiveSenderName = isAdminRequest(req) ? (senderName || req.user?.name || 'Admin') : (req.user?.name || senderName || 'Student');
    const chatMessage = {
      videoId,
      senderId: effectiveSenderId,
      senderName: effectiveSenderName,
      message,
      createdAt: new Date()
    };
    await db.collection('liveChatMessages').insertOne(chatMessage);
    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};
