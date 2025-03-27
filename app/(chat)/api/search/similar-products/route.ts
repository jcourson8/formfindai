import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

interface GoogleLensResponse {
  visual_matches?: Array<{
    position: number;
    title: string;
    link: string;
    source: string;
    source_icon?: string;
    price?: {
      value: string;
      extracted_value: number;
      currency: string;
    };
    in_stock?: boolean;
    condition?: string;
    thumbnail: string;
    image: string;
  }>;
  related_content?: Array<{
    query: string;
    link: string;
    thumbnail: string;
  }>;
  error?: string;
}

interface RequestBody {
  imageUrl?: string;
  imageBase64?: string;
}

interface SimilarProduct {
  link: string;
  source: string;
  thumbnail: string;
  title: string;
  price?: string;
  inStock?: boolean;
  image?: string;
}

/**
 * Uploads a base64 image to Vercel Blob Storage and returns the URL
 */
async function uploadBase64ToBlob(base64Data: string): Promise<string> {
  try {
    // Extract image MIME type and base64 content
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }
    
    const type = matches[1];
    const base64 = matches[2];
    const extension = type.split('/')[1] || 'png';
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');
    
    // Generate unique filename
    const filename = `${uuidv4()}.${extension}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      contentType: type,
      access: 'public', // Make it publicly accessible
    });
    
    // Return the public URL
    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error('Failed to upload image to storage');
  }
}

export async function POST(req: Request) {
  try {
    // Get the image information from the request body
    const body = await req.json() as RequestBody;
    let imageUrl = body.imageUrl;
    
    // If we have a base64 image instead of a URL, upload it first
    if (!imageUrl && body.imageBase64) {
      imageUrl = await uploadBase64ToBlob(body.imageBase64);
    }
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL or base64 data is required' },
        { status: 400 }
      );
    }
    
    // SERP API key from environment variables
    const apiKey = process.env.SERPAPI_KEY;
    
    if (!apiKey) {
      console.error('SERPAPI_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      );
    }
    
    // Construct the SERP API URL for Google Lens
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.append('engine', 'google_lens');
    serpApiUrl.searchParams.append('url', imageUrl);
    serpApiUrl.searchParams.append('api_key', apiKey);
    
    // Make the request to SERP API
    const response = await fetch(serpApiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SERP API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch similar products' },
        { status: response.status }
      );
    }
    
    const data = await response.json() as GoogleLensResponse;
    
    // Map the Google Lens results to our format
    const similarProducts: SimilarProduct[] = (data.visual_matches || [])
      .filter(match => match.title && match.link && match.thumbnail) // Ensure we have required fields
      .map(match => {
        // Use the larger image instead of thumbnails if available
        // Google's thumbnails sometimes have restrictions
        const thumbnail = match.image || match.thumbnail;
        
        return {
          link: match.link,
          source: match.source,
          thumbnail,
          title: match.title,
          price: match.price?.value,
          inStock: match.in_stock,
          image: match.image
        };
      })
      .slice(0, 8); // Limit to 8 results
    
    return NextResponse.json({ similarProducts });
  } catch (error) {
    console.error('Error in similar products API:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
} 