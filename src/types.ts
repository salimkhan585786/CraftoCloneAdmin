export interface Category {
  id: string;
  name: string;
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
