export interface Category {
  id: string;
  name: string;
}

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
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
  type: 'IMAGE' | 'VIDEO';
  category_id: string;
  thumbnail_key: string;
  template_key: string;
  config_json: Record<string, unknown> | null;
  is_premium: boolean;
  language: string;
}

export interface AdminTemplate {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO';
  category_id: string;
  thumbnail_key: string;
  template_key: string;
  config_json: Record<string, unknown> | null;
  thumbnail_url?: string | null;
  template_url?: string | null;
  is_active?: boolean;
  usage_count?: number;
  category?: TemplateCategorySummary;
  is_premium: boolean;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateCategorySummary {
  id: string;
  name: string;
}

export interface AdminTemplateSummary {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO';
  thumbnail_url: string | null;
  template_url?: string | null;
  category_id?: string;
  language?: string;
  usage_count: number;
  is_premium: boolean;
  category: TemplateCategorySummary;
  updatedAt?: string;
}

export interface TemplateListParams {
  category_id?: string;
  language?: string;
  is_premium?: boolean;
  type?: 'IMAGE' | 'VIDEO';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PresignedUploadPayload {
  fileName: string;
  category: string;
  contentType: string;
}

export interface UploadedAsset {
  key: string;
  url: string | null;
}

export interface AnalyticsDashboard {
  dau: number;
  total_users: number;
  total_templates: number;
  total_quotes: number;
  media_generated: number;
  pending_media_jobs: number;
  premium_subscribers: number;
  top_templates: AdminTemplateSummary[];
}

export interface AdminSubscriptionSummary {
  plan_type: 'FREE' | 'PREMIUM' | string;
  expires_at: string | null;
}

export interface AdminUser {
  id: string;
  phone_number: string;
  name: string | null;
  status: string;
  language: string;
  createdAt: string;
  subscription: AdminSubscriptionSummary | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanguagePayload {
  code: string;
  name: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'FREE' | 'PREMIUM' | string;
  price_inr: string;
  duration_days: number;
  description: string;
  features: string[];
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanPayload {
  name: string;
  plan_type: 'FREE' | 'PREMIUM' | string;
  price_inr: number;
  duration_days: number;
  description: string;
  features: string[];
}

export interface SubscriptionStatus {
  plan_type: 'FREE' | 'PREMIUM' | string;
  is_active: boolean;
  expires_at: string | null;
}
