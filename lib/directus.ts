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
        fields: ['message'],
        filter: {
          status: {
            _eq: 'published',
          },
        },
        limit: 1,
      }),
      { cache: 'no-store' } // ★追加: キャッシュを無効化
    );

    console.log('Directus response for emergency message:', response);

    // responseが配列で、要素が1つ以上あることを確認
    if (Array.isArray(response) && response.length > 0) {
      return response[0].message;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching emergency message:', error);
    return null;
  }
};
