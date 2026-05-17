import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://embroider-scann-app.onrender.com';

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(
      `Server returned a non-JSON response for ${response.url}. Check API routing and base URL.`,
      response.status,
      text,
    );
  }
};

export const getAuthToken = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new ApiError('Authentication token is missing.', 401, null);
  }

  return token;
};

const normalizeApiPath = (path: string) => {
  let normalizedPath = path.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  normalizedPath = normalizedPath.replace(/\/+/g, '/');
  return normalizedPath;
};

export const apiRequest = async <T = any>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.auth !== false) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  }

  const normalizedPath = normalizeApiPath(path);
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error?: unknown }).error)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
};
