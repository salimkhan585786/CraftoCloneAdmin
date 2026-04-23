import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Upload, Save, Trash2, Maximize2, Move, Circle as CircleIcon, Square, RectangleHorizontal, ChevronLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PhotoFrame } from '../types';
import { motion } from 'motion/react';

export default function TemplateEditor() {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [bgImage] = useImage(backgroundImageUrl || '');
  
  const [frame, setFrame] = useState<PhotoFrame>({
    shape: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    radius: 0
  });

  const [selected, setSelected] = useState(false);
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selected]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackgroundImageUrl(url);
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
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and update width/height
    node.scaleX(1);
    node.scaleY(1);

    const updatedFrame = {
      ...frame,
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    };

    if (frame.shape === 'circle') {
      updatedFrame.radius = updatedFrame.width / 2;
    } else if (frame.shape === 'square') {
      const size = Math.max(updatedFrame.width, updatedFrame.height);
      updatedFrame.width = size;
      updatedFrame.height = size;
    }

    setFrame(updatedFrame);
  };

  const handleSave = () => {
    const templateData = {
      categoryId,
      photoFrame: frame,
      bannerImage: backgroundImageUrl ? 'base64_or_url_placeholder' : null
    };
    console.log('Saved Template JSON:', JSON.stringify(templateData, null, 2));
    alert('Template saved successfully! Check console for JSON output.');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/categories" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Template Editor</h1>
            <p className="text-zinc-500 text-sm">Category ID: {categoryId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Upload size={18} />
            Upload Banner
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Save size={18} />
            Save Template
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Editor Canvas */}
        <div className="lg:col-span-3 bg-zinc-100 rounded-3xl border border-zinc-200 overflow-hidden min-h-[600px] relative flex items-center justify-center">
          {!backgroundImageUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <div className="w-20 h-20 bg-zinc-200 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-600">No Background Image</h3>
              <p className="max-w-xs mt-2">Upload a banner image to start placing your photo frame.</p>
            </div>
          )}
          
          <div className="bg-white shadow-2xl">
            <Stage
              width={800}
              height={500}
              onMouseDown={(e) => {
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelected(false);
                }
              }}
            >
              <Layer>
                {bgImage && (
                  <KonvaImage
                    image={bgImage}
                    width={800}
                    height={500}
                  />
                )}
                
                {frame.shape === 'circle' ? (
                  <Circle
                    ref={shapeRef}
                    x={frame.x}
                    y={frame.y}
                    radius={frame.radius || 50}
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

        {/* Sidebar Controls */}
        <div className="space-y-6">
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

          <section className="bg-zinc-900 p-6 rounded-3xl text-white shadow-xl shadow-zinc-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Move size={18} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Editor Tips</h3>
            </div>
            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
              <li>Click on the frame to select it for resizing.</li>
              <li>Drag the frame to move it anywhere on the banner.</li>
              <li>Use the handles to resize the photo frame.</li>
              <li>Click on empty space to deselect.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
