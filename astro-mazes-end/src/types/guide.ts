import type { ContentBlock } from './strapi';

// Base component interface
interface BaseComponent {
  id: number;
  __component: string;
}

// Component types
export interface TextSection extends BaseComponent {
  __component: 'guides.text-section';
  content: ContentBlock[];
}

export interface ImageSection extends BaseComponent {
  __component: 'guides.image-section';
  image: {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
  };
  caption?: string;
  alignment: 'left' | 'center' | 'right' | 'full';
  altText?: string;
}

export interface GallerySection extends BaseComponent {
  __component: 'guides.gallery-section';
  images: Array<{
    url: string;
    alternativeText?: string;
  }>;
  layout: 'grid' | 'carousel' | 'masonry';
  columns?: number;
}

export interface CalloutBox extends BaseComponent {
  __component: 'guides.callout-box';
  type: 'info' | 'warning' | 'tip' | 'important';
  title?: string;
  content: ContentBlock[];
  icon?: string;
}

export interface CodeBlock extends BaseComponent {
  __component: 'guides.code-block';
  language?: string;
  code: string;
  filename?: string;
  highlights?: string;
}

export interface Step {
  id: number;
  stepNumber: number;
  title: string;
  content: ContentBlock[];
  image?: {
    url: string;
    alternativeText?: string;
  };
}

export interface StepByStep extends BaseComponent {
  __component: 'guides.step-by-step';
  steps: Step[];
}

export interface CardItem {
  id: number;
  cardName: string;
  cardImage?: {
    url: string;
    alternativeText?: string;
  };
  description?: string;
  quantity?: number;
}

export interface CardShowcase extends BaseComponent {
  __component: 'guides.card-showcase';
  cards: CardItem[];
}

export interface Table extends BaseComponent {
  __component: 'guides.table';
  headers: string[];
  rows: (string | number | boolean)[][];
  caption?: string;
}

export interface VideoEmbed extends BaseComponent {
  __component: 'guides.video-embed';
  videoUrl: string;
  title?: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
}

export interface ComparisonItem {
  id: number;
  name: string;
  image?: {
    url: string;
    alternativeText?: string;
  };
  pros: string[];
  cons: string[];
}

export interface Comparison extends BaseComponent {
  __component: 'guides.comparison';
  items: ComparisonItem[];
}

// Union type for all section components
export type GuideSection = 
  | TextSection 
  | ImageSection 
  | GallerySection 
  | CalloutBox 
  | CodeBlock 
  | StepByStep 
  | CardShowcase 
  | Table 
  | VideoEmbed 
  | Comparison;

// Main Guide type
export interface Guide {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: {
    url: string;
    alternativeText?: string;
  };
  category?: 'Beginner' | 'Advanced' | 'Strategy' | 'Deck Building';
  readingTime?: number;
  author?: {
    data: {
      id: number;
      attributes: {
        firstname: string;
        lastname: string;
      };
    };
  };
  sections: GuideSection[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface GuidesResponse {
  data: Guide[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}