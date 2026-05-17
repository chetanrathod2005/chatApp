
  

export const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const DEFAULT_PROFILE_PHOTO = `${import.meta.env.BASE_URL}user_3941784.png`;

export const fileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

export function profileImageSrc(photo) {
  const p = photo != null ? String(photo).trim() : "";

  if (!p) return DEFAULT_PROFILE_PHOTO;

  if (p.includes("avatar.iran.liara.run")) {
    return DEFAULT_PROFILE_PHOTO;
  }

  return fileUrl(p);
}