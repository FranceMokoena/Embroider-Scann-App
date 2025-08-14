import mobileApiService from '../services/mobileApiService.js';
import moment from 'moment';

// In-memory message storage (in production, use a database)
let messages = [];
let notifications = [];

// Send message to technician(s)
export const sendMessage = async (req, res) => {
  try {
    const { recipients, subject, message, priority = 'normal' } = req.body;

    if (!recipients || !subject || !message) {
      return res.status(400).json({ error: 'Recipients, subject, and message are required' });
    }

    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    // Validate recipients exist
    const allUsers = await mobileApiService.getAllUsers(token);
    const validRecipients = recipients.filter(recipient => 
      allUsers.data?.some(user => user._id === recipient || user.username === recipient)
    );

    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    const newMessage = {
      id: Date.now().toString(),
      from: req.user.username,
      recipients: validRecipients,
      subject,
      message,
      priority,
      timestamp: new Date().toISOString(),
      read: false
    };

    messages.push(newMessage);

    // Create notifications for recipients
    validRecipients.forEach(recipientId => {
      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        recipientId,
        messageId: newMessage.id,
        type: 'admin_message',
        title: `New message from ${req.user.username}`,
        body: subject,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifications.push(notification);
    });

    console.log(`📨 Message sent to ${validRecipients.length} recipients: ${subject}`);

    return res.status(201).json({
      message: 'Message sent successfully',
      messageId: newMessage.id,
      recipientsCount: validRecipients.length
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get all messages (admin view)
export const getAllMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50, priority, read } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filteredMessages = [...messages];

    // Apply filters
    if (priority) {
      filteredMessages = filteredMessages.filter(msg => msg.priority === priority);
    }

    if (read !== undefined) {
      const isRead = read === 'true';
      filteredMessages = filteredMessages.filter(msg => msg.read === isRead);
    }

    // Sort by timestamp (newest first)
    filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginatedMessages = filteredMessages.slice(skip, skip + Number(limit));
    const total = filteredMessages.length;

    return res.json({
      data: paginatedMessages,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Get message by ID
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const message = messages.find(msg => msg.id === id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json(message);

  } catch (error) {
    console.error('❌ Get message error:', error);
    return res.status(500).json({ error: 'Failed to fetch message' });
  }
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = messages.find(msg => msg.id === id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.read = true;
    message.readAt = new Date().toISOString();

    return res.json({ message: 'Message marked as read', messageId: id });

  } catch (error) {
    console.error('❌ Mark message as read error:', error);
    return res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const messageIndex = messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    messages.splice(messageIndex, 1);

    // Also remove related notifications
    notifications = notifications.filter(notif => notif.messageId !== id);

    return res.json({ message: 'Message deleted successfully', messageId: id });

  } catch (error) {
    console.error('❌ Delete message error:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Get notifications for admin
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, read } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filteredNotifications = [...notifications];

    // Apply filters
    if (read !== undefined) {
      const isRead = read === 'true';
      filteredNotifications = filteredNotifications.filter(notif => notif.read === isRead);
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginatedNotifications = filteredNotifications.slice(skip, skip + Number(limit));
    const total = filteredNotifications.length;

    return res.json({
      data: paginatedNotifications,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (error) {
    console.error('❌ Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = notifications.find(notif => notif.id === id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date().toISOString();

    return res.json({ message: 'Notification marked as read', notificationId: id });

  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const unreadMessages = messages.filter(msg => !msg.read).length;
    const unreadNotifications = notifications.filter(notif => !notif.read).length;

    return res.json({
      unreadMessages,
      unreadNotifications,
      total: unreadMessages + unreadNotifications
    });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Send broadcast message to all technicians
export const sendBroadcastMessage = async (req, res) => {
  try {
    const { subject, message, priority = 'normal' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    // Get all technicians
    const allUsers = await mobileApiService.getAllUsers(token);
    const technicians = allUsers.data?.filter(user => 
      user.role === 'technician' || !user.role
    ) || [];

    if (technicians.length === 0) {
      return res.status(400).json({ error: 'No technicians found' });
    }

    const recipientIds = technicians.map(tech => tech._id);

    const newMessage = {
      id: Date.now().toString(),
      from: req.user.username,
      recipients: recipientIds,
      subject,
      message,
      priority,
      timestamp: new Date().toISOString(),
      read: false,
      isBroadcast: true
    };

    messages.push(newMessage);

    // Create notifications for all technicians
    recipientIds.forEach(recipientId => {
      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        recipientId,
        messageId: newMessage.id,
        type: 'broadcast_message',
        title: `Broadcast from ${req.user.username}`,
        body: subject,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifications.push(notification);
    });

    console.log(`📢 Broadcast message sent to ${recipientIds.length} technicians: ${subject}`);

    return res.status(201).json({
      message: 'Broadcast message sent successfully',
      messageId: newMessage.id,
      recipientsCount: recipientIds.length
    });

  } catch (error) {
    console.error('❌ Send broadcast message error:', error);
    return res.status(500).json({ error: 'Failed to send broadcast message' });
  }
};

