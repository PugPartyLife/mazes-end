import type { GuideSection } from '../../types/guide';
import { renderContent } from './render-content';

export function renderGuideSection(section: GuideSection): string {
  switch (section.__component) {
    case 'guides.text-section':
      return `
        <div class="bg-gray-700/50 rounded-lg p-6 shadow-lg">
          <div class="prose prose-invert prose-gray max-w-none 
            prose-headings:text-white prose-headings:font-bold
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-yellow-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-bold
            prose-em:text-gray-200
            prose-ul:text-gray-300 prose-ol:text-gray-300
            prose-li:marker:text-gray-400
            prose-blockquote:text-gray-400 prose-blockquote:border-yellow-400
            prose-code:text-yellow-400 prose-code:bg-gray-800
            prose-pre:bg-gray-800 prose-pre:text-gray-300
            prose-hr:border-gray-600">
            ${renderContent(section.content)}
          </div>
        </div>
      `;

    case 'guides.image-section': {
      // Check if image exists
      if (!section.image || !section.image.url) {
        return `<div class="text-gray-400 text-center p-8 border border-gray-600 rounded">Image not found</div>`;
      }
      
      const imageUrl = section.image.url.startsWith('http') 
        ? section.image.url 
        : `http://localhost:1337${section.image.url}`;
      
      const alignmentClasses: Record<string, string> = {
        left: 'mr-auto',
        center: 'mx-auto',
        right: 'ml-auto',
        full: 'w-full'
      };
      
      const alignmentClass = alignmentClasses[section.alignment] || 'mx-auto';

      return `
        <figure class="${alignmentClass} ${section.alignment === 'full' ? '' : 'max-w-2xl'}">
          <img 
            src="${imageUrl}"
            alt="${escapeHtml(section.altText || section.image.alternativeText || '')}"
            class="rounded-lg shadow-lg w-full"
          />
          ${section.caption ? `<figcaption class="text-center text-sm text-gray-400 mt-2">${escapeHtml(section.caption)}</figcaption>` : ''}
        </figure>
      `;
    }

    case 'guides.gallery-section': {
      const columns = section.columns || 3;
      const gridClasses = [
        'grid gap-4 grid-cols-1',
        columns >= 2 ? 'md:grid-cols-2' : '',
        columns >= 3 ? 'lg:grid-cols-3' : '',
        columns >= 4 ? 'xl:grid-cols-4' : ''
      ].filter(Boolean).join(' ');
      
      return `
        <div class="${gridClasses}">
          ${section.images.map((image, idx) => {
            const galleryImageUrl = image.url.startsWith('http') 
              ? image.url 
              : `http://localhost:1337${image.url}`;
            
            return `
              <img 
                src="${galleryImageUrl}"
                alt="${escapeHtml(image.alternativeText || `Gallery image ${idx + 1}`)}"
                class="rounded-lg shadow-md w-full h-48 object-cover hover:shadow-xl transition-shadow"
              />
            `;
          }).join('')}
        </div>
      `;
    }

    case 'guides.callout-box': {
      type CalloutType = 'info' | 'warning' | 'tip' | 'important';
      
      const iconSvgs: Record<CalloutType, string> = {
        info: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        tip: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>',
        important: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
      };
      
      const colors: Record<CalloutType, string> = {
        info: 'bg-blue-900/50 border-blue-500',
        warning: 'bg-yellow-900/50 border-yellow-500',
        tip: 'bg-green-900/50 border-green-500',
        important: 'bg-red-900/50 border-red-500'
      };

      return `
        <div class="p-6 rounded-lg border-l-4 ${colors[section.type]}">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 mt-0.5">
              ${iconSvgs[section.type]}
            </div>
            <div class="flex-1">
              ${section.title ? `<h4 class="font-bold text-white mb-2">${escapeHtml(section.title)}</h4>` : ''}
              <div class="text-gray-300">${renderContent(section.content)}</div>
            </div>
          </div>
        </div>
      `;
    }

    case 'guides.code-block': {
      return `
        <div class="relative">
          ${section.filename ? `
            <div class="absolute top-0 right-0 bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-tl-lg">
              ${escapeHtml(section.filename)}
            </div>
          ` : ''}
          <pre class="bg-gray-800 p-4 rounded-lg overflow-x-auto"><code class="language-${escapeHtml(section.language || 'text')} text-gray-300">${escapeHtml(section.code)}</code></pre>
        </div>
      `;
    }

    case 'guides.step-by-step': {
      return `
        <div class="space-y-6">
          ${section.steps.map((step) => `
            <div class="flex space-x-4">
              <div class="flex-shrink-0 w-10 h-10 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
                ${step.stepNumber}
              </div>
              <div class="flex-1">
                <h4 class="text-xl font-bold text-white mb-2">${escapeHtml(step.title)}</h4>
                <div class="text-gray-300 mb-4">${renderContent(step.content)}</div>
                ${step.image ? `
                  <img 
                    src="${step.image.url.startsWith('http') ? step.image.url : `http://localhost:1337${step.image.url}`}"
                    alt="${escapeHtml(step.image.alternativeText || '')}"
                    class="rounded-lg shadow-lg max-w-md"
                  />
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    case 'guides.card-showcase': {
      return `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${section.cards.map((card) => `
            <div class="text-center">
              ${card.cardImage ? `
                <img 
                  src="${card.cardImage.url.startsWith('http') ? card.cardImage.url : `http://localhost:1337${card.cardImage.url}`}"
                  alt="${escapeHtml(card.cardName)}"
                  class="rounded-lg shadow-lg mb-2 w-full"
                />
              ` : ''}
              <h5 class="font-bold text-white">${escapeHtml(card.cardName)}</h5>
              ${card.quantity ? `<span class="text-sm text-gray-400">x${card.quantity}</span>` : ''}
              ${card.description ? `<p class="text-sm text-gray-400 mt-1">${escapeHtml(card.description)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    case 'guides.table': {
      return `
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                ${section.headers.map(header => `
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ${escapeHtml(header)}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              ${section.rows.map(row => `
                <tr>
                  ${row.map(cell => `
                    <td class="px-6 py-4 text-sm text-gray-300">${escapeHtml(String(cell))}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${section.caption ? `<p class="text-sm text-gray-400 mt-2 text-center">${escapeHtml(section.caption)}</p>` : ''}
        </div>
      `;
    }

    case 'guides.video-embed': {
      // Extract YouTube video ID
      let videoId = '';
      if (section.videoUrl.includes('youtube.com/watch?v=')) {
        videoId = section.videoUrl.split('v=')[1]?.split('&')[0] || '';
      } else if (section.videoUrl.includes('youtu.be/')) {
        videoId = section.videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      }
      
      const aspectRatioClasses: Record<string, string> = {
        '16:9': 'aspect-video',
        '4:3': 'aspect-4/3',
        '1:1': 'aspect-square'
      };
      
      const aspectRatioClass = aspectRatioClasses[section.aspectRatio] || 'aspect-video';

      return `
        <div>
          ${section.title ? `<h4 class="text-xl font-bold text-white mb-4">${escapeHtml(section.title)}</h4>` : ''}
          <div class="${aspectRatioClass} w-full">
            <iframe 
              src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
              class="w-full h-full rounded-lg"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      `;
    }

    case 'guides.comparison': {
      return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${section.items.map((item) => `
            <div class="bg-gray-800 rounded-lg p-6">
              ${item.image ? `
                <img 
                  src="${item.image.url.startsWith('http') ? item.image.url : `http://localhost:1337${item.image.url}`}"
                  alt="${escapeHtml(item.name)}"
                  class="w-full h-48 object-cover rounded-lg mb-4"
                />
              ` : ''}
              <h4 class="text-xl font-bold text-white mb-4">${escapeHtml(item.name)}</h4>
              
              <div class="space-y-4">
                <div>
                  <h5 class="text-green-400 font-semibold mb-2">Pros</h5>
                  <ul class="list-disc list-inside text-gray-300 space-y-1">
                    ${item.pros.map(pro => `<li>${escapeHtml(pro)}</li>`).join('')}
                  </ul>
                </div>
                
                <div>
                  <h5 class="text-red-400 font-semibold mb-2">Cons</h5>
                  <ul class="list-disc list-inside text-gray-300 space-y-1">
                    ${item.cons.map(con => `<li>${escapeHtml(con)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = section;
      console.warn(`Unknown section type:`, section);
      return '';
    }
  }
}

export function renderGuideSections(sections: GuideSection[]): string {
  if (!sections || sections.length === 0) {
    return '<div class="text-gray-400">No content available.</div>';
  }

  return sections.map(section => `
    <div class="guide-section mb-8">
      ${renderGuideSection(section)}
    </div>
  `).join('');
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
  return text.replace(/[&<>"']/g, m => map[m] || m);
}