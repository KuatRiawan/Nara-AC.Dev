import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Compass, CheckCircle2, Sparkles, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { JABODETABEK_REGIONS, GROUPED_CITIES, findCityData } from '../../data/regionsData';

export default function AddressSelector({ 
  value = '', 
  onChange, 
  error = '', 
  required = true,
  className = ''
}) {
  const [mode, setMode] = useState('structured'); // 'structured' | 'manual'

  const [kota, setKota] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [customKelurahan, setCustomKelurahan] = useState('');
  const [detailJalan, setDetailJalan] = useState('');
  const [patokan, setPatokan] = useState('');
  const [kodePos, setKodePos] = useState('');
  const [manualText, setManualText] = useState(value || '');
  
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geoLocationError, setGeoLocationError] = useState('');

  const isInternalUpdate = useRef(false);

  const cityData = useMemo(() => findCityData(kota), [kota]);

  const availableDistricts = useMemo(() => {
    return cityData?.districts || [];
  }, [cityData]);
  
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoLocationError('Geolocation tidak didukung oleh browser Anda');
      return;
    }
    
    setIsFetchingLocation(true);
    setGeoLocationError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
          );
          
          const data = await response.json();
          
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.hamlet || '';
          const district = address.suburb || address.neighbourhood || '';
          const road = address.road || address.street || '';
          
          const matchedCity = JABODETABEK_REGIONS.find(c => {
            const cName = (c.city || c.name || '').toLowerCase();
            return cName && (city.toLowerCase().includes(cName) || cName.includes(city.toLowerCase()));
          });
          
          if (matchedCity) {
            setKota(matchedCity.city || matchedCity.name);
            setManualText(`${road || ''}${district ? ', ' + district : ''}, ${city}`);
          } else {
            setMode('manual');
            setManualText(`${road || ''}${district ? ', ' + district : ''}, ${city}`);
          }
          
          setIsFetchingLocation(false);
        } catch (err) {
          console.error('Error reverse geocoding:', err);
          setGeoLocationError('Gagal mendapatkan informasi lokasi');
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        setIsFetchingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoLocationError('Izin lokasi ditolak. Silakan izinkan akses lokasi.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoLocationError('Lokasi tidak tersedia');
            break;
          case error.TIMEOUT:
            setGeoLocationError('Waktu permintaan lokasi habis');
            break;
          default:
            setGeoLocationError('Terjadi kesalahan saat mendapatkan lokasi');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const districtData = useMemo(() => {
    return availableDistricts.find(d => d.name === kecamatan) || null;
  }, [availableDistricts, kecamatan]);

  const availableSubdistricts = useMemo(() => {
    return districtData?.subdistricts || [];
  }, [districtData]);

  const handleKotaChange = (e) => {
    const newKota = e.target.value;
    setKota(newKota);
    setKecamatan('');
    setKelurahan('');
    setCustomKelurahan('');
    setKodePos('');
  };

  const handleKecamatanChange = (e) => {
    const newKec = e.target.value;
    setKecamatan(newKec);
    setKelurahan('');
    setCustomKelurahan('');
    const d = availableDistricts.find(item => item.name === newKec);
    if (d && d.postalCode) {
      setKodePos(d.postalCode);
    }
  };

  const assembleAddress = () => {
    if (mode === 'manual') {
      return manualText.trim();
    }

    const parts = [];

    if (detailJalan.trim()) {
      parts.push(detailJalan.trim());
    }

    if (patokan.trim()) {
      parts.push(`(Patokan: ${patokan.trim()})`);
    }

    const activeKel = kelurahan === 'OTHER' ? customKelurahan.trim() : kelurahan.trim();
    if (activeKel) {
      parts.push(`Kel. ${activeKel}`);
    }

    if (kecamatan.trim()) {
      parts.push(`Kec. ${kecamatan.trim()}`);
    }

    if (kota.trim()) {
      parts.push(kota.trim());
    }

    if (cityData?.province) {
      parts.push(cityData.province);
    }

    if (kodePos.trim()) {
      parts.push(kodePos.trim());
    }

    return parts.join(', ');
  };

  useEffect(() => {
    isInternalUpdate.current = true;
    const formatted = assembleAddress();
    if (onChange) {
      onChange(formatted, {
        kota,
        kecamatan,
        kelurahan: kelurahan === 'OTHER' ? customKelurahan : kelurahan,
        detailJalan,
        patokan,
        kodePos,
        mode
      });
    }
  }, [mode, kota, kecamatan, kelurahan, customKelurahan, detailJalan, patokan, kodePos, manualText]);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (value && !detailJalan && !kota && !manualText) {
      setManualText(value);
      const matchedCity = JABODETABEK_REGIONS.find(r => value.includes(r.city));
      if (matchedCity) {
        setKota(matchedCity.city);
        const matchedDist = matchedCity.districts.find(d => value.includes(d.name));
        if (matchedDist) {
          setKecamatan(matchedDist.name);
          const matchedSub = matchedDist.subdistricts.find(s => value.includes(s));
          if (matchedSub) {
            setKelurahan(matchedSub);
          }
        }
      }
      setDetailJalan(value);
    }
  }, [value]);

  const fullPreview = assembleAddress();
  const isComplete = kota && kecamatan && detailJalan.trim();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Alamat Lokasi Servis {required && <span className="text-rose-500">*</span>}
          </span>
          <button
            type="button"
            onClick={fetchCurrentLocation}
            disabled={isFetchingLocation}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs hover:shadow-md"
            aria-label="Gunakan lokasi saya saat ini"
            title="Gunakan lokasi saya saat ini (memerlukan izin lokasi)"
          >
            {isFetchingLocation ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Mendapatkan lokasi...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3 h-3" />
                <span>Gunakan Lokasi Saya</span>
              </>
            )}
          </button>
        </div>
        {geoLocationError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-rose-600 mt-1.5 flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {geoLocationError}
          </motion.p>
        )}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('structured')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'structured' 
                ? 'bg-white text-blue-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pilih Wilayah (Jabodetabek)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              if (!manualText && fullPreview) setManualText(fullPreview);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'manual' 
                ? 'bg-white text-blue-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tulis Bebas / Wilayah Lain
          </button>
        </div>
      </div>

      {mode === 'structured' ? (
        <div className="space-y-3.5 bg-slate-50/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="address-selector-f1" className="text-xs font-bold text-slate-700 block mb-1">
                1. Kota / Kabupaten <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="address-selector-f1"
                  value={kota}
                  onChange={handleKotaChange}
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Kota / Kabupaten --</option>
                  {Object.entries(GROUPED_CITIES).map(([province, cities]) => (
                    <optgroup key={province} label={`--- ${province} ---`}>
                      {cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="address-selector-f2" className="text-xs font-bold text-slate-700 block mb-1">
                2. Kecamatan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="address-selector-f2"
                  value={kecamatan}
                  onChange={handleKecamatanChange}
                  disabled={!kota}
                  className={`w-full h-11 px-3.5 pr-8 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                    !kota 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-900 border-slate-200 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!kota ? '← Pilih Kota terlebih dahulu' : '-- Pilih Kecamatan --'}
                  </option>
                  {availableDistricts.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="address-selector-f3" className="text-xs font-bold text-slate-700 block mb-1">
                3. Kelurahan / Desa
              </label>
              <div className="relative">
                <select
                  id="address-selector-f3"
                  value={kelurahan}
                  onChange={e => setKelurahan(e.target.value)}
                  disabled={!kecamatan}
                  className={`w-full h-11 px-3.5 pr-8 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                    !kecamatan 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-900 border-slate-200 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!kecamatan ? '← Pilih Kecamatan dahulu' : '-- Pilih Kelurahan (Opsional) --'}
                  </option>
                  {availableSubdistricts.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="OTHER">+ Ketik Kelurahan Lainnya...</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {kelurahan === 'OTHER' && (
                <input
                  id="custom-kelurahan-input"
                  name="custom_kelurahan"
                  type="text"
                  placeholder="Ketik nama kelurahan Anda..."
                  value={customKelurahan}
                  onChange={e => setCustomKelurahan(e.target.value)}
                  className="w-full mt-2 h-10 px-3.5 rounded-xl border border-blue-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label htmlFor="address-selector-f4" className="text-xs font-bold text-slate-700 block mb-1">
                Kode Pos (Opsional)
              </label>
              <input
                id="address-selector-f4"
                type="text"
                placeholder="Contoh: 13440"
                value={kodePos}
                onChange={e => setKodePos(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address-selector-f5" className="text-xs font-bold text-slate-700 block mb-1">
              4. Nama Jalan, No. Rumah, RT/RW, Blok / Unit <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="address-selector-f5"
              rows={2}
              value={detailJalan}
              onChange={e => setDetailJalan(e.target.value)}
              placeholder="Contoh: Jl. Pahlawan Revolusi No. 45, RT 03/RW 04, Blok B No. 7..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
            />
          </div>

          <div>
            <label htmlFor="address-selector-f6" className="text-xs font-bold text-slate-700 block mb-1">
              5. Patokan Lokasi / Petunjuk Akses (Sangat Dianjurkan)
            </label>
            <div className="relative">
              <Compass className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="address-selector-f6"
                type="text"
                value={patokan}
                onChange={e => setPatokan(e.target.value)}
                placeholder="Contoh: Pagar hitam seberang Masjid Al-Falah, samping Alfamart, masuk gang ke-2..."
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Membantu teknisi NARA AC menemukan lokasi Anda tanpa tersesat dan tiba tepat waktu.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            id="manual-address-textarea"
            name="manual_address"
            rows={4}
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Tuliskan alamat lengkap Anda: Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten, dan Patokan Rumah..."
            className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
          />
          <p className="text-xs text-slate-500">
            Pastikan menyertakan Kecamatan dan Kota agar sistem penugasan teknisi berjalan akurat.
          </p>
        </div>
      )}

      {fullPreview && (
        <div className={`p-3.5 rounded-xl border transition-all ${
          isComplete || mode === 'manual' 
            ? 'bg-blue-50/50 border-blue-100 text-slate-800' 
            : 'bg-amber-50/50 border-amber-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" /> Preview Format Alamat Resmi
            </span>
            {isComplete && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Struktur Lengkap
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed font-sans">
            {fullPreview}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
