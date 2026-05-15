import { useEffect, useState } from 'react';
import { useOrg } from '../../context/OrgContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AnnouncementsTile from './tiles/AnnouncementsTile';
import EventsTile from './tiles/EventsTile';
import ForumTile from './tiles/ForumTile';
import ChatTile from './tiles/ChatTile';
import ShopTile from './tiles/ShopTile';

const TILE_MAP = {
  announcements: AnnouncementsTile,
  events: EventsTile,
  forum: ForumTile,
  chat: ChatTile,
  shop: ShopTile,
};

const fetchers = {
  announcements: orgId =>
    supabase
      .from('announcements')
      .select('title, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => data ?? []),

  events: orgId =>
    supabase
      .from('events')
      .select('title, start_at, location')
      .eq('org_id', orgId)
      .gt('start_at', new Date().toISOString())
      .order('start_at')
      .limit(3)
      .then(({ data }) => data ?? []),

  forum: orgId =>
    supabase
      .from('forum_posts')
      .select('title, profiles!author_id(name), forum_comments(count)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map(p => ({
          title: p.title,
          author: p.profiles?.name,
          commentCount: p.forum_comments?.[0]?.count ?? 0,
        }))
      ),

  chat: async orgId => {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .eq('org_id', orgId)
      .limit(1)
      .single();
    if (!room) return null;
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1);
    return { roomName: room.name, lastMessage: messages?.[0]?.content ?? null, unreadCount: 0 };
  },

  shop: async (orgId, userId) => {
    const [{ data: items }, { data: orders }] = await Promise.all([
      supabase
        .from('shop_items')
        .select('name, price')
        .eq('org_id', orgId)
        .eq('active', true)
        .limit(3),
      supabase
        .from('orders')
        .select('status')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    return {
      items: items ?? [],
      duesStatus: orders?.[0]?.status === 'paid' ? 'paid' : 'unpaid',
    };
  },
};

export default function DashboardHome() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [summary, setSummary] = useState({});

  useEffect(() => {
    if (!org) return;
    const { id: orgId, enabled_features: features = [] } = org;

    Promise.all(
      features.map(key =>
        fetchers[key]?.(orgId, user.id).then(data => ({ [key]: data }))
      ).filter(Boolean)
    ).then(results => setSummary(Object.assign({}, ...results)));
  }, [org, user.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Welcome to {org?.name}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {(org?.enabled_features ?? []).map(key => {
          const Tile = TILE_MAP[key];
          if (!Tile) return null;
          return <Tile key={key} data={summary[key]} />;
        })}
      </div>
    </div>
  );
}
