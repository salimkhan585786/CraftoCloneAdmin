import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Transformer } from 'react-konva';
import useImage from 'use-image';
import {
  Upload,
  Save,
  Move,
  Circle as CircleIcon,
  Square,
  RectangleHorizontal,
  ChevronLeft,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminTemplate, PhotoFrame, TemplatePayload } from '../types';
import { templateService } from '../services/templateService';

const TEMPLATE_CANVAS_WIDTH = 400;
const TEMPLATE_CANVAS_HEIGHT = 560;

const emptyFrame: PhotoFrame = {
  shape: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
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

function getDisplayUrl(remoteUrl: string | null | undefined, file: File) {
  return remoteUrl || URL.createObjectURL(file);
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
  const [selected, setSelected] = useState(false);
  const [bgImage] = useImage(templateType === 'IMAGE' ? mediaPreviewUrl || '' : '');

  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selected]);

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

  const hydrateTemplate = (template: AdminTemplate) => {
    setActiveCategoryId(template.category_id || initialCategoryId || '');
    setTemplateName(template.name || '');
    setTemplateType(template.type || 'IMAGE');
    setLanguage(template.language || 'en');
    setThumbnailKey(template.thumbnail_key || '');
    setTemplateKey(template.template_key || '');
    setMediaPreviewUrl(template.template_url || null);
    setIsPremium(Boolean(template.is_premium));
    setExistingConfigJson(template.config_json ?? null);
    setSelected(false);

    const maybeFrame = template.config_json ? (template.config_json as Record<string, unknown>).photo_frame : null;
    setFrame(isPhotoFrame(maybeFrame) ? maybeFrame : emptyFrame);
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
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    };

    if (frame.shape === 'circle') {
      updatedFrame.radius = updatedFrame.width / 2;
      updatedFrame.x = node.x() - updatedFrame.width / 2;
      updatedFrame.y = node.y() - updatedFrame.height / 2;
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

  const handleAssetUpload = async (file: File) => {
    setError('');
    setSuccessMessage('');
    setIsUploadingBanner(true);

    try {
      const asset = await templateService.uploadAsset(file);
      const previewUrl = getDisplayUrl(asset.url, file);
      const nextType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      const derivedKeys = deriveKeysFromUpload(file, asset.key);

      setTemplateType(nextType);
      setTemplateKey(derivedKeys.templateAssetKey);
      setThumbnailKey(derivedKeys.thumbnailAssetKey);
      setMediaPreviewUrl(previewUrl);

      if (!templateName.trim()) {
        setTemplateName(derivedKeys.defaultTemplateName);
      }

      setSuccessMessage(`${nextType === 'VIDEO' ? 'Video' : 'Image'} banner uploaded successfully.`);
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

  const buildPayload = (): TemplatePayload => {
    const nextConfig = { ...(existingConfigJson ?? {}) };

    if (mediaPreviewUrl) {
      nextConfig.background_preview = mediaPreviewUrl;
    }

    nextConfig.photo_frame = frame;

    return {
      name: templateName,
      type: templateType,
      category_id: activeCategoryId,
      thumbnail_key: thumbnailKey,
      template_key: templateKey,
      config_json: Object.keys(nextConfig).length ? nextConfig : null,
      is_premium: isPremium,
      language,
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

    const payload = buildPayload();

    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/categories" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{templateId ? 'Edit Template' : 'Template Editor'}</h1>
            <p className="text-zinc-500 text-sm">Category ID: {activeCategoryId || 'Missing'}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-zinc-100 rounded-3xl border border-zinc-200 overflow-hidden min-h-[600px] relative flex items-start justify-center">
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
              <div className="relative" style={{ width: TEMPLATE_CANVAS_WIDTH, height: TEMPLATE_CANVAS_HEIGHT }}>
                {templateType === 'VIDEO' ? (
                  mediaPreviewUrl ? (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      className="absolute inset-0 h-full w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black text-sm font-medium text-white/70">
                      Video Preview
                    </div>
                  )
                ) : (
                  bgImage && (
                    <img
                      src={mediaPreviewUrl || ''}
                      alt="Template preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )
                )}

                <Stage
                  width={TEMPLATE_CANVAS_WIDTH}
                  height={TEMPLATE_CANVAS_HEIGHT}
                  className="absolute inset-0"
                  onMouseDown={(e) => {
                    const clickedOnEmpty = e.target === e.target.getStage();

                    if (clickedOnEmpty) {
                      setSelected(false);
                    }
                  }}
                >
                  <Layer>
                    {frame.shape === 'circle' ? (
                      <Circle
                        ref={shapeRef}
                        x={getFrameNodePosition(frame).x}
                        y={getFrameNodePosition(frame).y}
                        radius={frame.radius || 50}
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        draggable
                        onClick={() => setSelected(true)}
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
                        draggable
                        onClick={() => setSelected(true)}
                        onDragEnd={(e) => {
                          setFrame({ ...frame, x: e.target.x(), y: e.target.y() });
                        }}
                        onTransformEnd={handleTransformEnd}
                      />
                    )}

                    {selected && (
                      <Transformer
                        ref={trRef}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                          }

                          return newBox;
                        }}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>

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
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Uploaded Banner</h3>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">Banner Preview</p>
                {mediaPreviewUrl ? (
                  templateType === 'VIDEO' ? (
                    <video src={mediaPreviewUrl} controls className="w-full rounded-2xl bg-black max-h-48" />
                  ) : (
                    <img src={mediaPreviewUrl} alt="Banner preview" className="w-full rounded-2xl object-cover max-h-48" />
                  )
                ) : (
                  <div className="h-32 rounded-2xl border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400">
                    {templateType === 'VIDEO' ? <Film size={24} /> : <ImageIcon size={24} />}
                  </div>
                )}
                <p className="mt-3 text-xs text-zinc-500">
                  Banner upload now auto-fills both `template_key` and `thumbnail_key`. You can still edit those fields manually before saving.
                </p>
              </div>
            </section>

            <>
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
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Live Coordinates</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-500">X Position</span>
                    <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.x)}px</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-500">Y Position</span>
                    <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.y)}px</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-500">Width</span>
                    <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.width)}px</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-500">Height</span>
                    <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.height)}px</span>
                  </div>
                  {frame.shape === 'circle' && (
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-xs font-bold text-zinc-500">Radius</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{Math.round(frame.radius || 0)}px</span>
                    </div>
                  )}
                </div>
              </section>
            </>

            <section className="bg-zinc-900 p-6 rounded-3xl text-white shadow-xl shadow-zinc-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Move size={18} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Editor Tips</h3>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                <li>Upload banner media first so the preview and asset key are filled automatically.</li>
                <li>Use image mode when you need to place a draggable photo frame on the banner.</li>
                <li>Open templates from Categories to load and edit an existing template quickly.</li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
