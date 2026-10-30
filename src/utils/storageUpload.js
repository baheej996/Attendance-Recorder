import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

/**
 * Moves inline base64 images (data: URLs) out of Firestore documents into Firebase Storage.
 * Large base64 strings inside frequently-listened documents (mentors, questions, settings)
 * are re-downloaded by every client on every snapshot; a Storage URL is a few bytes.
 *
 * Returns a copy of `data` with each listed field replaced by its download URL. Fields that
 * are not data URLs are left untouched. If an upload fails the original value is kept, so a
 * save never fails because of Storage.
 */
export const persistInlineImages = async (data, fields, folder) => {
    if (!data || typeof data !== 'object') return data;
    const result = { ...data };
    await Promise.all(fields.map(async (field) => {
        const value = data[field];
        if (!isDataUrl(value)) return;
        try {
            const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            const snap = await uploadString(ref(storage, path), value, 'data_url');
            result[field] = await getDownloadURL(snap.ref);
        } catch (error) {
            console.warn(`[storageUpload] Upload failed for '${field}', keeping inline image:`, error);
        }
    }));
    return result;
};
