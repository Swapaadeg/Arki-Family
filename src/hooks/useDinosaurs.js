import { useState, useEffect } from 'react';
import { dinoAPI } from '../services/api';

export const useDinosaurs = (tribeId = null) => {
  const [dinos, setDinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger tous les dinosaures
  const fetchDinosaurs = async () => {
    if (!tribeId) return;
    try {
      setLoading(true);
      const data = await dinoAPI.getAll(tribeId);
      setDinos(data);
      setError(null);
    } catch (error) {
      console.error('Erreur lors du chargement des dinosaures:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDinosaurs();
  }, [tribeId]);

  // Ajouter un dinosaure
  const addDinosaur = async (dinoData) => {
    try {
      const result = await dinoAPI.create(dinoData);

      // Rafraîchir la liste
      await fetchDinosaurs();

      return result;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du dinosaure:', error);
      setError(error.message);
      throw error;
    }
  };

  // Mettre à jour un dinosaure
  const updateDinosaur = async (dinoId, updatedData) => {
    try {
      const result = await dinoAPI.update(dinoId, updatedData);
      const updatedFromApi = result?.dinosaur;

      // Si c'est un upload d'image, recharger toute la liste pour avoir l'URL fraîche
      if (updatedData.image instanceof File) {
        await fetchDinosaurs();
        return result;
      }

      if (updatedFromApi) {
        setDinos(prevDinos =>
          prevDinos.map(dino => (dino.id === dinoId ? { ...dino, ...updatedFromApi } : dino))
        );
      } else {
        // Fallback: mise à jour optimiste avec merge profond pour les objets imbriqués
        setDinos(prevDinos =>
          prevDinos.map(dino => {
            if (dino.id !== dinoId) return dino;

            const updated = { ...dino };

            if (updatedData.stats) {
              updated.stats = { ...dino.stats, ...updatedData.stats };
            }

            if (updatedData.mutatedStats) {
              updated.mutatedStats = { ...dino.mutatedStats, ...updatedData.mutatedStats };
            }

            if (updatedData.isFeatured !== undefined) {
              updated.isFeatured = updatedData.isFeatured;
            }

            if (updatedData.isMutated !== undefined) {
              updated.isMutated = updatedData.isMutated;
            }

            if (updatedData.assigned_user_id !== undefined) {
              updated.assignedUser = updatedData.assigned_user_id
                ? { id: updatedData.assigned_user_id, username: updated.assignedUser?.username || '' }
                : null;
            }

            return updated;
          })
        );
      }
    } catch (error) {
      // En cas d'erreur, recharger pour avoir l'état correct
      await fetchDinosaurs();
      console.error('Erreur lors de la mise à jour du dinosaure:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || error.message);
      throw error;
    }
  };

  // Supprimer un dinosaure
  const deleteDinosaur = async (dinoId) => {
    try {
      await dinoAPI.delete(dinoId);

      // Rafraîchir la liste
      await fetchDinosaurs();
    } catch (error) {
      console.error('Erreur lors de la suppression du dinosaure:', error);
      setError(error.message);
      throw error;
    }
  };

  // Toggle le statut featured d'un dinosaure
  const toggleFeatured = async (dinoId, isFeatured) => {
    try {
      await dinoAPI.toggleFeatured(dinoId, isFeatured);

      // Mise à jour optimiste de l'état local
      setDinos(prevDinos =>
        prevDinos.map(dino =>
          dino.id === dinoId
            ? { ...dino, isFeatured }
            : dino
        )
      );
    } catch (error) {
      // En cas d'erreur, recharger pour avoir l'état correct
      await fetchDinosaurs();
      console.error('Erreur lors de la mise à jour du statut featured:', error);
      setError(error.message);
      throw error;
    }
  };

  return {
    dinos,
    loading,
    error,
    addDinosaur,
    updateDinosaur,
    deleteDinosaur,
    toggleFeatured,
    refreshDinosaurs: fetchDinosaurs
  };
};

export default useDinosaurs;
