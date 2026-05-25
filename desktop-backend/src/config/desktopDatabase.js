import mongoose from 'mongoose';

export const desktopConnection = mongoose.createConnection();
desktopConnection.set('bufferCommands', false);

let connectionAttempted = false;

export const connectDesktopDatabase = async () => {
  const desktopMongoUri = process.env.DESKTOP_MONGO_URI;
  const dbTimeoutMs = Number(process.env.DESKTOP_DB_TIMEOUT_MS || 5000);

  if (!desktopMongoUri) {
    console.warn('DESKTOP_MONGO_URI is not configured. Asset read APIs will return 503 until a desktop database is configured.');
    return false;
  }

  if (desktopConnection.readyState === 1) {
    return true;
  }

  if (connectionAttempted && desktopConnection.readyState === 2) {
    await desktopConnection.asPromise();
    return desktopConnection.readyState === 1;
  }

  connectionAttempted = true;

  try {
    await desktopConnection.openUri(desktopMongoUri, {
      serverSelectionTimeoutMS: dbTimeoutMs,
    });
    console.log('Desktop asset database connected');
    return true;
  } catch (error) {
    console.error('Desktop asset database connection failed:', error.message);
    return false;
  }
};

export const isDesktopDatabaseReady = () => desktopConnection.readyState === 1;

export const assertDesktopDatabaseReady = () => {
  if (!isDesktopDatabaseReady()) {
    const error = new Error('Desktop asset database is not connected');
    error.statusCode = 503;
    throw error;
  }
};
