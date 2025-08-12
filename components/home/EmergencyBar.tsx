'use client';

import { useState, useEffect } from 'react';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { motion } from 'framer-motion';

interface EmergencyItem {
  content: string;
  status: string;
}

async function getEmergency(): Promise<EmergencyItem | null> {
  try {
    const response = await directus.request(
      readItems('emergency', {
        filter: {
          status: {
            _eq: 'published',
          },
        },
        sort: ['-date_created'],
        limit: 1,
      })
    );

    console.log('Directus SDK response:', response); // デバッグ用ログ

    if (response && response.length > 0) {
      return response[0] as EmergencyItem;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch emergency message:", error);
    return null;
  }
}

const EmergencyBar = () => {
  const [emergency, setEmergency] = useState<EmergencyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEmergency().then(data => {
      setEmergency(data);
      setIsLoading(false);
    });
  }, []);

  const hasValidEmergency = emergency && emergency.content && emergency.status !== 'archived';

  if (isLoading) {
    return (
        <div className="bg-black/20 text-white p-3 text-center">
            読込中...
        </div>
    );
  }
  
  const bgColor = hasValidEmergency ? 'bg-yellow-400' : 'bg-black/20';
  const textColor = hasValidEmergency ? 'text-black' : 'text-white';

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className={`${bgColor} ${textColor} overflow-hidden transition-colors duration-300`}
    >
      <div className="p-3 text-center">
        <p className="font-bold">{hasValidEmergency ? '緊急のお知らせ' : 'お知らせ'}</p>
        <div 
          className="text-sm prose prose-sm prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: hasValidEmergency ? emergency.content : '現在、緊急のお知らせはありません。' }}
        />
      </div>
    </motion.div>
  );
};

export default EmergencyBar;