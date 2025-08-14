import { createDirectus, rest, readItems } from '@directus/sdk';

const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!).with(rest());

export default directus;

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