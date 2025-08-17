import { createDirectus, rest, readItems } from '@directus/sdk';

const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!).with(rest());

export default directus;

// ブロック一覧を取得する関数
export const getBlocks = () => {
  return directus.request(
    readItems('blocks', {
      fields: ['slug', 'name', 'color', 'text_color', 'section_1_title', 'section_1_description', 'section_2_title', 'section_2_description'],
      sort: ['slug'], // slugで並び替え
    }),
    { cache: 'no-store' } // キャッシュを無効化
  );
};

// slugを元に単一のブロックを取得する関数
export const getBlockBySlug = async (slug: string) => {
  const items = await directus.request(
    readItems('blocks', {
      filter: { slug: { _eq: slug } },
      fields: [
        'slug',
        'name',
        'color',
        'text_color',
        'section_1_title',
        'section_1_description',
        'section_2_title',
        'section_2_description',
      ],
      limit: 1,
    })
  );
  return items[0];
};


export const fetchEmergencyMessage = async () => {
   try {
     const response = await directus.request(
       readItems('emergency', {
         fields: ['message', 'display'],
         limit: 1,
       })
     );
     if (response && response.length > 0 && response[0].display) {
       return response[0].message;
     }
     return null;
   } catch (error) {
     console.error('Error fetching emergency message:', error);
     return null;
   }
};

// --- Announcements ---

// Get all announcements with a specific status
export const getAnnouncements = (status: 'published' | 'archived') => {
  return directus.request(
    readItems('announcements', {
      filter: { status: { _eq: status } },
      fields: ['title', 'body', 'date_created', 'date_updated'],
      sort: ['-date_created'],
    })
  );
};

// Get the latest announcement to be shown in the header
export const getHeaderAnnouncement = async () => {
  const response = await directus.request(
    readItems('announcements', {
      filter: { 
        show_in_header: { _eq: true },
        status: { _eq: 'published' }
      },
      fields: ['title'],
      sort: ['-date_created'],
      limit: 1,
    })
  );
  return response && response.length > 0 ? response[0] : null;
};
