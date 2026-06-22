export function getBackendOrigin() {
  return import.meta.env.VITE_BACKEND_URL || window.location.origin || 'http://localhost:8000';
}
