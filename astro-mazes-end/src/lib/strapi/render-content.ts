import type { ContentBlock } from '../../types/strapi';

export function renderContent(blocks: ContentBlock[]): string {
  if (!blocks || !Array.isArray(blocks)) {
    console.warn('No content blocks provided');
    return '<p class="text-gray-400">No content available.</p>';
  }
  
  return blocks.map(block => renderBlock(block)).join('\n');
}

function renderBlock(block: any): string {
  if (!block || !block.type) {
    console.warn('Invalid block:', block);
    return '';
  }

  switch (block.type) {
    case 'paragraph':
      const paragraphContent = renderChildren(block.children);
      // Don't render empty paragraphs
      if (!paragraphContent.trim()) return '';
      return `<p class="mb-4 leading-relaxed text-gray-300">${paragraphContent}</p>`;
      
    case 'list':
      const tag = block.format === 'ordered' ? 'ol' : 'ul';
      const items = block.children
        .map((item: any, index: number) => {
          const content = renderChildren(item.children);
          return `<li>${content}</li>`;
        })
        .join('\n');
      
      // Use inline styles to ensure list markers show with proper colors
      if (block.format === 'ordered') {
        return `<ol style="list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; color: #d1d5db;">${items}</ol>`;
      } else {
        return `<ul style="list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; color: #d1d5db;">${items}</ul>`;
      }
      
    case 'heading':
      const level = block.level || 2;
      const headingContent = renderChildren(block.children);
      const headingStyleMap: Record<number, string> = {
        1: 'font-size: 1.875rem; line-height: 2.25rem;', // 3xl
        2: 'font-size: 1.5rem; line-height: 2rem;',      // 2xl
        3: 'font-size: 1.25rem; line-height: 1.75rem;',  // xl
        4: 'font-size: 1.125rem; line-height: 1.75rem;', // lg
        5: 'font-size: 1rem; line-height: 1.5rem;',      // base
        6: 'font-size: 0.875rem; line-height: 1.25rem;'  // sm
      };
      const headingStyles = headingStyleMap[level] || 'font-size: 1.25rem; line-height: 1.75rem;';
      
      return `<h${level} style="${headingStyles} color: white; font-weight: bold; margin-bottom: 1rem; margin-top: 2rem;">${headingContent}</h${level}>`;
      
    case 'quote':
      const quoteContent = renderChildren(block.children);
      return `<blockquote style="border-left: 4px solid #facc15; padding-left: 1rem; font-style: italic; margin: 1.5rem 0; color: #9ca3af;">${quoteContent}</blockquote>`;
      
    case 'code':
      const codeContent = block.children?.[0]?.text || '';
      return `<pre style="background-color: #1f2937; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1.5rem 0;"><code style="color: #d1d5db; font-family: monospace;">${escapeHtml(codeContent)}</code></pre>`;
      
    case 'image':
      const src = block.url || (block.image?.url ? (block.image.url.startsWith('http') ? block.image.url : `http://localhost:1337${block.image.url}`) : '');
      const alt = block.alternativeText || block.caption || '';
      const width = block.width || '';
      const height = block.height || '';
      
      return `<figure style="margin: 1.5rem 0;">
        <img src="${src}" alt="${escapeHtml(alt)}" style="width: 100%; border-radius: 0.5rem;" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''} />
        ${block.caption ? `<figcaption style="text-align: center; font-size: 0.875rem; color: #9ca3af; margin-top: 0.5rem;">${escapeHtml(block.caption)}</figcaption>` : ''}
      </figure>`;
      
    default:
      console.warn(`Unknown block type: ${block.type}`, block);
      // Try to render children if they exist
      if (block.children) {
        return renderChildren(block.children);
      }
      return '';
  }
}

function renderChildren(children: any[]): string {
  if (!children || !Array.isArray(children)) {
    return '';
  }
  
  return children.map(child => {
    if (!child) return '';
    
    if (child.type === 'text') {
      let text = child.text || '';
      
      // DON'T escape HTML if it contains HTML tags (for controlled HTML content)
      const hasHtmlTags = /<[^>]+>/.test(text);
      if (!hasHtmlTags) {
        text = escapeHtml(text);
      }
      
      // Apply text formatting with inline styles for dark mode
      if (child.bold) {
        text = `<strong style="font-weight: bold; color: #fff;">${text}</strong>`;
      }
      if (child.italic) {
        text = `<em style="font-style: italic; color: #e5e7eb;">${text}</em>`;
      }
      if (child.underline) {
        text = `<u style="text-decoration: underline; color: #d1d5db;">${text}</u>`;
      }
      if (child.strikethrough) {
        text = `<s style="text-decoration: line-through; color: #9ca3af;">${text}</s>`;
      }
      if (child.code) {
        text = `<code style="background-color: #1f2937; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; font-family: monospace; color: #fbbf24;">${text}</code>`;
      }
      
      // Preserve line breaks
      text = text.replace(/\n/g, '<br />');
      
      return text;
    }
    
    if (child.type === 'link') {
      const href = child.url || '#';
      const linkContent = renderChildren(child.children);
      const isExternal = href.startsWith('http');
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(href)}" style="color: #facc15; text-decoration: underline;"${target} onmouseover="this.style.textDecoration='none'" onmouseout="this.style.textDecoration='underline'">${linkContent}</a>`;
    }
    
    if (child.type === 'list-item') {
      return renderChildren(child.children);
    }
    
    // Handle nested blocks
    if (child.type && typeof child.type === 'string') {
      return renderBlock(child);
    }
    
    console.warn('Unknown child structure:', child);
    return '';
  }).join('');
}

function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}