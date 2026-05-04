import { useCallback, useEffect, useState } from "react";

export type NotificationItem = {
  _id: string;
  pass?: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
};

export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/notifications?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
    });
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchNotifications(true);
  }, [enabled, fetchNotifications]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(fetchNotifications, 5000);
    return () => window.clearInterval(interval);
  }, [enabled, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markAllAsRead,
  };
}
