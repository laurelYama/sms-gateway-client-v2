"use client";

import { useEffect } from 'react';

export function RemoveExtensionAttributes() {
  useEffect(() => {
    // Supprimer l'attribut après un court délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(() => {
      document.body.removeAttribute('cz-shortcut-listen');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return null;
}
