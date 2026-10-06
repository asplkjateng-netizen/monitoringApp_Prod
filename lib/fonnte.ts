/**
 * Fonnte WhatsApp API Gateway Helper
 * Endpoint resmi: https://api.fonnte.com/send
 */

export interface FonnteSendResponse {
  status: boolean;
  target?: string[];
  message?: string;
  detail?: string;
  error?: string;
}

/**
 * Sanitasi format nomor telepon ke format internasional Indonesia (628xxx)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Mengirim pesan WhatsApp melalui Fonnte API Engine
 * @param targetPhone Nomor telepon tujuan (08xx atau 628xx)
 * @param message Teks pesan yang dikirim
 */
export async function sendWhatsAppMessage(
  targetPhone: string,
  message: string
): Promise<FonnteSendResponse> {
  const token = process.env.FONNTE_API_TOKEN;

  if (!token) {
    console.warn('[Fonnte WA] FONNTE_API_TOKEN belum diatur pada Environment Variables.');
    return { status: false, error: 'FONNTE_API_TOKEN is missing' };
  }

  const target = sanitizePhoneNumber(targetPhone);
  if (!target || target.length < 9) {
    return { status: false, error: 'Nomor telepon tujuan tidak valid' };
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: '62',
      }),
    });

    const data = await response.json();
    return {
      status: data.status === true || data.status === 'true',
      target: data.target,
      message: data.message,
      detail: data.detail,
    };
  } catch (err: any) {
    console.error('[Fonnte WA] Gagal menghubungi server Fonnte:', err.message);
    return {
      status: false,
      error: err.message || 'Network error saat menghubungi api.fonnte.com',
    };
  }
}
