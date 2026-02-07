"use client";

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function EnableNotifications() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [secureContext, setSecureContext] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent || '';
    const isMacLike = /Mac/.test(ua);
    const isiOSLike = /iPad|iPhone|iPod/.test(ua) || (isMacLike && (navigator as any).maxTouchPoints > 1); // eslint-disable-line @typescript-eslint/no-explicit-any
    const standalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches; // eslint-disable-line @typescript-eslint/no-explicit-any
    const sw = 'serviceWorker' in navigator;
    setIsIOS(isiOSLike);
    setIsStandalone(standalone);
    setSecureContext(window.isSecureContext);
    const supp = isiOSLike ? (sw && standalone) : sw;
    setSupported(supp);
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') setEnabled(true);
    }
  }, []);

  const subscribe = async () => {
    try {
      setLoading(true);
      if (!('serviceWorker' in navigator)) throw new Error('No serviceWorker');
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('permission denied');
      }
      const reg = await navigator.serviceWorker.ready;
      if (!('pushManager' in reg)) {
        alert('この環境ではプッシュ通知に対応していない可能性があります。iOSはホーム画面に追加後のみ有効です。');
        return;
      }
      const res = await fetch('/api/push/public-key');
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('VAPID public key not set');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const resp = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      if (!resp.ok) throw new Error('subscribe failed');
      setEnabled(true);
    } catch (e) {
      console.error(e);
      alert('通知の有効化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const canSubscribe = supported && (!isIOS || isStandalone);

  return (
    <div className="my-4 p-4 border rounded-lg bg-white/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-800">プッシュ通知</p>
          <p className="text-sm text-gray-600">新しいお知らせが公開されたら通知します。</p>
          {!supported && (
            <p className="text-xs text-amber-600 mt-1">この端末/ブラウザでは通知に対応していない可能性があります。</p>
          )}
          {isIOS && !isStandalone && (
            <p className="text-xs text-amber-600 mt-1">iOSでは「ホーム画面に追加」した後、アプリを再起動してからこのボタンで有効にできます。手順: 共有メニュー → ホーム画面に追加</p>
          )}
          {isIOS && isStandalone && permission === 'denied' && (
            <p className="text-xs text-amber-600 mt-1">iOSの通知がオフになっています。設定アプリ → 通知 → このホーム画面アプリを選択 → 「通知を許可」をオンにしてください。</p>
          )}
          {!secureContext && (
            <p className="text-xs text-amber-600 mt-1">通知にはHTTPSが必要です。公開URL（https）からホーム画面に追加してお試しください。</p>
          )}
        </div>
        {enabled ? (
          <span className="text-green-600 text-sm">有効</span>
        ) : (
          <button onClick={subscribe} disabled={loading || !canSubscribe} className="px-4 py-2 bg-fuchsia-600 text-white rounded-md disabled:opacity-50">
            {loading ? '設定中…' : '有効にする'}
          </button>
        )}
      </div>
    </div>
  );
}
