# EmbroideryTech Mobile Application

## 📱 Overview

EmbroideryTech is a comprehensive mobile application designed for embroidery screen management and quality control. The app enables technicians to scan, categorize, and manage embroidery screens with real-time monitoring and reporting capabilities.

## 🎯 Key Features

### 🔐 Authentication & Security
- **Professional Login System**: Secure technician authentication with role-based access
- **Warning Modal**: Professional warning popup on login reminding technicians that all operations are monitored
- **Session Management**: Secure session handling with automatic timeout

### 📊 Real-Time Screen Management
- **Barcode Scanning**: Camera-based barcode scanning for quick screen identification
- **Screen Categorization**: 
  - ✅ **Healthy Screens**: Production-ready screens
  - 🔧 **Reparable Screens**: Screens that need repair
  - ❌ **Beyond Repair**: Screens that need to be written off
- **Real-Time Statistics**: Live dashboard showing scan counts and screen statuses

### 🔔 Smart Notification System
- **Professional Reminders**: 30-minute interval reminders for admin notifications and report generation
- **Actionable Notifications**: Click-to-clear notification system with tick (✅) functionality
- **Real-Time Alerts**: Instant notifications for important operations

### 📋 Session Management
- **Work Sessions**: Start/stop work sessions with automatic timing
- **Session Tracking**: Real-time session duration and activity monitoring
- **Session History**: Complete audit trail of all work sessions

### 📈 Reporting & Analytics
- **Daily Reports**: Generate comprehensive daily activity reports
- **Weekly Reports**: Weekly summary reports for management
- **Monthly Reports**: Monthly analytics and trends
- **PDF Export**: Professional PDF report generation and sharing
- **Email Integration**: Direct email sending to administrators

### 🗂️ Data Management
- **Screen Inventory**: Complete screen database with status tracking
- **Bulk Operations**: Mass screen deletion and management
- **Data Export**: Export functionality for backup and analysis
- **Database Cleanup**: Automatic database maintenance every 7 days

## 🏗️ Architecture

### Frontend (React Native)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v7
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: AsyncStorage for local data persistence
- **UI Components**: Custom components with professional styling

### Backend (Node.js)
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API architecture
- **Security**: bcryptjs for password hashing

### Additional Services
- **Desktop Backend**: Separate admin interface backend
- **Sync Service**: Data synchronization between mobile and desktop systems
- **Real-time Updates**: Live data synchronization

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- MongoDB database
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Mobile App Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EmbroideryTech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   API_BASE_URL=https://embroider-scann-app.onrender.com
   EXPO_PROJECT_ID=fe1daac5-a2c1-4dd4-9603-d5091a7438b7
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   
   # For web
   npm run web
   ```

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## 📱 App Structure

```
EmbroideryTech/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Authentication screen
│   │   ├── RegisterScreen.tsx       # User registration
│   │   ├── CameraScanner.tsx        # Barcode scanning
│   │   └── navigation/
│   │       ├── HomeScreen.tsx       # Main dashboard
│   │       └── AuthNavigator.tsx    # Navigation setup
├── backend/
│   ├── src/
│   │   ├── controllers/             # API controllers
│   │   ├── models/                  # Database models
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Authentication middleware
│   │   └── server.js                # Main server file
├── desktop-backend/                 # Admin interface backend
├── sync-service/                    # Data synchronization service
└── assets/                          # App assets and images
```

## 🔧 Key Components

### Authentication System
- **LoginScreen**: Professional login interface with warning modal
- **JWT Token Management**: Secure token handling and storage
- **Role-based Access**: Different permissions for technicians and admins

### HomeScreen Dashboard
- **Real-time Statistics**: Live counters for scans and screen statuses
- **Session Management**: Start/stop work sessions
- **Notification Center**: Smart notification system with tick-to-clear
- **Quick Actions**: Direct access to scanning and reporting features

### Camera Scanner
- **Barcode Recognition**: Real-time barcode scanning
- **Manual Input**: Fallback manual barcode entry
- **Status Classification**: Automatic screen status categorization
- **Sound Feedback**: Audio confirmation for successful scans

### Reporting System
- **Multiple Report Types**: Daily, weekly, and monthly reports
- **PDF Generation**: Professional PDF report creation
- **Email Integration**: Direct email sending to administrators
- **Data Export**: CSV and PDF export options

## 🎨 UI/UX Features

### Professional Design
- **Modern Interface**: Clean, professional design with intuitive navigation
- **Responsive Layout**: Optimized for various screen sizes
- **Color-coded Status**: Visual indicators for different screen statuses
- **Smooth Animations**: Professional animations and transitions

### User Experience
- **Intuitive Navigation**: Easy-to-use interface for technicians
- **Real-time Feedback**: Immediate visual and audio feedback
- **Professional Modals**: Well-designed popup interfaces
- **Accessibility**: Support for different user needs

## 🔒 Security Features

### Data Protection
- **Encrypted Storage**: Secure local data storage
- **API Security**: Protected API endpoints with JWT authentication
- **Session Management**: Secure session handling
- **Input Validation**: Comprehensive input sanitization

### Monitoring & Audit
- **Activity Logging**: Complete audit trail of all operations
- **Admin Monitoring**: Real-time monitoring by administrators
- **Data Backup**: Automatic data backup and recovery
- **Error Handling**: Comprehensive error handling and logging

## 📊 Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: String,
  department: String,
  avatar: String
}
```

### Screen Model
```javascript
{
  barcode: String,
  status: String, // 'healthy', 'reparable', 'beyondRepair'
  scannedBy: String,
  scannedAt: Date,
  sessionId: String
}
```

### Session Model
```javascript
{
  userId: String,
  startTime: Date,
  endTime: Date,
  totalScans: Number,
  status: String
}
```

## 🚀 Deployment

### Mobile App Deployment
1. **Build for production**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

2. **Submit to app stores**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

### Backend Deployment
1. **Deploy to cloud platform** (e.g., Render, Heroku, AWS)
2. **Configure environment variables**
3. **Set up MongoDB Atlas database**
4. **Configure domain and SSL**

## 🔧 Configuration

### App Configuration
- **API Endpoints**: Configure backend URLs
- **Notification Settings**: Customize reminder intervals
- **Report Settings**: Configure report generation parameters
- **Session Timeout**: Set session duration limits

### Backend Configuration
- **Database Connection**: MongoDB connection settings
- **JWT Settings**: Token expiration and secret configuration
- **CORS Settings**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting configuration

## 📈 Performance Optimization

### Mobile App
- **Image Optimization**: Compressed assets and lazy loading
- **Memory Management**: Efficient state management
- **Network Optimization**: Optimized API calls and caching
- **Battery Optimization**: Efficient background processing

### Backend
- **Database Indexing**: Optimized database queries
- **Caching**: Redis caching for frequently accessed data
- **Load Balancing**: Horizontal scaling capabilities
- **Monitoring**: Performance monitoring and alerting

## 🐛 Troubleshooting

### Common Issues
1. **Camera not working**: Check camera permissions
2. **Scan not registering**: Verify barcode format
3. **Login issues**: Check network connection and credentials
4. **Report generation fails**: Verify email configuration

### Debug Mode
Enable debug mode for detailed logging:
```javascript
// In development
console.log('Debug information');
```

## 📞 Support

### Technical Support
- **Documentation**: Comprehensive API documentation
- **Error Logging**: Automatic error reporting
- **User Guides**: Step-by-step user instructions
- **FAQ**: Frequently asked questions

### Contact Information
- **Email**: support@embroiderytech.com
- **Phone**: +1-800-EMBROIDERY
- **Website**: www.embroiderytech.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 Changelog

### Version 1.0.0
- Initial release
- Basic scanning functionality
- User authentication
- Session management
- Reporting system
- Notification system

## 🔮 Future Enhancements

### Planned Features
- **Offline Mode**: Work without internet connection
- **Advanced Analytics**: Machine learning for screen quality prediction
- **Multi-language Support**: Internationalization
- **Push Notifications**: Real-time push notifications
- **Integration APIs**: Third-party system integrations

### Technical Improvements
- **Performance Optimization**: Enhanced app performance
- **Security Enhancements**: Additional security measures
- **UI/UX Improvements**: Enhanced user interface
- **Testing Coverage**: Comprehensive test suite

---

**EmbroideryTech** - Professional Screen Management for Modern Embroidery Operations

*Built with ❤️ for the embroidery industry*
