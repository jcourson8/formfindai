"use client"

import React, { useState } from "react"
import Image from "next/image"
import { X, ExternalLink, Loader2, CheckCircle, XCircle, Search, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimilarProduct {
  link: string
  source: string
  thumbnail: string
  title: string
  price?: string
  inStock?: boolean
  image?: string
}

// Helper function to create a proxy URL for images that might have CORS issues
function getProxyImageUrl(url: string): string {
  if (!url) {
    return 'https://placehold.co/400x400?text=No+Image';
  }
  
  if (
    url.includes('blob.vercel-storage.com') || 
    url.includes('i.imgur.com') ||
    url.includes('upload.wikimedia.org') ||
    url.includes('media-amazon.com')
  ) {
    return url;
  }
  
  if (url.includes('encrypted-tbn') || url.startsWith('https://serpapi.com/')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=https://placehold.co/400x400?text=No+Image`;
  }
  
  return url;
}

interface SimilarProductsModalProps {
  isOpen: boolean
  onClose: () => void
  products: SimilarProduct[]
  isLoading: boolean
  error: string | null
}

export function SimilarProductsModal({
  isOpen,
  onClose,
  products,
  isLoading,
  error
}: SimilarProductsModalProps) {
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  
  React.useEffect(() => {
    if (products.length > 0) {
      const initialLoadingState = products.reduce((acc, _, index) => {
        acc[index] = true;
        return acc;
      }, {} as Record<number, boolean>);
      
      setLoadingImages(initialLoadingState);
    }
  }, [products]);
  
  const handleImageLoad = (index: number) => {
    setLoadingImages(prev => ({
      ...prev,
      [index]: false
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-background rounded-lg shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center">
            <ShoppingCart size={18} className="mr-2 text-primary" />
            <h2 className="text-base font-medium">Shop Similar Products</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:bg-muted rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content - Scrollable Area */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <p className="text-sm text-muted-foreground">Finding furniture matches based on your design...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <X size={20} className="text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Search size={20} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No matching furniture products found. Try refining your design.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                We found {products.length} real furniture products that match your design
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {products.map((product, index) => (
                  <div
                    key={index}
                    className="flex flex-col rounded border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <div className="relative h-32 bg-muted/50">
                      {product.thumbnail ? (
                        <>
                          {loadingImages[index] && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          )}
                          <Image
                            src={getProxyImageUrl(product.thumbnail)}
                            alt={product.title}
                            fill
                            className="object-contain p-2"
                            unoptimized={product.thumbnail.includes('encrypted-tbn')}
                            referrerPolicy="no-referrer"
                            onLoad={() => handleImageLoad(index)}
                            onError={(e) => {
                              if (product.image && e.currentTarget.src !== product.image) {
                                e.currentTarget.src = getProxyImageUrl(product.image);
                              } else if (product.thumbnail) {
                                e.currentTarget.src = getProxyImageUrl(product.thumbnail);
                              }
                              handleImageLoad(index);
                            }}
                          />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-muted-foreground">No image</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col p-3 space-y-1 flex-1">
                      <h3 className="font-medium line-clamp-2 text-xs">{product.title}</h3>
                      
                      <div className="mt-auto pt-1 space-y-1">
                        {product.price && (
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {product.price}
                          </p>
                        )}
                        
                        {product.inStock !== undefined && (
                          <div className="flex items-center text-xs">
                            {product.inStock ? (
                              <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle size={10} className="mr-1" />
                                In Stock
                              </span>
                            ) : (
                              <span className="flex items-center text-rose-600 dark:text-rose-400">
                                <XCircle size={10} className="mr-1" />
                                Out of Stock
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          {product.source}
                        </p>
                        
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-1 rounded text-xs bg-primary px-2 py-1 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <ShoppingCart size={10} className="mr-1" />
                          Shop Now
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 