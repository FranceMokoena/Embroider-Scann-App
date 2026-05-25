
import express from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  deleteMessage,
  getAllMessages,
  getMessageById,
  getNotifications,
  getUnreadCount,
  markMessageAsRead,
  markNotificationAsRead,
  sendBroadcastMessage,
  sendMessage,
} from '../controllers/messagingController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/messages', getAllMessages);
router.post('/messages', sendMessage);
router.get('/messages/:id', getMessageById);
router.patch('/messages/:id/read', markMessageAsRead);
router.delete('/messages/:id', deleteMessage);

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.get('/unread-count', getUnreadCount);

router.post('/broadcast', sendBroadcastMessage);

export default router;
