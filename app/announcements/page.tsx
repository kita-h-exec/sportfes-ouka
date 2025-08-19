
import { getAnnouncements } from '@/lib/directus';
import AnnouncementsHeaderClient from '@/components/AnnouncementsHeaderClient';
import AnnouncementsControls from '../../components/AnnouncementsControls';

// Always render dynamically to fetch the latest announcements immediately
export const dynamic = 'force-dynamic';
// Additionally, disable ISR completely
export const revalidate = 0;

interface Announcement {
  title: string;
  body: string;
  date_created: string;
  date_updated: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
  const showUpdatedAt = new Date(announcement.date_updated).getTime() - new Date(announcement.date_created).getTime() > 5000;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{announcement.title}</h3>
      <div className="text-xs text-gray-500 mb-4">
        <p>作成日時: {formatDate(announcement.date_created)}</p>
        {showUpdatedAt && <p>最終更新: {formatDate(announcement.date_updated)}</p>}
      </div>
      <p className="text-gray-700 whitespace-pre-wrap">{announcement.body}</p>
    </div>
  );
};

export default async function AnnouncementsPage() {
  const publishedAnnouncements = (await getAnnouncements('published')) as unknown as Announcement[];
  const archivedAnnouncements = (await getAnnouncements('archived')) as unknown as Announcement[];

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-16">
      <div className="container mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-800">お知らせ</h1>
        </header>

        <section>
          <AnnouncementsHeaderClient />
          <div className="mt-4 mb-8">
            <AnnouncementsControls />
          </div>
          <h2 className="text-3xl font-bold text-gray-700 mb-6 border-b-2 border-fuchsia-500 pb-2">現在のお知らせ</h2>
          <div className="space-y-6">
            {publishedAnnouncements && publishedAnnouncements.length > 0 ? (
              publishedAnnouncements.map((item, index) => <AnnouncementCard key={index} announcement={item} />)
            ) : (
              <p className="text-gray-500">現在、新しいお知らせはありません。</p>
            )}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-bold text-gray-700 mb-6 border-b-2 border-gray-400 pb-2">過去のお知らせ</h2>
          <div className="space-y-6">
            {archivedAnnouncements && archivedAnnouncements.length > 0 ? (
              archivedAnnouncements.map((item, index) => <AnnouncementCard key={index} announcement={item} />)
            ) : (
              <p className="text-gray-500">過去のお知らせはありません。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
