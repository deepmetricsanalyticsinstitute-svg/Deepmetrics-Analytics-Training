import React, { useRef, useState, useEffect } from 'react';
import { Course, User } from '../types';
import { Button } from './Button';

// Add type definition for the external library to prevent build errors
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface CertificateProps {
  user: User;
  course: Course;
  onClose: () => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  allCourses?: Course[]; // Used for admin signature manager
}

type TemplateType = 'classic' | 'modern' | 'elegant';

// Aspect ratio for the signature slot (512x224)
const SIGNATURE_ASPECT_RATIO = 512 / 224;

export const Certificate: React.FC<CertificateProps> = ({ user, course, onClose, onUpdateCourse, allCourses }) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [template, setTemplate] = useState<TemplateType>('classic');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadQuality, setDownloadQuality] = useState<'standard' | 'high'>('high');
  
  // Cropping State
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isCroppedPreview, setIsCroppedPreview] = useState(false);
  
  // New Crop Box Logic
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [interactionMode, setInteractionMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Admin Signature Manager State
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isAdmin = user.role === 'admin';

  // Generate a deterministic unique ID
  const certificateId = React.useMemo(() => {
    const str = `${user.id}-${course.id}-${user.email}`;
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    let seed = Math.abs(hash);
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for(let i=0; i<12; i++) {
        code += chars[seed % 36];
        seed = (seed * 1664525 + 1013904223) % 4294967296; 
    }
    return `DMAI-${new Date().getFullYear()}-${code.substring(0,4)}-${code.substring(4,8)}-${code.substring(8,12)}`;
  }, [user.id, course.id, user.email]);

  const logoUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgMTUwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjE1MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnb2xkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkNEMzREIi8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNGNTlFMEIiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNCNDUzMDkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMCwgMTApIj48cGF0aCBkPSJNMjAsMTAgTDcwLDEwIEMxMDAsMTAgMTIwLDMwIDEyMCw2NSBDMTIwLDEwMCAxMDAsMTIwIDcwLDEyMCBMMjAsMTIwIFogTTM1LDI1IEwzNSwxMDUgTDcwLDEwNSBDOTAsMTA1IDEwNSw5MCAxMDUsNjUgQzEwNSw0MCA5MCwyNSA3MCwyNSBaIiBmaWxsPSJ1cmwoI2dvbGQpIi8+PHJlY3QgeD0iNDIiIHk9IjcwIiB3aWR0aD0iMTAiIGhlaWdodD0iMzUiIHJ4PSIxIiBmaWxsPSJ1cmwoI2dvbGQpIi8+PHJlY3QgeD0iNTgiIHk9IjU1IiB3aWR0aD0iMTAiIGhlaWdodD0iNTAiIHJ4PSIxIiBmaWxsPSJ1cmwoI2dvbGQpIi8+PHJlY3QgeD0iNzQiIHk9IjQwIiB3aWR0aD0iMTAiIGhlaWdodD0iNjUiIHJ4PSIxIiBmaWxsPSJ1cmwoI2dvbGQpIi8+PGNpcmNsZSBjeD0iNDciIGN5PSI3MCIgcj0iNCIgZmlsbD0idXJsKCNnb2xkKSIvPjxjaXJjbGUgY3g9IjYzIiBjeT0iNTUiIHI9IjQiIGZpbGw9InVybCgjZ29sZCkiLz48Y2lyY2xlIGN4PSI3OSIgY3k9IjQwIiByPSI0IiBmaWxsPSJ1cmwoI2dvbGQpIi8+PHBvbHlsaW5lIHBvaW50cz0iNDcsNzAgNjMsNTUgNzksNDAgMTA1LDIwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjZ29sZCkiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iMTA1IiBjeT0iMjAiIHI9IjQiIGZpbGw9InVybCgjZ29sZCkiLz48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTQwLCAxNSkiPjx0ZXh0IHg9IjAiIHk9Ijc1IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9Ijg1IiBmaWxsPSIjMWUxYjRiIj5EZWVwbWV0cmljczwvdGV4dD48dGV4dCB4PSI1IiB5PSIxMDUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIyMiIgbGV0dGVyLXNwYWNpbmc9IjUiIGZpbGw9IiNCNDUzMDkiPkFOQUxZVElDUyBJTlNUSVRVVEU8L3RleHQ+PC9nPjwvc3ZnPg==";
  const noiseTexture = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=";
  const dotPattern = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=";
  
  // Theme Watermarks
  const classicWatermark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+ICA8ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSI+ICAgIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjAwIiBvcGFjaXR5PSIwLjMiLz4gICAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIxODAiIG9wYWNpdHk9IjAuMyIvPiAgICA8cGF0aCBkPSJNMjUwIDUwIEwyNTAgNDUwIE01MCAyNTAgTDQ1MCAyNTAgTTEwOCAxMDggTDM5MiAzOTIgTTEwOCAzOTIgTDM5MiAxMDgiIG9wYWNpdHk9IjAuMiIvPiAgICA8Y2lyY2xlIGN4PSIyNTAiIGN5PSIyNTAiIHI9IjEwMCIgb3BhY2l0eT0iMC4yIi8+ICAgIDxwYXRoIGQ9Ik0yNTAgMTUwIFEzNTAgMjUwIDI1MCAzNTAgQTE1MCAyNTAgMjUwIDE1MCIgb3BhY2l0eT0iMC4yIi8+ICAgIDxwYXRoIGQ9Ik0xNTAgMjUwIFEyNTAgMTUwIDM1MCAyNTAgQTI1MCAzNTAgMTUwIDI1MCIgb3BhY2l0eT0iMC4yIi8+ICA8L2c+PC9zdmc+";
  const modernWatermark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+ICA8ZGVmcz4gICAgPHBhdHRlcm4gaWQ9Im1vZGVybkdyaWQiIHg9IjAiIHk9IjAiIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+ICAgICAgPHBhdGggZD0iTSA1MCAwIEwgMCAwIDAgNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMyIvPiAgICAgIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIxIiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjUiLz4gICAgPC9wYXR0ZXJuPiAgPC9kZWZzPiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNtb2Rlcm5HcmlkKSIgLz4gIDxwYXRoIGQ9Ik0wIDUwMCBMNTAwIDAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjEiLz4gIDxjaXJjbGUgY3g9IjQwMCIgY3k9IjEwMCIgcj0iNTAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjEiLz48L3N2Zz4=";
  const elegantWatermark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+ICA8ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4yIj4gICAgICA8IS0tIFN0eWxpemVkIExhdXJlbCBXcmVhdGggYXBwcm94aW1hdGlvbiAtLT4gICAgICA8cGF0aCBkPSJNMTUwIDQwMCBDIDEwMCAzMDAsIDEwMCAxNTAsIDI1MCAxMDAiIC8+ICAgICAgPHBhdGggZD0iTTM1MCA0MDAgQyA0MDAgMzAwLCA0MDAgMTUwIDI1MCAxMDAiIC8+ICAgICAgPCEtLSBMZWF2ZXMgLS0+ICAgICAgPHBhdGggZD0iTTE1MCAzNTAgTDEzMCAzNDAgTTE2MCAzMDAgTDE0MCAyOTAgTTE3MCAyNTAgTDE1MCAyNDAiIC8+ICAgICAgPHBhdGggZD0iTTM1MCAzNTAgTDM3MCAzNDAgTTM0MCAzMDAgTDM2MCAyOTAgTTMzMCAyNTAgTDM1MCAyNDAiIC8+ICA8L2c+PC9zdmc+";

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        const certificateWidth = 1123;
        const padding = 32;
        const newScale = Math.min((parentWidth - padding) / certificateWidth, 1);
        setScale(Math.max(newScale, 0.1));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (uploadError) {
        const timer = setTimeout(() => setUploadError(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [uploadError]);

  // Global Mouse Move for Cropping
  useEffect(() => {
    if (!interactionMode) return;

    const handleWindowMouseMove = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const deltaX = clientX - dragStart.x;
        const deltaY = clientY - dragStart.y;

        setCropBox(prev => {
            let newBox = { ...prev };
            const { width: maxW, height: maxH } = imgDimensions;

            if (interactionMode === 'move') {
                newBox.x = Math.max(0, Math.min(initialBox.x + deltaX, maxW - initialBox.width));
                newBox.y = Math.max(0, Math.min(initialBox.y + deltaY, maxH - initialBox.height));
                newBox.width = initialBox.width;
                newBox.height = initialBox.height;
            } else if (interactionMode === 'resize') {
                // Resize from bottom-right (SE)
                let newWidth = initialBox.width + deltaX;
                
                // Min size
                newWidth = Math.max(50, newWidth);
                
                // Aspect Ratio Height
                let newHeight = newWidth / SIGNATURE_ASPECT_RATIO;
                
                // Boundaries
                if (initialBox.x + newWidth > maxW) {
                    newWidth = maxW - initialBox.x;
                    newHeight = newWidth / SIGNATURE_ASPECT_RATIO;
                }
                
                if (initialBox.y + newHeight > maxH) {
                    newHeight = maxH - initialBox.y;
                    newWidth = newHeight * SIGNATURE_ASPECT_RATIO;
                }
                
                newBox.width = newWidth;
                newBox.height = newHeight;
            }

            return newBox;
        });
    };

    const handleWindowUp = () => {
        setInteractionMode(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('touchmove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchend', handleWindowUp);

    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('touchmove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowUp);
        window.removeEventListener('touchend', handleWindowUp);
    };
  }, [interactionMode, dragStart, initialBox, imgDimensions]);

  const handleDownload = async () => {
      if (!certificateRef.current) return;
      setIsGenerating(true);
      const original = certificateRef.current;
      const clone = original.cloneNode(true) as HTMLElement;
      
      const noPrintEls = clone.querySelectorAll('.no-print');
      noPrintEls.forEach(el => el.remove());
      
      clone.classList.remove('shadow-2xl', 'rounded-xl', 'my-8');
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0';
      clone.style.fontFeatureSettings = '"kern" 1, "liga" 1';
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.width = '1123px';
      clone.style.height = '794px';
      clone.style.maxWidth = 'none';
      clone.style.maxHeight = 'none';
      
      const idElement = clone.querySelector('.certificate-id-container');
      if (idElement) {
          (idElement as HTMLElement).style.position = 'relative';
          (idElement as HTMLElement).style.zIndex = '50';
      }
      
      const originalLogo = original.querySelector('img[alt="Deepmetrics Analytics Institute"]') as HTMLImageElement;
      const cloneLogo = clone.querySelector('img[alt="Deepmetrics Analytics Institute"]') as HTMLImageElement;
      
      if (originalLogo && cloneLogo) {
          try {
              const canvas = document.createElement('canvas');
              canvas.width = 1200; 
              canvas.height = 300; 
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  if (originalLogo.complete) {
                     ctx.drawImage(originalLogo, 0, 0, canvas.width, canvas.height);
                     cloneLogo.src = canvas.toDataURL('image/png', 1.0);
                  } else {
                     await new Promise((resolve) => {
                         originalLogo.onload = resolve;
                         originalLogo.onerror = resolve;
                     });
                     ctx.drawImage(originalLogo, 0, 0, canvas.width, canvas.height);
                     cloneLogo.src = canvas.toDataURL('image/png', 1.0);
                  }
              }
          } catch(e) {
              console.warn("Logo rasterization failed", e);
          }
          cloneLogo.style.width = '512px';
          cloneLogo.style.height = '128px';
          cloneLogo.style.maxWidth = 'none';
      }

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px'; 
      container.style.left = '0';
      container.style.width = '1123px';
      container.style.height = '794px';
      container.style.zIndex = '-9999';
      container.appendChild(clone);
      document.body.appendChild(container);

      const filename = `Certificate - ${user.name} - ${course.title}.pdf`;
      const pdfScale = downloadQuality === 'high' ? 4 : 2;
      
      const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'png', quality: 1.0 }, 
        enableLinks: false,
        html2canvas: { 
            scale: pdfScale,
            useCORS: true, 
            logging: false,
            letterRendering: true,
            allowTaint: true,
            scrollY: 0,
            scrollX: 0,
            width: 1123,
            height: 794,
            windowWidth: 1123,
            windowHeight: 794,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'px', 
            format: [1123, 794], 
            orientation: 'landscape', 
            compress: true,
            hotfixes: ['px_scaling'] 
        }
      };

      try {
          if (window.html2pdf) {
             await new Promise(resolve => setTimeout(resolve, 800));
             await window.html2pdf().set(opt).from(clone).save();
          } else {
              window.print();
          }
      } catch (error) {
          console.error('PDF Generation Error:', error);
          alert('Could not generate PDF directly. Please use the Print button.');
      } finally {
          document.body.removeChild(container);
          setIsGenerating(false);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>, targetId?: string) => {
      setUploadError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
          setUploadError('Invalid format. Use JPG, PNG, or SVG.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      if (file.size > 2 * 1024 * 1024) {
          setUploadError('Image too large. Max 2MB.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      if (targetId) setUploadTargetId(targetId);
      else setUploadTargetId(null);

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          setOriginalImage(result);
          setPendingImage(result);
          setIsCroppedPreview(false);
          setShowCropModal(true);
      };
      reader.onerror = () => { setUploadError('Error reading file.'); };
      reader.readAsDataURL(file);
  };

  const handleRemoveSignature = (e: React.MouseEvent, targetId?: string) => {
      e.stopPropagation();
      setUploadError(null);
      if (onUpdateCourse) {
           const idToUpdate = targetId || course.id;
           const courseToUpdate = allCourses ? allCourses.find(c => c.id === idToUpdate) : course;
           if (courseToUpdate) {
               onUpdateCourse({ ...courseToUpdate, signatureImage: undefined });
           }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const displayWidth = img.width;
      const displayHeight = img.height;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      setImgDimensions({
          width: displayWidth,
          height: displayHeight,
          naturalWidth,
          naturalHeight
      });

      // Init crop box centered with max possible size maintaining aspect ratio
      let boxWidth = displayWidth * 0.8;
      let boxHeight = boxWidth / SIGNATURE_ASPECT_RATIO;

      if (boxHeight > displayHeight * 0.8) {
          boxHeight = displayHeight * 0.8;
          boxWidth = boxHeight * SIGNATURE_ASPECT_RATIO;
      }

      setCropBox({
          x: (displayWidth - boxWidth) / 2,
          y: (displayHeight - boxHeight) / 2,
          width: boxWidth,
          height: boxHeight
      });
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, mode: 'move' | 'resize') => {
      e.preventDefault();
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      setInteractionMode(mode);
      setDragStart({ x: clientX, y: clientY });
      setInitialBox(cropBox);
  };

  const generateCroppedImage = () => {
      if (!imgRef.current) return null;

      const scaleX = imgDimensions.naturalWidth / imgDimensions.width;
      const scaleY = imgDimensions.naturalHeight / imgDimensions.height;

      const canvas = document.createElement('canvas');
      // High resolution output (3x standard)
      canvas.width = 512 * 3; 
      canvas.height = 224 * 3;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
              imgRef.current,
              cropBox.x * scaleX,
              cropBox.y * scaleY,
              cropBox.width * scaleX,
              cropBox.height * scaleY,
              0, 0, canvas.width, canvas.height
          );

          // Automatic Background Removal
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              
              if (luminance > 230) {
                  data[i + 3] = 0; 
              } else if (luminance > 200) {
                  const alpha = 255 * (1 - (luminance - 200) / 30);
                  if (alpha < data[i + 3]) {
                      data[i + 3] = alpha;
                  }
              }
          }
          ctx.putImageData(imageData, 0, 0);
          return canvas.toDataURL('image/png');
      }
      return null;
  };

  const handleApplyCrop = () => {
      const dataUrl = generateCroppedImage();
      if (dataUrl) {
          setPendingImage(dataUrl);
          setIsCroppedPreview(true);
      }
  };

  const handleResetCrop = () => {
      setPendingImage(originalImage);
      setIsCroppedPreview(false);
  };

  const handleCloseCrop = () => {
      setShowCropModal(false); 
      setPendingImage(null);
      setOriginalImage(null);
      setIsCroppedPreview(false);
  };

  const handleCropSave = () => {
      if (!onUpdateCourse) return;
      let finalImage = pendingImage;
      if (!isCroppedPreview) {
          finalImage = generateCroppedImage();
      }
      if (finalImage) {
          const idToUpdate = uploadTargetId || course.id;
          const courseToUpdate = allCourses ? allCourses.find(c => c.id === idToUpdate) : course;
          if (courseToUpdate) {
               onUpdateCourse({ ...courseToUpdate, signatureImage: finalImage });
          }
          handleCloseCrop();
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const getTheme = () => {
      switch (template) {
          case 'modern':
              return {
                  bg: "bg-white",
                  primary: "text-slate-900",
                  secondary: "text-slate-500",
                  accent: "text-indigo-600",
                  accentBorder: "border-indigo-600",
                  accentBg: "bg-indigo-600",
                  fontHead: "font-sans",
                  fontBody: "font-sans",
                  sealGradient: "from-indigo-400 via-indigo-600 to-indigo-900",
                  sealInner: "from-indigo-500 to-indigo-700",
                  sealBorder: "border-indigo-100",
                  accentColor: "#4f46e5"
              };
          case 'elegant':
              return {
                  bg: "bg-stone-50",
                  primary: "text-emerald-950",
                  secondary: "text-stone-600",
                  accent: "text-emerald-800",
                  accentBorder: "border-emerald-800",
                  accentBg: "bg-emerald-800",
                  fontHead: "font-serif",
                  fontBody: "font-sans",
                  sealGradient: "from-emerald-400 via-emerald-600 to-emerald-900",
                  sealInner: "from-emerald-500 to-emerald-800",
                  sealBorder: "border-emerald-50",
                  accentColor: "#065f46"
              };
          case 'classic':
          default:
              return {
                  bg: "bg-[#FAFAFA]", // Slightly warmer white
                  primary: "text-gray-900",
                  secondary: "text-gray-600",
                  accent: "text-[#B49126]",
                  accentBorder: "border-[#B49126]",
                  accentBg: "bg-[#B49126]",
                  fontHead: "font-serif",
                  fontBody: "font-serif",
                  sealGradient: "from-[#FCD34D] via-[#B45309] to-[#78350F]",
                  sealInner: "from-[#F59E0B] to-[#D97706]",
                  sealBorder: "border-[#FEF3C7]",
                  accentColor: "#B49126"
              };
      }
  };

  const theme = getTheme();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center py-8 px-4 relative overflow-y-auto">
       <button 
         onClick={onClose}
         className="absolute top-6 right-6 z-50 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur-sm no-print"
       >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
       </button>

       <div className="w-full max-w-7xl flex flex-col items-center gap-8 z-10">
           
           <div className="text-center text-white space-y-2 mt-8 sm:mt-0 no-print">
               <h1 className="text-3xl font-bold">Training Program Completion Certificate</h1>
               <p className="text-indigo-200">Review and download your official credential.</p>
           </div>

           <div className="flex gap-4 p-1 bg-white/10 rounded-xl backdrop-blur-md no-print flex-wrap justify-center items-center">
               {(['classic', 'modern', 'elegant'] as TemplateType[]).map((t) => (
                   <button
                        key={t}
                        onClick={() => setTemplate(t)}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            template === t 
                                ? 'bg-indigo-600 text-white shadow-lg' 
                                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                        }`}
                   >
                       {t.charAt(0).toUpperCase() + t.slice(1)}
                   </button>
               ))}
               
               {isAdmin && allCourses && (
                   <div className="ml-4 pl-4 border-l border-white/20">
                       <button
                           onClick={() => setShowSignatureManager(true)}
                           className="px-6 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                       >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                           Manage All Signatures
                       </button>
                   </div>
               )}
           </div>

           <div 
             ref={containerRef} 
             className="w-full flex justify-center items-center overflow-hidden relative"
             style={{ height: `${794 * scale}px`, minHeight: '300px' }}
           >
               <div 
                 style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    width: '1123px',
                    height: '794px',
                    position: 'absolute' 
                 }}
               >
                   <div 
                      ref={certificateRef}
                      className={`w-[1123px] h-[794px] ${theme.bg} relative flex flex-col text-gray-900 overflow-hidden shadow-2xl transition-colors duration-500 certificate-print-target`}
                   >
                      <div 
                          className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply opacity-[0.12]" 
                          style={{ backgroundImage: `url("${noiseTexture}")`, backgroundRepeat: 'repeat' }}
                      ></div>
                      
                      <div 
                        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-center bg-no-repeat"
                        style={{ 
                            backgroundImage: `url("${
                                template === 'modern' ? modernWatermark : 
                                template === 'elegant' ? elegantWatermark : 
                                classicWatermark
                            }")`,
                            backgroundSize: '65%'
                        }}
                      ></div>

                      {/* --- CLASSIC TEMPLATE DECORATION --- */}
                      {template === 'classic' && (
                          <>
                            {/* Detailed Gold Frame */}
                            <div className="absolute inset-8 border-[6px] border-[#B49126] z-10 pointer-events-none" style={{ borderStyle: 'double' }}></div>
                            <div className="absolute inset-10 border border-[#B49126] opacity-30 z-10 pointer-events-none"></div>
                            
                            {/* Inner Decorative Box */}
                            <div className="absolute top-16 bottom-16 left-16 right-16 border border-[#B49126] opacity-20 z-10 pointer-events-none"></div>

                            {/* Ornate Corner Elements (SVG) */}
                            {/* Use explicit positioning divs for consistent export */}
                            {[
                                { top: 32, left: 32, rot: 0 },
                                { top: 32, right: 32, rot: 90 },
                                { bottom: 32, right: 32, rot: 180 },
                                { bottom: 32, left: 32, rot: 270 }
                            ].map((pos, i) => (
                                <div 
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        top: pos.top !== undefined ? pos.top : 'auto',
                                        bottom: pos.bottom !== undefined ? pos.bottom : 'auto',
                                        left: pos.left !== undefined ? pos.left : 'auto',
                                        right: pos.right !== undefined ? pos.right : 'auto',
                                        width: '80px',
                                        height: '80px',
                                        transform: `rotate(${pos.rot}deg)`,
                                        zIndex: 20,
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5,5 L50,5 L50,15 L15,15 L15,50 L5,50 Z" fill={theme.accentColor} />
                                        <path d="M20,20 L60,20 L60,22 L22,22 L22,60 L20,60 Z" fill={theme.accentColor} opacity="0.6" />
                                        <path d="M50,5 L50,10 C 65,10 75,20 75,35 L75,35" stroke={theme.accentColor} strokeWidth="2" fill="none" />
                                        <path d="M5,50 L10,50 C 10,65 20,75 35,75 L35,75" stroke={theme.accentColor} strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            ))}
                          </>
                      )}

                      {/* --- MODERN TEMPLATE DECORATION --- */}
                      {template === 'modern' && (
                          <>
                             {/* Top Accent Bar */}
                             <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 z-10"></div>
                             
                             {/* Bottom Accent Bar */}
                             <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 z-10"></div>

                             {/* Tech Background Pattern */}
                             <div 
                                className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                                style={{ backgroundImage: `url("${dotPattern}")` }}
                             ></div>

                             {/* Sidebar Accent */}
                             <div className="absolute left-0 top-12 bottom-12 w-2 bg-indigo-50 z-10"></div>
                             <div className="absolute left-2 top-20 bottom-20 w-1 bg-indigo-100 z-10"></div>
                             
                             {/* Corner Accents */}
                             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 to-transparent pointer-events-none"></div>
                             <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-50 to-transparent pointer-events-none"></div>
                          </>
                      )}

                      {/* --- ELEGANT TEMPLATE DECORATION --- */}
                      {template === 'elegant' && (
                          <div className={`absolute inset-10 border-4 border-double ${theme.accentBorder} z-10 pointer-events-none rounded-lg`}></div>
                      )}

                      {/* --- MAIN CONTENT --- */}
                      <div className="relative z-20 flex-1 flex flex-col py-12 px-24 h-full">
                         <div className="flex flex-col items-center justify-center pt-8 pb-4">
                             <img 
                                src={logoUrl} 
                                alt="Deepmetrics Analytics Institute" 
                                width="512"
                                height="128"
                                className="h-32 w-auto mx-auto drop-shadow-sm mb-6 object-contain"
                                draggable={false}
                                crossOrigin="anonymous"
                             />
                             <p className={`text-sm uppercase tracking-[0.4em] ${theme.secondary} font-semibold`}>Excellence in Data Analytics</p>
                         </div>

                         <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                             <h2 className={`${theme.fontHead} text-2xl ${theme.secondary} italic`}>This is to certify that</h2>
                             
                             <h1 className={`${theme.fontHead} text-6xl font-bold ${theme.primary} tracking-tight leading-tight px-12 py-4 border-b border-current/20`}>
                                 {user.name}
                             </h1>

                             <h2 className={`${theme.fontHead} text-2xl ${theme.secondary} italic mt-4`}>has successfully completed the training program</h2>
                             
                             <h3 className={`${theme.fontBody} text-4xl font-bold ${theme.primary} mt-2 max-w-4xl leading-tight uppercase tracking-wide`}>
                                 {course.title}
                             </h3>

                             <p className={`text-lg ${theme.secondary} max-w-2xl mx-auto mt-4 leading-relaxed`}>
                                 Demonstrating proficiency in data analytics methodologies and successful completion of all required projects and assessments.
                             </p>
                         </div>

                         <div className="mt-auto grid grid-cols-3 gap-12 items-end pb-8">
                             <div className="flex flex-col items-center relative">
                                 <div 
                                    className={`h-28 flex flex-col justify-end items-center mb-2 w-64 relative ${isAdmin && onUpdateCourse ? 'cursor-pointer group' : ''}`}
                                    onClick={() => isAdmin && onUpdateCourse && fileInputRef.current?.click()}
                                    title={isAdmin ? "Click to upload signature" : undefined}
                                 >
                                    {isAdmin && onUpdateCourse && (
                                        <>
                                            <div className="absolute inset-0 bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-50 no-print">
                                                <div className="bg-black/75 text-white text-[10px] px-2 py-1 rounded">
                                                    {course.signatureImage ? 'Change Signature' : 'Upload Signature'}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef}
                                                    className="hidden" 
                                                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                                    onChange={(e) => handleSignatureUpload(e)}
                                                />
                                            </div>
                                            {course.signatureImage && (
                                                <button
                                                    onClick={(e) => handleRemoveSignature(e)}
                                                    className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-[60] hover:bg-red-600 shadow-sm transform scale-75 hover:scale-100 no-print"
                                                    title="Remove Signature"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {course.signatureImage ? (
                                        <img 
                                            src={course.signatureImage} 
                                            alt="Instructor Signature" 
                                            className="max-h-full max-w-full object-contain select-none mix-blend-multiply pb-2" 
                                            draggable={false}
                                        />
                                    ) : (
                                        <span className={`font-signature text-5xl ${theme.accent} text-center leading-none drop-shadow-sm pb-2`}>
                                            {course.instructor}
                                        </span>
                                    )}
                                     <div className={`w-full border-t-2 ${theme.accentBorder}`}></div>
                                 </div>
                                 
                                 {uploadError && (
                                     <div className="absolute -top-12 bg-red-100 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-red-200 z-[70] animate-bounce whitespace-nowrap flex items-center gap-2 no-print">
                                         <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                         {uploadError}
                                     </div>
                                 )}

                                 <p className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mt-2`}>Instructor</p>
                                 <p className={`text-sm font-semibold ${theme.primary}`}>{course.instructor}</p>
                             </div>

                             <div className="flex flex-col items-center -mb-6">
                                 <div className={`w-36 h-36 rounded-full bg-gradient-to-br ${theme.sealGradient} p-1 shadow-xl flex items-center justify-center relative`}>
                                     <div className={`absolute -bottom-4 w-12 h-12 rotate-45 bg-gradient-to-br ${theme.sealGradient} -z-10`}></div>
                                     <div className={`w-full h-full rounded-full border-[3px] border-dashed ${theme.sealBorder} flex items-center justify-center`}>
                                        <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${theme.sealInner} flex items-center justify-center flex-col shadow-inner`}>
                                            <div className="text-white text-[8px] tracking-widest uppercase font-bold opacity-90 mb-1">Official Seal</div>
                                            <span className="text-white font-serif font-bold text-4xl">D</span>
                                            <div className="text-white text-[8px] tracking-widest uppercase font-bold opacity-90 mt-1">2027</div>
                                        </div>
                                     </div>
                                 </div>
                             </div>

                             <div className="flex flex-col items-center">
                                 <div className="h-28 flex flex-col justify-end items-center mb-2 w-64">
                                     <span className={`font-sans text-xl ${theme.primary} pb-2 font-medium`}>
                                         {today}
                                     </span>
                                     <div className={`w-full border-t-2 ${theme.accentBorder}`}></div>
                                 </div>
                                 <p className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mt-2`}>Date Issued</p>
                                 <p className={`text-sm font-semibold ${theme.primary}`}>Accra, Ghana</p>
                             </div>
                         </div>
                         
                         <div className="w-full text-center mt-4 certificate-id-container">
                             <p className={`text-[10px] tracking-widest uppercase opacity-60 ${theme.secondary} flex items-center justify-center`}>
                                 Certificate ID: <span className="font-mono font-bold text-sm tracking-widest ml-2 px-3 py-1 border border-current/20 rounded bg-white/30 shadow-sm">{certificateId}</span>
                             </p>
                         </div>
                      </div>
                   </div>
               </div>
           </div>

           <div className="flex gap-4 items-center no-print flex-wrap justify-center">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="text-white border-white hover:bg-white/10"
              >
                  Close Preview
              </Button>
               
               <div className="bg-white/10 backdrop-blur-md rounded-lg p-1 flex items-center gap-2 border border-white/10">
                   <select 
                       value={downloadQuality} 
                       onChange={(e) => setDownloadQuality(e.target.value as 'standard' | 'high')}
                       className="bg-transparent text-white text-xs font-medium focus:outline-none focus:ring-0 border-none px-2 py-1 cursor-pointer [&>option]:text-gray-900"
                       title="Select PDF Quality"
                   >
                       <option value="standard">Standard Quality (Screen)</option>
                       <option value="high">Print Quality (High DPI)</option>
                   </select>
               </div>

               <Button 
                variant="outline" 
                onClick={handlePrint} 
                className="text-white border-white hover:bg-white/10"
                title="Use browser print for high-quality text"
              >
                 <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 Print
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={isGenerating}
                className="bg-[#B49126] hover:bg-[#92751e] text-white shadow-lg border-none ring-0"
              >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
           </div>
           
           {isAdmin && (
             <div className="w-full max-w-2xl p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 no-print">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-white font-bold text-lg flex items-center gap-2">
                         <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                         Admin: Instructor Signature
                     </h3>
                     <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">Course ID: {course.id}</span>
                 </div>

                 <div className="flex items-center gap-6">
                     <div className="h-24 w-48 bg-white/5 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden relative group">
                         {course.signatureImage ? (
                             <>
                                 <img src={course.signatureImage} className="max-h-full max-w-full object-contain p-2" alt="Signature" />
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <span className="text-xs text-white font-medium">Current</span>
                                 </div>
                             </>
                         ) : (
                             <span className="text-xs text-gray-500">No Signature</span>
                         )}
                     </div>

                     <div className="flex flex-col gap-3 flex-1">
                         <div className="text-sm text-gray-300">
                             <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Instructor Name</span>
                             {course.instructor}
                         </div>
                         
                         <div className="flex gap-3 mt-auto">
                              <Button 
                                  size="sm" 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="flex-1"
                              >
                                  {course.signatureImage ? 'Replace Signature' : 'Upload Signature'}
                              </Button>
                              {course.signatureImage && (
                                  <Button 
                                      size="sm" 
                                      variant="danger" 
                                      onClick={(e) => handleRemoveSignature(e)}
                                      title="Remove Signature"
                                  >
                                      Remove
                                  </Button>
                              )}
                         </div>
                     </div>
                 </div>
                 <p className="mt-4 text-xs text-gray-500">
                     This signature will be applied to all certificates generated for <strong>{course.title}</strong>. 
                     Ensure the image is a PNG with a transparent background for best results.
                 </p>
             </div>
           )}
       </div>

       {showSignatureManager && allCourses && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
               <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col">
                   <div className="bg-indigo-900 px-6 py-4 border-b border-indigo-800 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-indigo-800 rounded-lg">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                           </div>
                           <div>
                               <h3 className="text-lg font-bold text-white">Signature Manager</h3>
                               <p className="text-indigo-300 text-xs">Manage instructor signatures for all {allCourses.length} training programs</p>
                           </div>
                       </div>
                       <button onClick={() => setShowSignatureManager(false)} className="text-indigo-300 hover:text-white p-2 rounded-full hover:bg-indigo-800 transition-colors">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                   
                   <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
                       <div className="grid grid-cols-1 gap-4">
                           {allCourses.map((c) => (
                               <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-6 hover:shadow-md transition-shadow">
                                   <div className="flex-1 text-center sm:text-left">
                                       <h4 className="text-md font-bold text-gray-900">{c.title}</h4>
                                       <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                           <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">{c.id}</span>
                                           <span className="text-sm text-gray-500">Instructor: <span className="text-gray-900 font-medium">{c.instructor}</span></span>
                                       </div>
                                   </div>
                                   
                                   <div className="h-16 w-32 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                                       {c.signatureImage ? (
                                           <img src={c.signatureImage} alt="Sig" className="max-h-full max-w-full object-contain p-1 mix-blend-multiply" />
                                       ) : (
                                           <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">No Sig</span>
                                       )}
                                   </div>
                                   
                                   <div className="flex gap-2">
                                       <button 
                                            onClick={() => {
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                    setUploadTargetId(c.id);
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                       >
                                           {c.signatureImage ? 'Replace' : 'Upload'}
                                       </button>
                                       {c.signatureImage && (
                                            <button 
                                                onClick={(e) => handleRemoveSignature(e, c.id)}
                                                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                            >
                                                Remove
                                            </button>
                                       )}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
                   
                   <div className="bg-white p-4 border-t border-gray-200 flex justify-end">
                       <Button variant="outline" onClick={() => setShowSignatureManager(false)}>Close Manager</Button>
                   </div>
                   
                   <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={(e) => handleSignatureUpload(e, uploadTargetId || undefined)}
                    />
               </div>
           </div>
       )}

       {showCropModal && pendingImage && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
               <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl w-full flex flex-col max-h-[90vh]">
                   <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                       <h3 className="text-lg font-bold text-gray-800">{isCroppedPreview ? 'Preview Signature' : 'Adjust Signature'}</h3>
                       <button onClick={handleCloseCrop} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                   
                   <div className="p-8 flex flex-col items-center gap-6 overflow-y-auto flex-1">
                       {!isCroppedPreview && (
                            <p className="text-sm text-gray-500 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                                    Drag box to position • Drag corner to resize
                            </p>
                       )}
                       
                       <div className="relative inline-block overflow-hidden select-none touch-none">
                           <img 
                                ref={imgRef} 
                                src={pendingImage} 
                                onLoad={handleImageLoad} 
                                className="max-w-full max-h-[60vh] block pointer-events-none select-none" 
                                alt="Crop Source"
                                draggable={false}
                           />
                           
                           {!isCroppedPreview && (
                               <div 
                                  className="absolute border-2 border-dashed border-indigo-400 cursor-move"
                                  style={{
                                     left: cropBox.x,
                                     top: cropBox.y,
                                     width: cropBox.width,
                                     height: cropBox.height,
                                     boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                                  }}
                                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                                  onTouchStart={(e) => handleMouseDown(e, 'move')}
                               >
                                  <div 
                                    className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-500 cursor-se-resize flex items-center justify-center z-10 hover:bg-indigo-600 transition-colors shadow-sm"
                                    onMouseDown={(e) => handleMouseDown(e, 'resize')}
                                    onTouchStart={(e) => handleMouseDown(e, 'resize')}
                                  >
                                     <svg className="w-3 h-3 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                  </div>
                               </div>
                           )}
                       </div>

                       <div className="flex gap-3 w-full justify-end pt-4 border-t border-gray-100 mt-auto">
                           <Button variant="outline" onClick={handleCloseCrop}>
                               Cancel
                           </Button>
                           
                           {isCroppedPreview ? (
                               <Button variant="outline" onClick={handleResetCrop} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                   <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                                   Edit Crop
                               </Button>
                           ) : (
                               <Button variant="secondary" onClick={handleApplyCrop}>
                                   Crop to Selection
                               </Button>
                           )}
                           
                           <Button onClick={handleCropSave} className="px-8">
                               Save Signature
                           </Button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};