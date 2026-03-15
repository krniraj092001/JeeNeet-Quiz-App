import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  BrainCircuit, 
  BookOpen, 
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Loader2,
  Volume2,
  ExternalLink,
  Camera,
  Crop,
  Zap,
  ZapOff
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { solveDoubt, generateSpeech } from '../services/geminiService';
import { DoubtResponse, Language } from '../types';
import LatexMarkdown from './LatexMarkdown';
import { cn } from '../utils';

interface DoubtSolverProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  language: Language;
  isSubscribed: boolean;
  onShowPaywall: () => void;
  doubtCount: number;
  incrementDoubtCount: () => void;
}

export default function DoubtSolver({ 
  onBack, 
  theme, 
  language, 
  isSubscribed, 
  onShowPaywall,
  doubtCount,
  incrementDoubtCount
}: DoubtSolverProps) {
  const [questionText, setQuestionText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DoubtResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleCropSave = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const base64Data = croppedImage.split(',')[1];
        setSelectedImage({
          data: base64Data,
          mimeType: 'image/jpeg'
        });
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      // Check if any video devices exist first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
      
      if (!hasVideoDevice) {
        throw new Error("No camera device found on this system.");
      }
      
      let mediaStream: MediaStream;
      try {
        // Try environment camera first with ideal constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } },
          audio: false 
        });
      } catch (e) {
        console.warn("Environment camera failed, trying simple video constraint...");
        try {
          // Try any video device
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
          });
        } catch (e2) {
          console.warn("Simple video constraint failed, trying minimal constraints...");
          // Last resort: minimal constraints
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);

      // Check for flash capability
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        // @ts-ignore
        const capabilities = track.getCapabilities?.() || {};
        // @ts-ignore
        const settings = track.getSettings?.() || {};
        
        // Some browsers might have it in settings or capabilities
        // Also show for mobile devices as they usually have flash even if capabilities aren't reported correctly
        // @ts-ignore
        const canTorch = !!capabilities.torch || 'torch' in settings || (!!track.applyConstraints && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        setHasFlash(canTorch);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let msg = "Could not access camera.";
      
      const errorName = err.name || '';
      const errorMessage = err.message || '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        msg = "Camera permission denied. Please enable camera access in your browser settings to take photos.";
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorMessage.toLowerCase().includes('device not found') || errorMessage.toLowerCase().includes('notfounderror')) {
        msg = "No camera found or the requested camera device is not available. Please ensure your camera is connected and not in use by another app.";
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        msg = "Camera is already in use by another application or a hardware error occurred.";
      } else if (errorMessage.includes('Camera API not supported')) {
        msg = "Camera API is not supported in this browser or requires a secure (HTTPS) connection.";
      }
      
      setCameraError(msg);
      // Fallback to native camera input (file picker with capture attribute)
      cameraInputRef.current?.click();
      
      // Clear error after 5 seconds
      setTimeout(() => setCameraError(null), 5000);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const newFlashState = !isFlashOn;
        // @ts-ignore
        await track.applyConstraints({
          advanced: [{ torch: newFlashState }]
        } as any);
        setIsFlashOn(newFlashState);
      } catch (err) {
        console.error("Error toggling flash:", err);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageToCrop(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      audioRef.current?.pause();
      setIsSpeaking(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
      setIsSpeaking(true);
      return;
    }

    if (!response?.explanation) return;

    setIsSpeaking(true);
    try {
      const url = await generateSpeech(response.explanation);
      if (url) {
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      }
    } catch (err) {
      console.error(err);
      setIsSpeaking(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() && !selectedImage) return;

    if (!isSubscribed && doubtCount >= 5) {
      onShowPaywall();
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await solveDoubt(questionText, selectedImage || undefined, language);
      setResponse(result);
      incrementDoubtCount();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to solve doubt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className={cn(
            "flex items-center gap-2 transition-all font-medium",
            theme === 'light' ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-white"
          )}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h1 className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>AI Doubt Solver</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-6 rounded-3xl border shadow-sm space-y-4",
            theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
          )}
          style={{ borderWidth: '4px', borderColor: '#0d6def' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type your doubt here (e.g., 'Explain the concept of angular momentum' or paste a question)..."
                className={cn(
                  "w-full h-32 p-4 rounded-2xl border transition-all resize-none focus:ring-2 focus:ring-indigo-500 outline-none",
                  theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-800 border-slate-700 text-white"
                )}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={cameraInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={startCamera}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    theme === 'light' ? "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
                  )}
                  title="Take photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    theme === 'light' ? "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
                  )}
                  title="Upload image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedImage && (
              <div className="relative inline-block group">
                <img 
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                  alt="Selected" 
                  className="h-24 w-auto rounded-xl border border-indigo-200 shadow-sm"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImageToCrop(`data:${selectedImage.mimeType};base64,${selectedImage.data}`)}
                    className="p-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="Crop image"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="p-1.5 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!questionText.trim() && !selectedImage)}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Solving your doubt...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Solve Doubt
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Live Camera Modal */}
        <AnimatePresence>
          {isCameraActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
            >
              <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                
                {/* Top Controls */}
                <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                  <button 
                    onClick={stopCamera}
                    className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {hasFlash && (
                    <button 
                      onClick={toggleFlash}
                      className={cn(
                        "p-3 rounded-full backdrop-blur-md transition-all flex items-center gap-2",
                        isFlashOn ? "bg-amber-500 text-white shadow-lg shadow-amber-500/40" : "bg-black/40 text-white hover:bg-black/60"
                      )}
                    >
                      {isFlashOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                      <span className="text-xs font-bold uppercase tracking-wider pr-1">Flash {isFlashOn ? 'On' : 'Off'}</span>
                    </button>
                  )}
                </div>
                
                {/* Bottom Controls */}
                <div className="absolute inset-x-0 bottom-0 p-8 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent">
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-slate-900" />
                  </button>
                </div>

                <div className="absolute top-6 left-1/2 -translate-x-1/2">
                  <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Camera</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Cropper Modal */}
        <AnimatePresence>
          {imageToCrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  "relative w-full max-w-2xl h-[80vh] rounded-3xl overflow-hidden flex flex-col",
                  theme === 'light' ? "bg-white" : "bg-slate-900"
                )}
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className={cn("font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Crop Image</h3>
                  <button 
                    onClick={() => setImageToCrop(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <div className="relative flex-1 bg-slate-100">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={undefined}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setImageToCrop(null)}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold transition-all",
                        theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCropSave}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      Apply Crop
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response Section */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                >
                  <BrainCircuit className="w-16 h-16 text-indigo-500 opacity-20" />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className={cn("text-lg font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>NITian is thinking...</h3>
                <p className="text-slate-500 text-sm">Analyzing your question and preparing a detailed solution.</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium flex items-center gap-2"
            >
              <X className="w-4 h-4" /> {error}
            </motion.div>
          )}

          {cameraError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm font-medium flex items-center gap-2"
            >
              <Camera className="w-4 h-4" /> {cameraError}
              <button onClick={() => setCameraError(null)} className="ml-auto p-1 hover:bg-amber-100 rounded-full">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Solution Card */}
              <div className={cn(
                "p-8 rounded-3xl border shadow-sm space-y-6",
                theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              )}
              style={{ borderWidth: '3px', borderColor: '#fe0808' }}
              >
                <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className={cn("font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Solution</h2>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                          {response.subject}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                          {response.topic}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSpeak}
                      className={cn(
                        "p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold",
                        isSpeaking 
                          ? "bg-indigo-600 text-white" 
                          : theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      <Volume2 className={cn("w-4 h-4", isSpeaking && "animate-pulse")} />
                      {isSpeaking ? "Stop" : "Listen"}
                    </button>
                    <audio 
                      ref={audioRef} 
                      onEnded={() => setIsSpeaking(false)} 
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Explanation */}
                  <div className={cn(
                    "p-8 rounded-2xl border bg-dots",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}>
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-6">
                      <BookOpen className="w-4 h-4" /> Step-by-Step Explanation
                    </div>
                    <div className={cn("leading-relaxed text-base", theme === 'light' ? "text-slate-700" : "text-slate-300")}>
                      <LatexMarkdown content={response.explanation} theme={theme} />
                    </div>
                  </div>

                  {/* Diagram */}
                  {response.diagramUrl && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <ImageIcon className="w-4 h-4" /> Visual Aid
                      </div>
                      <div className="flex justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <img 
                          src={response.diagramUrl} 
                          alt="Solution Diagram" 
                          className="max-w-full h-auto rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Grounding Sources */}
                  {response.sources && response.sources.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <ExternalLink className="w-3 h-3" /> Grounded Sources (Google Search)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {response.sources.map((source, i) => (
                          <a 
                            key={i}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all",
                              theme === 'light' ? "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                            )}
                          >
                            {source.title}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => {
                      setResponse(null);
                      setQuestionText('');
                      setSelectedImage(null);
                    }}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Ask another doubt
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
