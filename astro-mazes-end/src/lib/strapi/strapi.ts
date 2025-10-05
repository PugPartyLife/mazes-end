import type { PostsResponse, Post } from '../../types/strapi';
import type { GuidesResponse, Guide } from '../../types/guide';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';

export async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${STRAPI_URL}/api${endpoint}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getAllPosts(): Promise<PostsResponse> {
  return fetchAPI<PostsResponse>('/posts?populate=*&sort=publishedAt:desc');
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const response = await fetchAPI<PostsResponse>(`/posts?filters[slug][$eq]=${slug}&populate=*`);
  return response.data[0] || null;
}

export async function getFeaturedPosts(): Promise<PostsResponse> {
  return fetchAPI<PostsResponse>('/posts?filters[featured][$eq]=true&populate=*&sort=publishedAt:desc');
}

export async function getAllGuides(): Promise<GuidesResponse> {
  return fetchAPI<GuidesResponse>('/guides?populate=*&sort=publishedAt:desc');
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const response = await fetchAPI<GuidesResponse>(
    `/guides?filters[slug][$eq]=${slug}&populate[coverImage][populate]=*&populate[sections][populate]=*`
  );
  return response.data[0] || null;
}

export async function getFeaturedGuides(): Promise<GuidesResponse> {
  return fetchAPI<GuidesResponse>('/guides?filters[featured][$eq]=true&populate=*&sort=publishedAt:desc');
}

export async function getGuidesByCategory(category: string): Promise<GuidesResponse> {
  return fetchAPI<GuidesResponse>(
    `/guides?filters[category][$eq]=${category}&populate=*&sort=publishedAt:desc`
  );
}