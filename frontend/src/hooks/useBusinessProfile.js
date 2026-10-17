import { useState, useEffect } from 'react';
import api from '../api';

export const COPYRIGHT_TEXT = '© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.';

let cachedProfile = null;
let fetchPromise = null;

export function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62') && digits.length >= 9) digits = '62' + digits;
  return digits;
}

export function useBusinessProfile() {
  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api.get('/settings/business-profile')
        .then((data) => {
          cachedProfile = data;
          return data;
        })
        .catch(() => {
          cachedProfile = {
            name: 'CV. Nara Teknindotama',
            brand: 'NARA AC',
            phone: '0813-8529-3137',
            whatsapp: '6281385293137',
            email: 'narateknindotama@gmail.com',
            website: 'www.narateknindotama.com',
            address: 'Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat',
            nib: '2805250066735',
            npwp: '10.000.000.0-258.288',
          };
          return cachedProfile;
        })
        .finally(() => {
          fetchPromise = null;
        });
    }

    fetchPromise.then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  const whatsappNumber = profile?.phone ? normalizeWhatsAppNumber(profile.phone) : '6281385293137';

  return { profile, whatsappNumber, loading, copyrightText: COPYRIGHT_TEXT };
}

export function buildWhatsAppUrl(whatsappNumber, message) {
  const base = `https://wa.me/${whatsappNumber || '6281385293137'}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

export default useBusinessProfile;
