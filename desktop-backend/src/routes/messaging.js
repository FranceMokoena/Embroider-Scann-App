import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  sendMessage,
  getAllMessages,
  getMessageById,
  markMessageAsRead,
  deleteMessage,
  getNotifications,
  markNotificationAsRead,
  getUnreadCount,
  sendBroadcastMessage
} from '../controllers/messagingController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAdmin);

// Message management
router.post('/send', sendMessage);
router.post('/broadcast', sendBroadcastMessage);
router.get('/messages', getAllMessages);
router.get('/messages/:id', getMessageById);
router.put('/messages/:id/read', markMessageAsRead);
router.delete('/messages/:id', deleteMessage);

// Notification management
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);
router.get('/unread-count', getUnreadCount);

export default router;










