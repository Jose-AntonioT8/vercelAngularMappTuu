/**
 * Base URL de la API HTTP (backend) para operaciones de dominio.
 *
 * En el frontend se usa como raíz para endpoints REST que requieren
 * `Authorization: Bearer <token>`.
 */
export const apiUrl =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/api'
    : 'https://vercel-node-mapp-tuu.vercel.app/api';