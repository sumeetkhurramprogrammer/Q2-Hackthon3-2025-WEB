require('dotenv').config();
import { createClient } from '@sanity/client';
import fetch from 'node-fetch'; // Ensure `node-fetch` is installed
import { Buffer } from 'buffer'; // Buffer is a part of Node.js

// Initialize the Sanity client using environment variables
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: true,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-13',
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN,
});

// Interface for the Product
interface Product {
  imageUrl: string;
  title: string;
  price: number;
  tags: string[];
  discountPercentage?: number;
  description: string;
  isNew: boolean;
}

// Function to upload an image to Sanity
async function uploadImageToSanity(imageUrl: string): Promise<string | null> {
  try {
    console.log(`Uploading image: ${imageUrl}`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${imageUrl}`);
    }

    const buffer = await response.arrayBuffer();
    const bufferImage = Buffer.from(buffer);

    const asset = await client.assets.upload('image', bufferImage, {
      filename: imageUrl.split('/').pop() || 'unknown',
    });

    console.log(`Image uploaded successfully: ${asset._id}`);
    return asset._id;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
}

// Function to upload a product to Sanity
async function uploadProduct(product: Product): Promise<void> {
  try {
    const imageId = await uploadImageToSanity(product.imageUrl);

    if (imageId) {
      const document = {
        _type: 'product',
        title: product.title,
        price: product.price,
        productImage: {
          _type: 'image',
          asset: {
            _ref: imageId,
          },
        },
        tags: product.tags,
        discountPercentage: product.discountPercentage,
        description: product.description,
        isNew: product.isNew,
      };

      const createdProduct = await client.create(document);
      console.log(`Product "${product.title}" uploaded successfully:`, createdProduct);
    } else {
      console.log(`Product "${product.title}" skipped due to image upload failure.`);
    }
  } catch (error) {
    console.error('Error uploading product:', error);
  }
}

// Function to import products from an API and upload them to Sanity
async function importProducts(): Promise<void> {
  try {
    console.log('Fetching products from API...');
    const response = await fetch('https://template6-six.vercel.app/api/products');

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const products: Product[] = await response.json() as Product[];

    console.log(`Fetched ${products.length} products. Starting upload...`);

    for (const product of products) {
      await uploadProduct(product);
    }

    console.log('All products have been processed.');
  } catch (error) {
    console.error('Error importing products:', error);
  }
}

// Start the import process
importProducts();
