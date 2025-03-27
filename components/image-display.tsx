"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Maximize2, X, Search } from "lucide-react"
import { SimilarProductsModal } from "./similar-products-modal"

interface SimilarProduct {
  link: string
  source: string
  thumbnail: string
  title: string
  price?: string
  inStock?: boolean
  image?: string
}

interface ImageDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string
  alt: string
  caption?: string
  aspectRatio?: "square" | "video" | "wide" | "auto"
  width?: number
  height?: number
  blurDataURL?: string
  className?: string
  priority?: boolean
  fallbackSrc?: string
  zoomable?: boolean
  showSimilarProducts?: boolean
}

/**
 * A modern image display component with hover effects and zoom functionality
 */
export function ImageDisplay({
  src,
  alt,
  caption,
  aspectRatio = "auto",
  width,
  height,
  blurDataURL,
  className,
  priority = false,
  fallbackSrc,
  zoomable = true,
  showSimilarProducts = true,
  ...props
}: ImageDisplayProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Similar products state
  const [isSimilarProductsModalOpen, setIsSimilarProductsModalOpen] = useState(false)
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [isLoadingSimilarProducts, setIsLoadingSimilarProducts] = useState(false)
  const [similarProductsError, setSimilarProductsError] = useState<string | null>(null)

  // Detect if on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Calculate aspect ratio class
  const aspectRatioClass = 
    aspectRatio === "square" ? "aspect-square" :
    aspectRatio === "video" ? "aspect-video" :
    aspectRatio === "wide" ? "aspect-[21/9]" :
    ""; // auto

  // Handle zoom toggle
  const toggleZoom = () => {
    if (zoomable) {
      setIsZoomed(!isZoomed)
    }
  }

  // Handle click on the modal background (to close)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false)
    }
  }
  
  // Find similar products
  const findSimilarProducts = async () => {
    if (!src) return;
    
    setIsSimilarProductsModalOpen(true)
    setIsLoadingSimilarProducts(true)
    setSimilarProductsError(null)
    
    try {
      // Check if the src is a base64 encoded image
      const isBase64Image = src.startsWith('data:image');
      
      // For very large base64 strings, handle potential size issues
      if (isBase64Image && src.length > 1000000) { // Over ~1MB
        console.log(`Processing large image (${Math.round(src.length/1024/1024*100)/100}MB)...`);
      }
      
      // Prepare the request body based on image type
      const requestBody = isBase64Image 
        ? { imageBase64: src } 
        : { imageUrl: src };
      
      // Use a longer timeout for large images
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch('/api/search/similar-products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to find similar products');
        }
        
        const data = await response.json();
        setSimilarProducts(data.similarProducts || []);
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. The image may be too large to process.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error finding similar products:', error);
      setSimilarProductsError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoadingSimilarProducts(false);
    }
  };

  return (
    <div 
      className={cn("relative group", className)} 
      {...props}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main image container */}
      <div 
        className={cn(
          "relative overflow-hidden rounded-lg transition-all duration-300",
          aspectRatioClass,
          isLoaded ? "shadow-lg" : "",
          isHovered && !isZoomed && !isMobile ? "shadow-xl scale-[1.02] ring-2 ring-blue-500/20" : ""
        )}
        onClick={isMobile && zoomable ? toggleZoom : undefined}
      >
        {/* Image wrapper with fallback support */}
        <div className={cn(
          "w-full h-full bg-gray-100 dark:bg-gray-800", 
          !isLoaded ? "animate-pulse" : ""
        )}>
          <Image
            src={hasError && fallbackSrc ? fallbackSrc : src}
            alt={alt}
            width={width || 1200}
            height={height || 800}
            placeholder={blurDataURL ? "blur" : "empty"}
            blurDataURL={blurDataURL}
            priority={priority}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        </div>

        {/* Hover controls - show only on desktop */}
        {isHovered && isLoaded && !isMobile && (
          <motion.div 
            className="absolute top-2 right-2 z-10 flex gap-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {showSimilarProducts && (
              <button
                className="flex items-center justify-center rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  findSimilarProducts();
                }}
                aria-label="Find similar products with Google Lens"
                title="Find similar products with Google Lens"
              >
                <Search size={16} />
              </button>
            )}
            
            {zoomable && (
              <button
                className="flex items-center justify-center rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
                onClick={toggleZoom}
                aria-label="Zoom image"
                title="Zoom image"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </motion.div>
        )}

        {/* Mobile controls */}
        {isLoaded && isMobile && (
          <div className="absolute bottom-2 right-2 flex flex-row-reverse gap-2">
            {showSimilarProducts && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  findSimilarProducts();
                }}
                className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"
              >
                <Search size={12} />
                <span>Similar</span>
              </button>
            )}
            
            {zoomable && (
              <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                Tap to zoom
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption (if provided) */}
      {caption && (
        <motion.p 
          className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {caption}
        </motion.p>
      )}

      {/* Zoomed view modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-10 overscroll-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="relative max-w-screen-xl max-h-[90vh] overflow-auto"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <Image
                src={src}
                alt={alt}
                width={width || 1920}
                height={height || 1080}
                className="object-contain"
                priority
              />
              
              {/* Controls in zoom view */}
              <div className="absolute top-4 right-4 flex gap-2">
                {showSimilarProducts && (
                  <button
                    className="bg-black/70 rounded-full p-2 text-white hover:bg-black/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsZoomed(false);
                      findSimilarProducts();
                    }}
                    aria-label="Find similar products with Google Lens"
                  >
                    <Search size={24} />
                  </button>
                )}
                
                <button
                  className="bg-black/70 rounded-full p-2 text-white hover:bg-black/90 transition-colors"
                  onClick={() => setIsZoomed(false)}
                  aria-label="Close zoom view"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Caption in zoom view */}
              {caption && (
                <p className="absolute bottom-4 left-4 right-4 text-center text-white bg-black/60 p-2 rounded text-sm">
                  {caption}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Similar Products Modal */}
      <AnimatePresence>
        {isSimilarProductsModalOpen && (
          <SimilarProductsModal
            isOpen={isSimilarProductsModalOpen}
            onClose={() => setIsSimilarProductsModalOpen(false)}
            products={similarProducts}
            isLoading={isLoadingSimilarProducts}
            error={similarProductsError}
          />
        )}
      </AnimatePresence>
    </div>
  )
} 