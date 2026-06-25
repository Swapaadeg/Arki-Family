import { useState, useEffect, useCallback } from 'react';
import { tribeAPI } from '../services/api';

const STORAGE_KEY = 'selectedTribeId';

export const useTribe = () => {
  const [tribe, setTribe] = useState(null);
  const [allTribes, setAllTribes] = useState([]);
  const [selectedTribeId, setSelectedTribeId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger la liste de toutes les tribus de l'utilisateur
  useEffect(() => {
    tribeAPI.getMine().then(data => {
      const tribes = data.tribes || [];
      setAllTribes(tribes);
      // Si rien de sélectionné ou sélection invalide, prendre la première
      if (tribes.length > 0) {
        const valid = tribes.find(t => t.id === selectedTribeId);
        if (!valid) {
          const firstId = tribes[0].id;
          localStorage.setItem(STORAGE_KEY, firstId);
          setSelectedTribeId(firstId);
        }
      }
    }).catch(() => {});
  }, []);

  // Charger les données de la tribu sélectionnée
  const loadTribe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tribeAPI.getMy(selectedTribeId);
      setTribe(data.tribe ? { ...data.tribe, members: data.members || [] } : null);
    } catch (err) {
      console.error('Erreur lors du chargement de la tribu:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement de la tribu');
      setTribe(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTribeId]);

  useEffect(() => {
    loadTribe();
  }, [loadTribe]);

  const selectTribe = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedTribeId(id);
  }, []);

  const updateTribe = useCallback(async (updates) => {
    try {
      setError(null);
      await tribeAPI.update({ id: tribe?.id, ...updates });
      await loadTribe();
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de la mise à jour';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadTribe, tribe]);

  const refreshTribe = useCallback(() => {
    loadTribe();
  }, [loadTribe]);

  return {
    tribe,
    allTribes,
    selectedTribeId,
    selectTribe,
    loading,
    error,
    updateTribe,
    refreshTribe,
  };
};

export default useTribe;
