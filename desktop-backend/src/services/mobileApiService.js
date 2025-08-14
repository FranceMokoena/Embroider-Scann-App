import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MobileApiService {
  constructor() {
    this.baseURL = process.env.MOBILE_API_URL || 'http://localhost:5000/api';
    this.apiKey = process.env.MOBILE_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📡 Mobile API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Mobile API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Mobile API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Mobile API Response Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.client.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Login failed');
    }
  }

  async getProfile(token) {
    try {
      const response = await this.client.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get profile');
    }
  }

  // User management methods
  async getAllUsers(token, filters = {}) {
    try {
      const response = await this.client.get('/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch users');
    }
  }

  async createUser(token, userData) {
    try {
      const response = await this.client.post('/auth/users', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create user');
    }
  }

  async updateUser(token, userId, userData) {
    try {
      const response = await this.client.put(`/auth/users/${userId}`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update user');
    }
  }

  async deleteUser(token, userId) {
    try {
      const response = await this.client.delete(`/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete user');
    }
  }

  // Scan management methods
  async getAllScans(token, filters = {}) {
    try {
      const response = await this.client.get('/scan/all', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch scans');
    }
  }

  async getScanById(token, scanId) {
    try {
      const response = await this.client.get(`/scan/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch scan');
    }
  }

  async updateScan(token, scanId, scanData) {
    try {
      const response = await this.client.put(`/scan/${scanId}`, scanData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update scan');
    }
  }

  async deleteScan(token, scanId) {
    try {
      const response = await this.client.delete(`/scan/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete scan');
    }
  }

  async archiveScan(token, scanId) {
    try {
      const response = await this.client.post(`/scan/${scanId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to archive scan');
    }
  }

  // Session management methods
  async getAllSessions(token, filters = {}) {
    try {
      const response = await this.client.get('/sessions/all', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch sessions');
    }
  }

  async getSessionById(token, sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch session');
    }
  }

  // Dashboard statistics
  async getDashboardStats(token) {
    try {
      const response = await this.client.get('/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch dashboard stats');
    }
  }

  // Error handling helper
  handleError(error, defaultMessage) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.error || defaultMessage;
      
      return {
        status,
        message,
        details: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        status: 503,
        message: 'Mobile backend is unavailable',
        details: error.request
      };
    } else {
      // Something else happened
      return {
        status: 500,
        message: defaultMessage,
        details: error.message
      };
    }
  }
}

export default new MobileApiService();

