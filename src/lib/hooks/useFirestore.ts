import { useState, useCallback } from 'react';
import { apiFetch } from '../api';

export function useFirestore<T = any>(collectionPath: string) {
  const [loading, setLoading] = useState(false);

  const list = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/${collectionPath}`, { showToast: false });
      return data as (T & { id: string })[];
    } catch (error) {
      return [];
    } finally {
      setLoading(false);
    }
  }, [collectionPath]);

  const add = async (data: any) => {
    setLoading(true);
    try {
      const result = await apiFetch(`/api/${collectionPath}`, {
        method: 'POST',
        body: JSON.stringify(data),
        showToast: true,
        successMessage: 'Ajouté avec succès'
      });
      return result;
    } catch (error) {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, data: any) => {
    setLoading(true);
    try {
      await apiFetch(`/api/${collectionPath}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        showToast: true,
        successMessage: 'Mis à jour avec succès'
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    setLoading(true);
    try {
      await apiFetch(`/api/${collectionPath}/${id}`, {
        method: 'DELETE',
        showToast: true,
        successMessage: 'Supprimé avec succès'
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, list, add, update, remove };
}
