// Strapi v5 types
export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

// Content block types for rich text
export interface TextNode {
  type: 'text';
  text: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  children: (TextNode | any)[];
}

export interface ListItemBlock {
  type: 'list-item';
  children: (TextNode | any)[];
}

export interface ListBlock {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: ListItemBlock[];
}

export type ContentBlock = ParagraphBlock | ListBlock;

// Post type matching your actual API response
export interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: ContentBlock[];
  exerpt?: string; // Note: You have a typo in your API, should be "excerpt"
  postedAt?: string;
  author?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface PostsResponse {
  data: Post[];
  meta: StrapiMeta;
}

export interface PostResponse {
  data: Post;
  meta: StrapiMeta;
}