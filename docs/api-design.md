# Data access

There is no custom REST API server. The client queries Supabase directly using
`@supabase/supabase-js`. Row Level Security policies (see `supabase/migrations/0002_rls.sql`)
enforce authorization at the database level.

## Auth — Supabase Auth
```js
supabase.auth.signUp({ email, password, options: { data: { name } } })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.onAuthStateChange((_event, session) => { ... })
```
Password reset and email verification are handled by Supabase automatically.

## Organizations
```js
// create (creator auto-inserted into memberships as owner via app code)
supabase.from('organizations').insert({ name, slug, branding, enabled_features })

// read
supabase.from('organizations').select('id, name, slug, branding, enabled_features').eq('id', orgId).single()

// update branding or feature toggle
supabase.from('organizations').update({ branding }).eq('id', orgId)
supabase.from('organizations').update({ enabled_features }).eq('id', orgId)
```

## Members
```js
supabase.from('memberships').select('user_id, role, status, profiles(name, avatar_url)').eq('org_id', orgId)
supabase.from('memberships').update({ role }).eq('org_id', orgId).eq('user_id', userId)
```

## Announcements
```js
supabase.from('announcements').select('id, title, body, created_at, profiles!author_id(name)').eq('org_id', orgId).order('created_at', { ascending: false })
supabase.from('announcements').insert({ org_id, title, body, author_id: user.id })
supabase.from('announcements').update({ title, body }).eq('id', id)
supabase.from('announcements').delete().eq('id', id)
```

## Events
```js
supabase.from('events').select('*').eq('org_id', orgId).gt('start_at', new Date().toISOString()).order('start_at')
supabase.from('events').insert({ org_id, title, description, location, start_at, end_at, created_by: user.id })
supabase.from('event_registrations').insert({ org_id, event_id, user_id: user.id, status: 'registered' })
```

## Forum
```js
supabase.from('forum_posts').select('id, title, created_at, profiles!author_id(name), forum_comments(count)').eq('org_id', orgId).order('created_at', { ascending: false })
supabase.from('forum_posts').insert({ org_id, title, body, author_id: user.id })
supabase.from('forum_comments').insert({ org_id, post_id, body, author_id: user.id })
```

## Chat — Supabase Realtime
```js
// subscribe
const channel = supabase.channel(`chat:${roomId}`)
  .on('broadcast', { event: 'message' }, ({ payload }) => addMessage(payload))
  .subscribe()

// send
channel.send({ type: 'broadcast', event: 'message', payload: { content, author } })

// persist to DB
supabase.from('chat_messages').insert({ org_id, room_id, author_id: user.id, content })
```

## Shop & Dues
```js
supabase.from('shop_items').select('id, name, description, price, image_url').eq('org_id', orgId).eq('active', true)
supabase.from('orders').select('id, total, status, created_at').eq('org_id', orgId).eq('user_id', user.id)
```
Checkout and payment processing go through a Supabase Edge Function that calls Stripe,
then updates the order status on success.

## Custom logic — Edge Functions
Only used when Supabase's built-in services aren't enough:
- `POST /functions/v1/stripe-webhook` — handle Stripe payment events
- `POST /functions/v1/send-invite` — generate invite link and send email via Resend
- `POST /functions/v1/checkout` — create Stripe payment intent, return client secret
