export interface Category {
  id: string;
  name: string;
}

export interface AdminCategory extends Category {
  description: string;
  icon_key: string;
  icon_url: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPayload {
  name: string;
  description: string;
  icon_key: string;
}

export interface PhotoFrame {
  shape: 'circle' | 'square' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

export interface Template {
  id: string;
  categoryId: string;
  bannerImage: string;
  photoFrame: PhotoFrame;
}

export interface TemplatePayload {
  name: string;
  type: 'IMAGE';
  category_id: string;
  thumbnail_key: string;
  template_key: string;
  config_json: Record<string, unknown>;
  is_premium: boolean;
  language: string;
}

export interface AdminTemplate {
  id: string;
  name: string;
  type: 'IMAGE';
  category_id: string;
  thumbnail_key: string;
  template_key: string;
  config_json: Record<string, unknown>;
  is_premium: boolean;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}
