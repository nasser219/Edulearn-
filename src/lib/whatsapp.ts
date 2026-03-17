import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'abcd123456789ABCD';
const LOGIN_URL = 'https://whats-pro.net/backend/public/index.php/api/user/login';
const SEND_URL = 'https://whats-pro.net/backend/public/index.php/api/user/messages/send';
const SEND_QUICK_URL = 'https://whats-pro.net/backend/public/index.php/api/messages/send';

/**
 * Encrypts a payload object using AES encryption.
 */
export const encryptPayload = (data: object): string => {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
};

/**
 * Normalizes a phone number to international format (Egypt by default).
 * Converts 010... to 2010...
 * Also handles +20, 0020, and removes any non-digit characters.
 */
export const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, ''); 
  
  // Handle Egyptian numbers: 
  // If starts with 01... and is 11 digits, prepend 2
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '2' + cleaned;
  }
  // If starts with 20... and is 12 digits, keep as is
  // If starts with 1... and is 10 digits (missing leading 0), prepend 20
  else if (cleaned.length === 10 && (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15'))) {
    cleaned = '20' + cleaned;
  }
  // If starts with 2 and is 12 digits but not 20..., we assume it's already correct or another format
  
  return cleaned;
};

/**
 * Log in to WhatsApp Pro to get a fresh Bearer token.
 */
export const loginWhatsApp = async (email: string, password: string): Promise<string | null> => {
  try {
    const encrypted = encryptPayload({ email, password });
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: encrypted })
    });

    const result = await response.json();
    if (response.ok && result.access_token) {
      return result.access_token;
    }
    console.error('WhatsApp Login Failed:', result);
    return null;
  } catch (error) {
    console.error('WhatsApp Login Error:', error);
    return null;
  }
};

/**
 * High-performance non-encrypted sending optimized for Egypt.
 */
export const sendWhatsAppQuick = async (
  phone: string,
  message: string,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(SEND_QUICK_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        phones: [phone],
        message: message,
        country_code: 'EG' // Optimize for Egypt
      })
    });

    const result = await response.json();
    if (response.ok) {
      return { success: true };
    } else {
      console.error('WhatsApp Quick API Error:', result);
      return { success: false, error: result.message || 'فشل الإرسال السريع' };
    }
  } catch (error: any) {
    console.error('WhatsApp Quick Error:', error);
    return { success: false, error: error.message || 'خطأ في الاتصال بنظام الإرسال السريع' };
  }
};

/**
 * Sends a WhatsApp notification using the WhatsApp Pro API.
 * 
 * @param phone - Recipient phone number in international format (e.g., +2010...)
 * @param message - The text message to send
 * @param credentials - Teacher's WhatsApp Pro credentials
 */
export const sendWhatsAppNotification = async (
  phone: string,
  message: string,
  credentials: { email?: string; password?: string; token?: string }
): Promise<{ success: boolean; error?: string }> => {
  // Use provided token directly if available to skip login and speed up sending
  let token = credentials.token;

  if (!token) {
    if (!credentials.email || !credentials.password) {
      return { success: false, error: 'بيانات تسجيل دخول واتساب (البريد/الباسورد أو التوكن) غير متوفرة في الإعدادات' };
    }
    // Automated login to get a fresh token if no persistent token
    token = await loginWhatsApp(credentials.email, credentials.password) || undefined;
  }
  
  if (!token) {
    return { success: false, error: 'فشل تفعيل نظام واتساب. تأكد من صحة التوكن أو (البريد وكلمة المرور) في الإعدادات.' };
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  // Attempt Quick Send first for maximum speed
  const quickResult = await sendWhatsAppQuick(normalizedPhone, message, token);
  if (quickResult.success) {
    return quickResult;
  }

  console.log('WhatsApp Quick Send failed, falling back to Encrypted Send for:', normalizedPhone);

  // Fallback to Encrypted Send if Quick Send fails
  const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

  // Ensure phone is in an array as required by the API
  const payloadData = {
    send_phone: true,
    phones: [normalizedPhone],
    send_group: false,
    group_id: 0,
    send_client: false,
    client_ids: [],
    img: null,
    client_default_phone: true,
    send_all_clients: false,
    message: message
  };

  try {
    const encrypted = encryptPayload(payloadData);
    
    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      },
      body: JSON.stringify({
        payload: encrypted
      })
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true };
    } else {
      console.error('WhatsApp API Error:', result);
      return { success: false, error: result.message || 'Failed to send message' };
    }
  } catch (error: any) {
    console.error('WhatsApp Notification Error:', error);
    return { success: false, error: error.message || 'Internal error' };
  }
};
