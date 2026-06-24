import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Transformer, Text } from 'react-konva';
import useImage from 'use-image';
import {
  Upload,
  Save,
  Move,
  Circle as CircleIcon,
  Square,
  RectangleHorizontal,
  ChevronLeft,
  Play,
  Pause,
  Type,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminCategory, AdminTemplate, AdminTemplateSummary, BackgroundCrop, PhotoFrame, Subcategory, TemplatePayload } from '../types';
import { templateService } from '../services/templateService';
import { categoryService } from '../services/categoryService';
import { subcategoryService } from '../services/subcategoryService';

interface AnimationDef {
  id: string;
  label: string;
  type: 'entry' | 'loop';
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  loop: string | boolean;
  duration: number;
  easing: string | { type: string; speed: number; bounciness: number };
}

interface TextFieldConfig {
  visible: boolean;
  content: string;
  position: { x: number; y: number };
  userOffset: { x: number; y: number };
  userScale: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  align: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
}

interface TemplateVariable {
  key: string;
  label: string;
  type: string;
  default: string;
}

const ANIMATION_DEFINITIONS: AnimationDef[] = [
  { id: 'fade_up', label: 'Fade Up', type: 'entry', from: { translateY: 346, opacity: 0.2 }, to: { translateY: 0, opacity: 1 }, loop: false, duration: 1400, easing: 'ease' },
  { id: 'slide_top_right', label: 'Top Right Entry', type: 'entry', from: { translateX: 756, translateY: -1344 }, to: { translateX: 0, translateY: 0 }, loop: false, duration: 1400, easing: 'ease' },
  { id: 'pop_in', label: 'Pop In', type: 'entry', from: { scale: 0.55, opacity: 0.25 }, to: { scale: 1, opacity: 1 }, loop: false, duration: 1400, easing: { type: 'spring', speed: 1.8, bounciness: 14 } },
  { id: 'rotate_soft_left', label: 'Rotate Left', type: 'entry', from: { rotate: '-12deg', scale: 0.95 }, to: { rotate: '0deg', scale: 1 }, loop: false, duration: 1400, easing: 'ease' },
  { id: 'float_up_down', label: 'Float Up Down', type: 'loop', from: { translateY: -346 }, to: { translateY: 346 }, loop: 'alternateSlow', duration: 2200, easing: 'ease' },
];

const TEMPLATE_CANVAS_WIDTH = 270;
const DEFAULT_OUTPUT_WIDTH = 1080;
const DEFAULT_OUTPUT_HEIGHT = 1920;
const MIN_BANNER_SCALE = 1;
const MAX_BANNER_SCALE = 4;
const MIN_FRAME_SIZE = 10;
const MAX_FRAME_SIZE = 270;

const defaultTextFieldName: TextFieldConfig = {
  visible: true,
  content: '{{name}}',
  position: { x: 60, y: 1100 },
  userOffset: { x: 0, y: 0 },
  userScale: 1.0,
  width: 960,
  fontSize: 64,
  fontFamily: 'Poppins',
  fontWeight: 'bold',
  color: '#FFFFFF',
  align: 'center',
  bold: true,
  italic: false,
  shadow: false,
};

const defaultTextFieldMessage: TextFieldConfig = {
  visible: true,
  content: '{{message}}',
  position: { x: 60, y: 1200 },
  userOffset: { x: 0, y: 0 },
  userScale: 1.0,
  width: 960,
  fontSize: 36,
  fontFamily: 'Inter',
  fontWeight: 'normal',
  color: '#EEEEEE',
  align: 'center',
  bold: false,
  italic: false,
  shadow: false,
};

const defaultTemplateVariables: TemplateVariable[] = [
  { key: 'name', label: 'Your Name', type: 'text', default: 'Your Name' },
  { key: 'message', label: 'Message', type: 'text', default: 'Happy Diwali!' },
];

type EditorMode = 'crop' | 'frame';

const emptyFrame: PhotoFrame = {
  shape: 'rectangle',
  x: 35,
  y: 140,
  width: 200,
  height: 200,
  radius: 0,
};

function isPhotoFrame(value: unknown): value is PhotoFrame {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PhotoFrame>;
  return (
    (candidate.shape === 'circle' || candidate.shape === 'square' || candidate.shape === 'rectangle') &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  );
}

function isBackgroundCrop(value: unknown): value is BackgroundCrop {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BackgroundCrop>;
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.scale === 'number' &&
    typeof candidate.mediaWidth === 'number' &&
    typeof candidate.mediaHeight === 'number'
  );
}

function getDisplayUrl(remoteUrl: string | null | undefined, file: File) {
  return remoteUrl || URL.createObjectURL(file);
}

function getLoadedImageSize(image: HTMLImageElement | undefined) {
  if (!image) {
    return null;
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return null;
  }

  return { width, height };
}

function getStringConfigValue(config: Record<string, unknown> | null | undefined, key: string) {
  const value = config?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getTemplatePreviewUrl(template: AdminTemplate) {
  const backgroundPreviewUrl = getStringConfigValue(template.config_json, 'background_preview');

  if (template.type === 'VIDEO') {
    return template.template_url || backgroundPreviewUrl || template.thumbnail_url || null;
  }

  return backgroundPreviewUrl || template.thumbnail_url || template.template_url || null;
}

function getNormalizedFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitAssetKey(assetKey: string) {
  const normalizedKey = assetKey.trim();
  const lastSlashIndex = normalizedKey.lastIndexOf('/');
  const directory = lastSlashIndex >= 0 ? normalizedKey.slice(0, lastSlashIndex + 1) : '';
  const fileName = lastSlashIndex >= 0 ? normalizedKey.slice(lastSlashIndex + 1) : normalizedKey;
  return { directory, fileName };
}

function deriveKeysFromUpload(file: File, assetKey: string) {
  const fallbackBaseName = getNormalizedFileName(file.name) || 'template-media';
  const { directory, fileName } = splitAssetKey(assetKey);
  const resolvedFileName = fileName || `${fallbackBaseName}${file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''}`;
  const resolvedBaseName = getNormalizedFileName(resolvedFileName) || fallbackBaseName;
  const templateAssetKey = `${directory}${resolvedFileName}`;
  const thumbnailAssetKey = file.type.startsWith('image/')
    ? templateAssetKey
    : `${directory}${resolvedBaseName}-thumbnail.jpg`;

  return {
    templateAssetKey,
    thumbnailAssetKey,
    defaultTemplateName: resolvedBaseName.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  };
}

function getFrameNodePosition(nextFrame: PhotoFrame) {
  if (nextFrame.shape === 'circle') {
    const radius = nextFrame.radius ?? Math.min(nextFrame.width, nextFrame.height) / 2;
    return {
      x: nextFrame.x + radius,
      y: nextFrame.y + radius,
    };
  }

  return {
    x: nextFrame.x,
    y: nextFrame.y,
  };
}

function createDefaultBackgroundCrop(mediaWidth: number, mediaHeight: number, canvasWidth: number, canvasHeight: number): BackgroundCrop {
  const baseScale = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);

  return {
    x: (canvasWidth - mediaWidth * baseScale) / 2,
    y: (canvasHeight - mediaHeight * baseScale) / 2,
    scale: 1,
    mediaWidth,
    mediaHeight,
  };
}

function clampBackgroundCrop(crop: BackgroundCrop, mediaWidth: number, mediaHeight: number, canvasWidth: number, canvasHeight: number): BackgroundCrop {
  const safeScale = Math.min(MAX_BANNER_SCALE, Math.max(MIN_BANNER_SCALE, crop.scale || 1));
  const baseScale = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
  const renderWidth = mediaWidth * baseScale * safeScale;
  const renderHeight = mediaHeight * baseScale * safeScale;
  const minX = Math.min(0, canvasWidth - renderWidth);
  const minY = Math.min(0, canvasHeight - renderHeight);

  return {
    x: renderWidth <= canvasWidth ? (canvasWidth - renderWidth) / 2 : Math.min(0, Math.max(minX, crop.x)),
    y: renderHeight <= canvasHeight ? (canvasHeight - renderHeight) / 2 : Math.min(0, Math.max(minY, crop.y)),
    scale: safeScale,
    mediaWidth,
    mediaHeight,
  };
}

function getBackgroundCropMetrics(crop: BackgroundCrop | null, canvasWidth: number, canvasHeight: number) {
  if (!crop || crop.mediaWidth <= 0 || crop.mediaHeight <= 0) {
    return null;
  }

  const baseScale = Math.max(canvasWidth / crop.mediaWidth, canvasHeight / crop.mediaHeight);
  const renderScale = baseScale * crop.scale;

  return {
    renderScale,
    renderWidth: crop.mediaWidth * renderScale,
    renderHeight: crop.mediaHeight * renderScale,
    sourceX: Math.max(0, (-crop.x) / renderScale),
    sourceY: Math.max(0, (-crop.y) / renderScale),
    sourceWidth: Math.min(crop.mediaWidth, canvasWidth / renderScale),
    sourceHeight: Math.min(crop.mediaHeight, canvasHeight / renderScale),
  };
}

function slugifyFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template-banner';
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function canvasToFile(canvas: HTMLCanvasElement, fileName: string, mimeType: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), mimeType, 0.92);
  });

  if (!blob) {
    throw new Error('Unable to prepare cropped banner image.');
  }

  return new File([blob], fileName, { type: mimeType });
}

function getUploadedMediaSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;
        cleanup();
        if (duration > 30) {
          reject(new Error('Video must be 30 seconds or shorter.'));
          return;
        }
        resolve({ width, height });
      };
      video.onerror = () => {
        cleanup();
        reject(new Error('Unable to read video dimensions.'));
      };
      video.src = objectUrl;
      return;
    }

    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      cleanup();
      resolve({ width, height });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Unable to read image dimensions.'));
    };
    image.src = objectUrl;
  });
}

async function shouldProceedWithMedia(_file: File) {
  return true;
}

export default function TemplateEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCategoryId = searchParams.get('categoryId');
  const templateId = searchParams.get('templateId');

  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId || '');
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [language, setLanguage] = useState('en');
  const [thumbnailKey, setThumbnailKey] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [existingConfigJson, setExistingConfigJson] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(Boolean(templateId));
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [frame, setFrame] = useState<PhotoFrame>(emptyFrame);
  const [bannerCrop, setBannerCrop] = useState<BackgroundCrop | null>(null);
  const [shouldExportBannerCrop, setShouldExportBannerCrop] = useState(!templateId);
  const [selected, setSelected] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('crop');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [photoFrameAnimation, setPhotoFrameAnimation] = useState('fade_up');
  const [accentColor, setAccentColor] = useState('#0D62DF');
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState('');
  const [textFieldName, setTextFieldName] = useState<TextFieldConfig>(defaultTextFieldName);
  const [textFieldMessage, setTextFieldMessage] = useState<TextFieldConfig>(defaultTextFieldMessage);
  const [selectedTextField, setSelectedTextField] = useState<'name' | 'message' | null>(null);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>(defaultTemplateVariables);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const textNameRef = useRef<any>(null);
  const textMessageRef = useRef<any>(null);
  const textTrRef = useRef<any>(null);

  const outputWidth = mediaDimensions?.width ?? DEFAULT_OUTPUT_WIDTH;
  const outputHeight = mediaDimensions?.height ?? DEFAULT_OUTPUT_HEIGHT;
  const displayHeight = Math.round(TEMPLATE_CANVAS_WIDTH * (outputHeight / outputWidth));
  const FRAME_SCALE = outputWidth / TEMPLATE_CANVAS_WIDTH;

  const imagePreviewUrl = templateType === 'IMAGE' ? mediaPreviewUrl || '' : '';
  const [corsBgImage, corsImageStatus] = useImage(imagePreviewUrl, 'anonymous');
  const [plainBgImage] = useImage(corsImageStatus === 'failed' ? imagePreviewUrl : '');
  const bgImage = corsBgImage || plainBgImage;
  const bgImageSize = getLoadedImageSize(bgImage);
  const bgImageWidth = bgImageSize?.width ?? 0;
  const bgImageHeight = bgImageSize?.height ?? 0;

  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selected]);

  useEffect(() => {
    if (selectedTextField && textTrRef.current) {
      const node = selectedTextField === 'name' ? textNameRef.current : textMessageRef.current;
      if (node) {
        textTrRef.current.nodes([node]);
        textTrRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedTextField]);

  useEffect(() => {
    if (templateType !== 'IMAGE') {
      setBannerCrop(null);
      return;
    }

    if (!bgImageWidth || !bgImageHeight) {
      return;
    }

    setBannerCrop((currentCrop) => {
      if (currentCrop) {
        return clampBackgroundCrop(
          {
            ...currentCrop,
            mediaWidth: bgImageWidth,
            mediaHeight: bgImageHeight,
          },
          bgImageWidth,
          bgImageHeight,
          TEMPLATE_CANVAS_WIDTH,
          displayHeight,
        );
      }

      return createDefaultBackgroundCrop(bgImageWidth, bgImageHeight, TEMPLATE_CANVAS_WIDTH, displayHeight);
    });
  }, [bgImage, bgImageWidth, bgImageHeight, templateType, displayHeight]);

  useEffect(() => {
    if (!templateId) {
      return;
    }

    const loadTemplate = async () => {
      try {
        setIsLoadingTemplate(true);
        setError('');
        const template = await templateService.getTemplate(templateId);
        hydrateTemplate(template);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load template.');
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [mediaPreviewUrl, templateType]);

  useEffect(() => {
    categoryService.listCategories().then((data) => {
      setCategories(data.filter((c) => c.is_active !== false));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCategoryId) {
      setSubcategories([]);
      return;
    }
    subcategoryService.listSubcategories(activeCategoryId).then((data) => {
      setSubcategories(data);
    }).catch(() => {});
  }, [activeCategoryId]);

  const hydrateTemplate = (template: AdminTemplate) => {
    setActiveCategoryId(template.category_id || initialCategoryId || '');
    setActiveSubcategoryId(template.subcategory_id || '');
    setTemplateName(template.name || '');
    setTemplateType(template.type || 'IMAGE');
    setLanguage(template.language || 'en');
    setThumbnailKey(template.thumbnail_key || '');
    setTemplateKey(template.template_key || '');
    setMediaPreviewUrl(getTemplatePreviewUrl(template));
    setIsPremium(Boolean(template.is_premium));
    setExistingConfigJson(template.config_json ?? null);
    setSelected(false);
    setSelectedTextField(null);
    setEditorMode(template.type === 'IMAGE' ? 'crop' : 'frame');

    const config = (template.config_json ?? {}) as Record<string, unknown>;

    const configWidth = typeof config.width === 'number' ? config.width : DEFAULT_OUTPUT_WIDTH;
    const configHeight = typeof config.height === 'number' ? config.height : DEFAULT_OUTPUT_HEIGHT;
    setMediaDimensions({ width: configWidth, height: configHeight });

    const localFrameScale = configWidth / TEMPLATE_CANVAS_WIDTH;

    const maybeFrame = (config.photoFrame ?? config.photo_frame) as Record<string, unknown> | undefined;
    const maybeBackgroundCrop = config.background_crop as Record<string, unknown> | undefined;

    if (isPhotoFrame(maybeFrame)) {
      setFrame({
        ...maybeFrame,
        x: (maybeFrame.x ?? 0) / localFrameScale,
        y: (maybeFrame.y ?? 0) / localFrameScale,
        width: (maybeFrame.width ?? 200) / localFrameScale,
        height: (maybeFrame.height ?? 200) / localFrameScale,
        radius: maybeFrame.radius != null ? maybeFrame.radius / localFrameScale : undefined,
      });
    } else {
      setFrame(emptyFrame);
    }

    setBannerCrop(isBackgroundCrop(maybeBackgroundCrop) ? maybeBackgroundCrop : null);
    setShouldExportBannerCrop(false);

    const maybePhotoFrame = config.photoFrame as Record<string, unknown> | undefined;
    if (maybePhotoFrame?.animation && typeof maybePhotoFrame.animation === 'object') {
      const anim = maybePhotoFrame.animation as Record<string, unknown>;
      if (typeof anim.id === 'string') {
        setPhotoFrameAnimation(anim.id);
      }
    }

    const tmpl = config.template as Record<string, unknown> | undefined;
    if (typeof tmpl?.accentColor === 'string') {
      setAccentColor(tmpl.accentColor);
    }

    const tf = config.textFields as Record<string, unknown> | undefined;
    if (tf) {
      if (tf.name && typeof tf.name === 'object') {
        const n = tf.name as Record<string, unknown>;
        setTextFieldName({
          visible: Boolean(n.visible ?? true),
          content: typeof n.content === 'string' ? n.content : '{{name}}',
          position: (n.position && typeof n.position === 'object') ? n.position as { x: number; y: number } : defaultTextFieldName.position,
          userOffset: (n.userOffset && typeof n.userOffset === 'object') ? n.userOffset as { x: number; y: number } : { x: 0, y: 0 },
          userScale: typeof n.userScale === 'number' ? n.userScale : 1.0,
          width: typeof n.width === 'number' ? n.width : defaultTextFieldName.width,
          fontSize: typeof n.fontSize === 'number' ? n.fontSize : defaultTextFieldName.fontSize,
          fontFamily: typeof n.fontFamily === 'string' ? n.fontFamily : defaultTextFieldName.fontFamily,
          fontWeight: typeof n.fontWeight === 'string' ? n.fontWeight : defaultTextFieldName.fontWeight,
          color: typeof n.color === 'string' ? n.color : defaultTextFieldName.color,
          align: typeof n.align === 'string' ? n.align : defaultTextFieldName.align,
          bold: Boolean(n.bold),
          italic: Boolean(n.italic),
          shadow: Boolean(n.shadow),
        });
      }
      if (tf.message && typeof tf.message === 'object') {
        const m = tf.message as Record<string, unknown>;
        setTextFieldMessage({
          visible: Boolean(m.visible ?? true),
          content: typeof m.content === 'string' ? m.content : '{{message}}',
          position: (m.position && typeof m.position === 'object') ? m.position as { x: number; y: number } : defaultTextFieldMessage.position,
          userOffset: (m.userOffset && typeof m.userOffset === 'object') ? m.userOffset as { x: number; y: number } : { x: 0, y: 0 },
          userScale: typeof m.userScale === 'number' ? m.userScale : 1.0,
          width: typeof m.width === 'number' ? m.width : defaultTextFieldMessage.width,
          fontSize: typeof m.fontSize === 'number' ? m.fontSize : defaultTextFieldMessage.fontSize,
          fontFamily: typeof m.fontFamily === 'string' ? m.fontFamily : defaultTextFieldMessage.fontFamily,
          fontWeight: typeof m.fontWeight === 'string' ? m.fontWeight : defaultTextFieldMessage.fontWeight,
          color: typeof m.color === 'string' ? m.color : defaultTextFieldMessage.color,
          align: typeof m.align === 'string' ? m.align : defaultTextFieldMessage.align,
          bold: Boolean(m.bold),
          italic: Boolean(m.italic),
          shadow: Boolean(m.shadow),
        });
      }
    }

    if (Array.isArray(config.variables)) {
      const vars = config.variables as Array<Record<string, unknown>>;
      const parsed: TemplateVariable[] = vars.map((v) => ({
        key: typeof v.key === 'string' ? v.key : '',
        label: typeof v.label === 'string' ? v.label : '',
        type: typeof v.type === 'string' ? v.type : 'text',
        default: typeof v.default === 'string' ? v.default : '',
      })).filter((v) => v.key);
      if (parsed.length > 0) {
        setTemplateVariables(parsed);
      }
    }

    const tv = config.templateVariables as Record<string, unknown> | undefined;
    if (tv && typeof tv === 'object') {
      const vals: Record<string, string> = {};
      Object.entries(tv).forEach(([k, v]) => {
        vals[k] = typeof v === 'string' ? v : String(v ?? '');
      });
      setVariableValues(vals);
    }
  };

  const handleShapeChange = (shape: 'circle' | 'square' | 'rectangle') => {
    const newFrame = { ...frame, shape };

    if (shape === 'circle') {
      const size = Math.min(frame.width, frame.height);
      newFrame.width = size;
      newFrame.height = size;
      newFrame.radius = size / 2;
    } else if (shape === 'square') {
      const size = Math.min(frame.width, frame.height);
      newFrame.width = size;
      newFrame.height = size;
      newFrame.radius = 0;
    } else {
      newFrame.radius = 0;
    }

    setFrame(newFrame);
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;

    if (!node) {
      return;
    }

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const updatedFrame = {
      ...frame,
      width: clampValue(node.width() * scaleX, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
      height: clampValue(node.height() * scaleY, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
    };

    if (frame.shape === 'circle') {
      const size = Math.max(updatedFrame.width, updatedFrame.height);
      updatedFrame.width = size;
      updatedFrame.height = size;
      updatedFrame.radius = size / 2;
      updatedFrame.x = node.x() - size / 2;
      updatedFrame.y = node.y() - size / 2;
    } else if (frame.shape === 'square') {
      const size = Math.max(updatedFrame.width, updatedFrame.height);
      updatedFrame.width = size;
      updatedFrame.height = size;
      updatedFrame.x = node.x();
      updatedFrame.y = node.y();
    } else {
      updatedFrame.x = node.x();
      updatedFrame.y = node.y();
    }

    setFrame(updatedFrame);
  };

  const updateFrameSize = (nextWidth: number, nextHeight = nextWidth) => {
    setFrame((currentFrame) => {
      if (currentFrame.shape === 'circle') {
        const size = clampValue(nextWidth, MIN_FRAME_SIZE, MAX_FRAME_SIZE);
        return {
          ...currentFrame,
          width: size,
          height: size,
          radius: size / 2,
        };
      }

      if (currentFrame.shape === 'square') {
        const size = clampValue(nextWidth, MIN_FRAME_SIZE, MAX_FRAME_SIZE);
        return {
          ...currentFrame,
          width: size,
          height: size,
          radius: 0,
        };
      }

      return {
        ...currentFrame,
        width: clampValue(nextWidth, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
        height: clampValue(nextHeight, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
        radius: 0,
      };
    });
  };

  const updateBackgroundScale = (nextScale: number) => {
    setShouldExportBannerCrop(true);
    setBannerCrop((currentCrop) => {
      if (!currentCrop) {
        return currentCrop;
      }

      const currentMetrics = getBackgroundCropMetrics(currentCrop, TEMPLATE_CANVAS_WIDTH, displayHeight);

      if (!currentMetrics) {
        return currentCrop;
      }

      const safeScale = Math.min(MAX_BANNER_SCALE, Math.max(MIN_BANNER_SCALE, nextScale));
      const scaleRatio = safeScale / currentCrop.scale;
      const nextRenderWidth = currentMetrics.renderWidth * scaleRatio;
      const nextRenderHeight = currentMetrics.renderHeight * scaleRatio;
      const relativeCenterX = (TEMPLATE_CANVAS_WIDTH / 2 - currentCrop.x) / currentMetrics.renderWidth;
      const relativeCenterY = (displayHeight / 2 - currentCrop.y) / currentMetrics.renderHeight;

      return clampBackgroundCrop(
        {
          ...currentCrop,
          scale: safeScale,
          x: TEMPLATE_CANVAS_WIDTH / 2 - relativeCenterX * nextRenderWidth,
          y: displayHeight / 2 - relativeCenterY * nextRenderHeight,
        },
        currentCrop.mediaWidth,
        currentCrop.mediaHeight,
        TEMPLATE_CANVAS_WIDTH,
        displayHeight,
      );
    });
  };

  const handleAssetUpload = async (file: File) => {
    setError('');
    setSuccessMessage('');

    let canUpload = false;
    try {
      canUpload = await shouldProceedWithMedia(file);
    } catch (dimensionError) {
      setError(dimensionError instanceof Error ? dimensionError.message : 'Unable to validate media dimensions.');
      return;
    }

    if (!canUpload) {
      return;
    }

    setIsUploadingBanner(true);

    try {
      const { width, height } = await getUploadedMediaSize(file);
      const asset = await templateService.uploadAsset(file);
      const previewUrl = getDisplayUrl(asset.url, file);
      const nextType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      const derivedKeys = deriveKeysFromUpload(file, asset.key);

      setTemplateType(nextType);
      setTemplateKey(derivedKeys.templateAssetKey);
      setThumbnailKey(derivedKeys.thumbnailAssetKey);
      setMediaPreviewUrl(previewUrl);
      setMediaDimensions({ width, height });
      setSelected(false);
      setEditorMode(nextType === 'IMAGE' ? 'crop' : 'frame');
      setBannerCrop(null);
      setShouldExportBannerCrop(nextType === 'IMAGE');

      if (!templateName.trim()) {
        setTemplateName(derivedKeys.defaultTemplateName);
      }

      setSuccessMessage(`${nextType === 'VIDEO' ? 'Video' : 'Image'} banner uploaded successfully (${width}×${height}).`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload file.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleBannerUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      await handleAssetUpload(file);
    }

    e.target.value = '';
  };

  const toggleVideoPlayback = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setError('Unable to play this video preview. Check that the template URL is accessible in the browser.');
    }
  };

  const buildPayload = (
    nextTemplateKey = templateKey,
    nextThumbnailKey = thumbnailKey,
    nextBackgroundPreview = mediaPreviewUrl,
  ): TemplatePayload => {
    const nextConfig: Record<string, unknown> = { ...(existingConfigJson ?? {}) };

    nextConfig.width = outputWidth;
    nextConfig.height = outputHeight;

    nextConfig.photoFrame = {
      x: Math.round(frame.x * FRAME_SCALE),
      y: Math.round(frame.y * FRAME_SCALE),
      width: Math.round(frame.width * FRAME_SCALE),
      height: Math.round(frame.height * FRAME_SCALE),
      borderColor: '#FFFFFF',
      borderWidth: 3,
      shape: frame.shape,
      animation: { id: photoFrameAnimation, config: {} },
    };
    delete nextConfig.photo_frame;
    delete nextConfig.background_crop;
    delete nextConfig.background_preview;

    if (!nextConfig.template) {
      nextConfig.template = {
        canvas: { width: outputWidth, height: outputHeight },
        accentColor,
      };
    } else {
      (nextConfig.template as Record<string, unknown>).accentColor = accentColor;
    }

    nextConfig.textFields = {
      name: {
        visible: textFieldName.visible,
        content: textFieldName.content,
        position: {
          x: Math.round(textFieldName.position.x * FRAME_SCALE),
          y: Math.round(textFieldName.position.y * FRAME_SCALE),
        },
        userOffset: textFieldName.userOffset,
        userScale: textFieldName.userScale,
        width: Math.round(textFieldName.width * FRAME_SCALE),
        fontSize: Math.round(textFieldName.fontSize * FRAME_SCALE),
        fontFamily: textFieldName.fontFamily,
        fontWeight: textFieldName.fontWeight,
        color: textFieldName.color,
        align: textFieldName.align,
        bold: textFieldName.bold,
        italic: textFieldName.italic,
        shadow: textFieldName.shadow,
      },
      message: {
        visible: textFieldMessage.visible,
        content: textFieldMessage.content,
        position: {
          x: Math.round(textFieldMessage.position.x * FRAME_SCALE),
          y: Math.round(textFieldMessage.position.y * FRAME_SCALE),
        },
        userOffset: textFieldMessage.userOffset,
        userScale: textFieldMessage.userScale,
        width: Math.round(textFieldMessage.width * FRAME_SCALE),
        fontSize: Math.round(textFieldMessage.fontSize * FRAME_SCALE),
        fontFamily: textFieldMessage.fontFamily,
        fontWeight: textFieldMessage.fontWeight,
        color: textFieldMessage.color,
        align: textFieldMessage.align,
        bold: textFieldMessage.bold,
        italic: textFieldMessage.italic,
        shadow: textFieldMessage.shadow,
      },
    };

    if (!nextConfig.backgroundOverlay) {
      nextConfig.backgroundOverlay = { enabled: true, color: 'rgba(0, 0, 0, 0.3)', opacity: 0.3 };
    }

    if (!nextConfig.output) {
      nextConfig.output = {
        format: templateType === 'VIDEO' ? 'MP4' : 'JPEG',
        quality: 'high',
        width: outputWidth,
        height: outputHeight,
        ...(templateType === 'VIDEO' ? { fps: 30, duration: 10 } : {}),
      };
    }

    nextConfig.variables = templateVariables;

    nextConfig.templateVariables = { ...variableValues };

    if (templateType === 'VIDEO' && !nextConfig.animation) {
      const photoFrameAnimDef = ANIMATION_DEFINITIONS.find((a) => a.id === photoFrameAnimation);
      if (photoFrameAnimDef) {
        nextConfig.animation = [{
          id: photoFrameAnimDef.id,
          from: photoFrameAnimDef.from,
          to: photoFrameAnimDef.to,
          loop: photoFrameAnimDef.loop,
          duration: photoFrameAnimDef.duration,
          easing: photoFrameAnimDef.easing,
        }];
      }
    }

    const payload: TemplatePayload = {
      name: templateName,
      type: templateType,
      category_id: activeCategoryId,
      thumbnail_key: nextThumbnailKey,
      template_key: nextTemplateKey,
      config_json: Object.keys(nextConfig).length ? nextConfig : null,
      is_premium: isPremium,
      language,
    };

    if (activeSubcategoryId) {
      payload.subcategory_id = activeSubcategoryId;
    }

    return payload;
  };

  const exportCroppedBanner = async () => {
    if (templateType !== 'IMAGE') {
      return null;
    }

    if (!bgImage || !bannerCrop) {
      throw new Error('Upload an image and adjust the reel crop before saving.');
    }

    const cropMetrics = getBackgroundCropMetrics(bannerCrop, TEMPLATE_CANVAS_WIDTH, displayHeight);

    if (!cropMetrics) {
      throw new Error('Unable to calculate the cropped banner area.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to prepare cropped banner canvas.');
    }

    context.drawImage(
      bgImage,
      cropMetrics.sourceX,
      cropMetrics.sourceY,
      cropMetrics.sourceWidth,
      cropMetrics.sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const croppedFile = await canvasToFile(
      canvas,
      `${slugifyFileName(templateName || templateKey || 'template-banner')}-reel.jpg`,
      'image/jpeg',
    );

    const uploadedAsset = await templateService.uploadAsset(croppedFile);
    return {
      previewUrl: getDisplayUrl(uploadedAsset.url, croppedFile),
      uploadedAsset,
      croppedFile,
    };
  };

  const handleSave = async () => {
    if (!activeCategoryId) {
      setError('Category ID is missing. Please open the editor from a category.');
      return;
    }

    if (!templateName.trim() || !thumbnailKey.trim() || !templateKey.trim()) {
      setError('Template name, thumbnail key, and template key are required.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      let nextTemplateKey = templateKey;
      let nextThumbnailKey = thumbnailKey;
      let nextPreviewUrl = mediaPreviewUrl;

      if (templateType === 'IMAGE' && shouldExportBannerCrop) {
        const croppedBanner = await exportCroppedBanner();

        if (!croppedBanner) {
          throw new Error('Unable to prepare the cropped banner image.');
        }

        const derivedKeys = deriveKeysFromUpload(croppedBanner.croppedFile, croppedBanner.uploadedAsset.key);
        nextTemplateKey = derivedKeys.templateAssetKey;
        nextThumbnailKey = derivedKeys.thumbnailAssetKey;
        nextPreviewUrl = croppedBanner.previewUrl;

        setTemplateKey(nextTemplateKey);
        setThumbnailKey(nextThumbnailKey);
        setMediaPreviewUrl(nextPreviewUrl);
        setBannerCrop(createDefaultBackgroundCrop(bgImageWidth || outputWidth, bgImageHeight || outputHeight, TEMPLATE_CANVAS_WIDTH, displayHeight));
        setShouldExportBannerCrop(false);
      }

      const payload = buildPayload(nextTemplateKey, nextThumbnailKey, nextPreviewUrl);

      if (templateId) {
        await templateService.updateTemplate(templateId, payload);
        navigate(-1);
      } else {
        await templateService.createTemplate(payload);
        navigate(-1);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const cropMetrics = getBackgroundCropMetrics(bannerCrop, TEMPLATE_CANVAS_WIDTH, displayHeight);
  const canRenderBackgroundInStage = Boolean(templateType === 'IMAGE' && bgImage && bannerCrop && cropMetrics);
  const videoFrameOverlayStyle: React.CSSProperties = {
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    borderRadius: frame.shape === 'circle' ? '9999px' : 0,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/categories" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{templateId ? 'Edit Template' : 'Template Editor'}</h1>
            <p className="text-zinc-500 text-sm">
              {categories.find((c) => c.id === activeCategoryId)?.name || activeCategoryId || 'No category'}
              {activeSubcategoryId ? ` / ${subcategories.find((s) => s.id === activeSubcategoryId)?.name || activeSubcategoryId}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => bannerInputRef.current?.click()}
            disabled={isUploadingBanner}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-60"
          >
            <Upload size={18} />
            {isUploadingBanner ? 'Uploading Banner...' : 'Upload Banner'}
          </button>
          <input
            type="file"
            ref={bannerInputRef}
            onChange={handleBannerUploadChange}
            className="hidden"
            accept="image/*,video/*"
          />

          <button
            onClick={handleSave}
            disabled={isSaving || isLoadingTemplate}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-60"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </header>

      {(error || successMessage) && (
        <div className={`rounded-2xl border p-4 text-sm ${error ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          {error || successMessage}
        </div>
      )}

      {isLoadingTemplate ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Loading template details...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8 items-start">
          <div className="bg-zinc-100 rounded-3xl border border-zinc-200 overflow-hidden min-h-[420px] relative flex items-start justify-start p-6 lg:p-8">
            {!mediaPreviewUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                <div className="w-20 h-20 bg-zinc-200 rounded-full flex items-center justify-center mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-600">No Banner Uploaded</h3>
                <p className="max-w-xs mt-2">Upload an image or video banner to start building this template.</p>
              </div>
            )}

            <div className="bg-white shadow-2xl">
              <div className="relative overflow-hidden" style={{ width: TEMPLATE_CANVAS_WIDTH, height: displayHeight }}>
                {templateType === 'VIDEO' ? (
                  mediaPreviewUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={mediaPreviewUrl}
                        playsInline
                        preload="metadata"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                        onEnded={() => setIsVideoPlaying(false)}
                        className="absolute inset-0 z-0 h-full w-full bg-black object-cover"
                      />
                      <div
                        className="pointer-events-none absolute z-30 border-2 border-indigo-500 bg-indigo-500/20 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                        style={videoFrameOverlayStyle}
                        aria-hidden="true"
                      />
                      <div className="absolute inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-white shadow-lg backdrop-blur">
                        <button
                          type="button"
                          onClick={toggleVideoPlayback}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-900 transition-colors hover:bg-zinc-100"
                          aria-label={isVideoPlaying ? 'Pause video preview' : 'Play video preview'}
                          title={isVideoPlaying ? 'Pause video preview' : 'Play video preview'}
                        >
                          {isVideoPlaying ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                        <div className="min-w-0 flex-1 text-xs font-semibold text-white/80">
                          Video preview
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black text-sm font-medium text-white/70">
                      Video Preview
                    </div>
                  )
                ) : null}

                {templateType === 'IMAGE' && mediaPreviewUrl && !canRenderBackgroundInStage ? (
                  <img
                    src={mediaPreviewUrl}
                    alt="Template preview"
                    className="absolute inset-0 h-full w-full bg-white object-cover"
                  />
                ) : null}

                <Stage
                  width={TEMPLATE_CANVAS_WIDTH}
                  height={displayHeight}
                  className="absolute inset-0 z-10"
                  onMouseDown={(e) => {
                    const clickedOnEmpty = e.target === e.target.getStage();

                    if (clickedOnEmpty && editorMode === 'frame') {
                      setSelected(false);
                      setSelectedTextField(null);
                    }
                  }}
                  onWheel={(e) => {
                    if (editorMode !== 'crop' || templateType !== 'IMAGE' || !bannerCrop) {
                      return;
                    }

                    e.evt.preventDefault();
                    updateBackgroundScale(bannerCrop.scale + (e.evt.deltaY < 0 ? 0.08 : -0.08));
                  }}
                >
                  <Layer>
                    {canRenderBackgroundInStage && (
                      <KonvaImage
                        image={bgImage}
                        x={bannerCrop.x}
                        y={bannerCrop.y}
                        width={cropMetrics.renderWidth}
                        height={cropMetrics.renderHeight}
                        draggable={editorMode === 'crop'}
                        onClick={() => {
                          setEditorMode('crop');
                          setSelected(false);
                        }}
                        onTap={() => {
                          setEditorMode('crop');
                          setSelected(false);
                        }}
                        onDragEnd={(e) => {
                          setShouldExportBannerCrop(true);
                          setBannerCrop(
                            clampBackgroundCrop(
                              {
                                ...bannerCrop,
                                x: e.target.x(),
                                y: e.target.y(),
                              },
                              bannerCrop.mediaWidth,
                              bannerCrop.mediaHeight,
                              TEMPLATE_CANVAS_WIDTH,
                              displayHeight,
                            ),
                          );
                        }}
                      />
                    )}

                    {frame.shape === 'circle' ? (
                      <Circle
                        ref={shapeRef}
                        x={getFrameNodePosition(frame).x}
                        y={getFrameNodePosition(frame).y}
                        radius={frame.radius || 50}
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        draggable={editorMode === 'frame'}
                        onClick={() => {
                          setEditorMode('frame');
                          setSelected(true);
                        }}
                        onDragEnd={(e) => {
                          const radius = frame.radius || Math.min(frame.width, frame.height) / 2;
                          setFrame({
                            ...frame,
                            x: e.target.x() - radius,
                            y: e.target.y() - radius,
                          });
                        }}
                        onTransformEnd={handleTransformEnd}
                      />
                    ) : (
                      <Rect
                        ref={shapeRef}
                        x={frame.x}
                        y={frame.y}
                        width={frame.width}
                        height={frame.height}
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        draggable={editorMode === 'frame'}
                        onClick={() => {
                          setEditorMode('frame');
                          setSelected(true);
                        }}
                        onDragEnd={(e) => {
                          setFrame({ ...frame, x: e.target.x(), y: e.target.y() });
                        }}
                        onTransformEnd={handleTransformEnd}
                      />
                    )}

                    {selected && editorMode === 'frame' && (
                      <Transformer
                        ref={trRef}
                        keepRatio={frame.shape !== 'rectangle'}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < MIN_FRAME_SIZE || newBox.height < MIN_FRAME_SIZE) {
                            return oldBox;
                          }

                          return newBox;
                        }}
                      />
                    )}

                    {textFieldName.visible && (
                      <Text
                        ref={textNameRef}
                        x={textFieldName.position.x / FRAME_SCALE}
                        y={textFieldName.position.y / FRAME_SCALE}
                        text={textFieldName.content}
                        fontSize={textFieldName.fontSize / FRAME_SCALE}
                        fontFamily={textFieldName.fontFamily}
                        fontStyle={`${textFieldName.bold ? 'bold ' : ''}${textFieldName.italic ? 'italic ' : ''}`.trim() || 'normal'}
                        fill={textFieldName.color}
                        align={textFieldName.align as any}
                        width={textFieldName.width / FRAME_SCALE}
                        draggable={editorMode === 'frame'}
                        onClick={() => {
                          setEditorMode('frame');
                          setSelectedTextField('name');
                          setSelected(false);
                        }}
                        onTap={() => {
                          setEditorMode('frame');
                          setSelectedTextField('name');
                          setSelected(false);
                        }}
                        onDragEnd={(e) => {
                          setTextFieldName((prev) => ({
                            ...prev,
                            position: {
                              x: Math.round(e.target.x() * FRAME_SCALE),
                              y: Math.round(e.target.y() * FRAME_SCALE),
                            },
                          }));
                        }}
                      />
                    )}

                    {textFieldMessage.visible && (
                      <Text
                        ref={textMessageRef}
                        x={textFieldMessage.position.x / FRAME_SCALE}
                        y={textFieldMessage.position.y / FRAME_SCALE}
                        text={textFieldMessage.content}
                        fontSize={textFieldMessage.fontSize / FRAME_SCALE}
                        fontFamily={textFieldMessage.fontFamily}
                        fontStyle={`${textFieldMessage.bold ? 'bold ' : ''}${textFieldMessage.italic ? 'italic ' : ''}`.trim() || 'normal'}
                        fill={textFieldMessage.color}
                        align={textFieldMessage.align as any}
                        width={textFieldMessage.width / FRAME_SCALE}
                        draggable={editorMode === 'frame'}
                        onClick={() => {
                          setEditorMode('frame');
                          setSelectedTextField('message');
                          setSelected(false);
                        }}
                        onTap={() => {
                          setEditorMode('frame');
                          setSelectedTextField('message');
                          setSelected(false);
                        }}
                        onDragEnd={(e) => {
                          setTextFieldMessage((prev) => ({
                            ...prev,
                            position: {
                              x: Math.round(e.target.x() * FRAME_SCALE),
                              y: Math.round(e.target.y() * FRAME_SCALE),
                            },
                          }));
                        }}
                      />
                    )}

                    {selectedTextField && (
                      <Transformer
                        ref={textTrRef}
                        keepRatio={false}
                        enabledAnchors={[]}
                        boundBoxFunc={(oldBox, newBox) => newBox}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Template Details</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <select
                  value={activeCategoryId}
                  onChange={(e) => {
                    setActiveCategoryId(e.target.value);
                    setActiveSubcategoryId('');
                  }}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={activeSubcategoryId}
                  onChange={(e) => setActiveSubcategoryId(e.target.value)}
                  disabled={!activeCategoryId || subcategories.length === 0}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
                >
                  <option value="">Select subcategory (optional)</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as 'IMAGE' | 'VIDEO')}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="IMAGE">Image Template</option>
                  <option value="VIDEO">Video Template</option>
                </select>
                <input
                  type="text"
                  value={thumbnailKey}
                  onChange={(e) => setThumbnailKey(e.target.value)}
                  placeholder="Thumbnail key"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <input
                  type="text"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  placeholder="Template key"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Language"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <label className="flex items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Mark as premium
                </label>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Banner Crop</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                    <span>Zoom</span>
                    <span>{bannerCrop ? `${bannerCrop.scale.toFixed(2)}x` : '1.00x'}</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_BANNER_SCALE}
                    max={MAX_BANNER_SCALE}
                    step={0.01}
                    value={bannerCrop?.scale ?? 1}
                    onChange={(e) => updateBackgroundScale(Number(e.target.value))}
                    disabled={templateType !== 'IMAGE' || !bannerCrop}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => {
                    if (bgImage?.width && bgImage?.height) {
                      setShouldExportBannerCrop(true);
                      setBannerCrop(createDefaultBackgroundCrop(bgImage.width, bgImage.height, TEMPLATE_CANVAS_WIDTH, displayHeight));
                    }
                  }}
                  disabled={templateType !== 'IMAGE' || !bgImage}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                >
                  Reset Crop
                </button>
                <p className="text-xs text-zinc-500">
                  This saved crop is sent with the template so the React Native app can render the same banner position before placing the user photo.
                </p>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Frame Size</h3>
              <div className="space-y-4">
                {frame.shape === 'rectangle' ? (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                        <span>Width</span>
                        <span>{Math.round(frame.width * FRAME_SCALE)}px</span>
                      </div>
                      <div className="grid grid-cols-[1fr_76px] gap-3">
                        <input
                          type="range"
                          min={MIN_FRAME_SIZE}
                          max={MAX_FRAME_SIZE}
                          step={1}
                          value={Math.round(frame.width)}
                          onChange={(e) => updateFrameSize(Number(e.target.value), frame.height)}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={MIN_FRAME_SIZE}
                          max={MAX_FRAME_SIZE}
                          value={Math.round(frame.width * FRAME_SCALE)}
                          readOnly
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                        <span>Height</span>
                        <span>{Math.round(frame.height * FRAME_SCALE)}px</span>
                      </div>
                      <div className="grid grid-cols-[1fr_76px] gap-3">
                        <input
                          type="range"
                          min={MIN_FRAME_SIZE}
                          max={MAX_FRAME_SIZE}
                          step={1}
                          value={Math.round(frame.height)}
                          onChange={(e) => updateFrameSize(frame.width, Number(e.target.value))}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={MIN_FRAME_SIZE}
                          max={MAX_FRAME_SIZE}
                          value={Math.round(frame.height * FRAME_SCALE)}
                          readOnly
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                      <span>Size</span>
                      <span>{Math.round(frame.width * FRAME_SCALE)}px</span>
                    </div>
                    <div className="grid grid-cols-[1fr_76px] gap-3">
                      <input
                        type="range"
                        min={MIN_FRAME_SIZE}
                        max={MAX_FRAME_SIZE}
                        step={1}
                        value={Math.round(frame.width)}
                        onChange={(e) => updateFrameSize(Number(e.target.value))}
                        className="w-full"
                      />
                      <input
                        type="number"
                        min={MIN_FRAME_SIZE}
                        max={MAX_FRAME_SIZE}
                        value={Math.round(frame.width * FRAME_SCALE)}
                        readOnly
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-zinc-900 p-6 rounded-3xl text-white shadow-xl shadow-zinc-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Move size={18} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Editor Tips</h3>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                <li>Upload banner media first so the preview and asset key are filled automatically.</li>
                <li>Crop the banner first, then switch to photo mode to place the user image frame.</li>
                <li>Open templates from Categories to load and edit an existing template quickly.</li>
              </ul>
            </section>
            </div>

            <div className="space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Editor Mode</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setEditorMode('crop');
                    setSelected(false);
                    setSelectedTextField(null);
                  }}
                  disabled={templateType !== 'IMAGE' || !bgImage}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    editorMode === 'crop'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100'
                  } disabled:opacity-50`}
                >
                  Crop
                </button>
                <button
                  onClick={() => {
                    setEditorMode('frame');
                    setSelectedTextField(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    editorMode === 'frame' && !selectedTextField
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => {
                    setEditorMode('frame');
                    setSelected(false);
                    setSelectedTextField(selectedTextField || 'name');
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    selectedTextField
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Text
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Crop mode adjusts the banner. Photo mode lets you drag the user image frame. Text mode lets you position name and message fields.
              </p>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Frame Shape</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleShapeChange('circle')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    frame.shape === 'circle'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <CircleIcon size={20} />
                  <span className="text-xs font-semibold">Circle</span>
                </button>
                <button
                  onClick={() => handleShapeChange('square')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    frame.shape === 'square'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <Square size={20} />
                  <span className="text-xs font-semibold">Square</span>
                </button>
                <button
                  onClick={() => handleShapeChange('rectangle')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    frame.shape === 'rectangle'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <RectangleHorizontal size={20} />
                  <span className="text-xs font-semibold">Rect</span>
                </button>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Animations</h3>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Photo Frame</label>
                <select
                  value={photoFrameAnimation}
                  onChange={(e) => setPhotoFrameAnimation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                >
                  {ANIMATION_DEFINITIONS.map((anim) => (
                    <option key={anim.id} value={anim.id}>
                      {anim.label} ({anim.type})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">Animation applied to the photo frame and content elements.</p>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Accent Color</h3>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-zinc-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono"
                />
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Text Fields</h3>
                <Type size={16} className="text-zinc-400" />
              </div>
              <div className="space-y-4">
                {(['name', 'message'] as const).map((fieldKey) => {
                  const field = fieldKey === 'name' ? textFieldName : textFieldMessage;
                  const setField = fieldKey === 'name' ? setTextFieldName : setTextFieldMessage;
                  const isActive = selectedTextField === fieldKey;
                  return (
                    <div
                      key={fieldKey}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive ? 'border-indigo-300 bg-indigo-50/50' : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100'
                      }`}
                      onClick={() => {
                        setSelectedTextField(fieldKey);
                        setSelected(false);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{fieldKey === 'name' ? 'Name Field' : 'Message Field'}</span>
                        <label className="flex items-center gap-2 text-xs text-zinc-500">
                          <input
                            type="checkbox"
                            checked={field.visible}
                            onChange={(e) => setField((prev) => ({ ...prev, visible: e.target.checked }))}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Visible
                        </label>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={field.content}
                          onChange={(e) => setField((prev) => ({ ...prev, content: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Content (e.g. {{name}})"
                          className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Color</label>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="color"
                                value={field.color}
                                onChange={(e) => setField((prev) => ({ ...prev, color: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 w-9 rounded border border-zinc-200 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={field.color}
                                onChange={(e) => setField((prev) => ({ ...prev, color: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-[11px] font-mono focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Font Size</label>
                            <input
                              type="number"
                              min={8}
                              max={200}
                              value={field.fontSize}
                              onChange={(e) => setField((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full mt-0.5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-[11px] font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                            <input
                              type="checkbox"
                              checked={field.bold}
                              onChange={(e) => setField((prev) => ({ ...prev, bold: e.target.checked, fontWeight: e.target.checked ? 'bold' : 'normal' }))}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3 w-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Bold
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                            <input
                              type="checkbox"
                              checked={field.italic}
                              onChange={(e) => setField((prev) => ({ ...prev, italic: e.target.checked }))}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3 w-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Italic
                          </label>
                          <select
                            value={field.align}
                            onChange={(e) => setField((prev) => ({ ...prev, align: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-0.5 bg-white border border-zinc-200 rounded-lg text-[11px] focus:outline-none"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Template Variables</h3>
              <div className="space-y-3">
                {templateVariables.map((variable, index) => (
                  <div key={variable.key} className="grid grid-cols-[1fr_1fr] gap-2">
                    <input
                      type="text"
                      value={variable.label}
                      onChange={(e) => {
                        setTemplateVariables((prev) => prev.map((v, i) => i === index ? { ...v, label: e.target.value } : v));
                      }}
                      placeholder="Label"
                      className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <input
                      type="text"
                      value={variableValues[variable.key] || ''}
                      onChange={(e) => {
                        setVariableValues((prev) => ({ ...prev, [variable.key]: e.target.value }));
                      }}
                      placeholder="Default value"
                      className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newKey = `var_${Date.now()}`;
                    setTemplateVariables((prev) => [...prev, { key: newKey, label: '', type: 'text', default: '' }]);
                  }}
                  className="w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  + Add Variable
                </button>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Live Coordinates</h3>
              <div className="space-y-3">
                {bannerCrop && cropMetrics && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Banner X</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(bannerCrop.x * FRAME_SCALE)}px</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Banner Y</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(bannerCrop.y * FRAME_SCALE)}px</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Crop Source X</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(cropMetrics.sourceX * FRAME_SCALE)}px</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Crop Source Y</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(cropMetrics.sourceY * FRAME_SCALE)}px</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Crop Width</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(cropMetrics.sourceWidth * FRAME_SCALE)}px</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Crop Height</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(cropMetrics.sourceHeight * FRAME_SCALE)}px</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-500">Frame X</span>
                  <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.x * FRAME_SCALE)}px</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-500">Frame Y</span>
                  <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.y * FRAME_SCALE)}px</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-500">Frame Width</span>
                  <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.width * FRAME_SCALE)}px</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-500">Frame Height</span>
                  <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.height * FRAME_SCALE)}px</span>
                </div>
                {frame.shape === 'circle' && (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-500">Radius</span>
                    <span className="text-sm font-mono font-bold text-zinc-900">{Math.round((frame.radius || 0) * FRAME_SCALE)}px</span>
                  </div>
                )}
              </div>
            </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
