import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '📢',
    title: 'Announcements',
    description: 'Post updates that reach every member instantly. Pin important notices and keep everyone aligned.',
  },
  {
    icon: '📅',
    title: 'Events',
    description: 'Create events, collect RSVPs, and manage attendance — all without leaving your dashboard.',
  },
  {
    icon: '💬',
    title: 'Forum',
    description: 'Give members a place to discuss, ask questions, and share ideas in organized threads.',
  },
  {
    icon: '🗨️',
    title: 'Chat',
    description: 'Real-time messaging channels for quick coordination and community building.',
  },
  {
    icon: '🛒',
    title: 'Shop & Dues',
    description: 'Sell gear, collect dues, and track payments — built-in, no third-party storefronts needed.',
  },
  {
    icon: '🏢',
    title: 'Multi-tenant',
    description: 'Each organization gets its own isolated space with custom branding and feature controls.',
  },
];

const STEPS = [
  { num: '01', title: 'Create your organization', body: 'Sign up, name your club, pick your features, and set your brand color in under two minutes.' },
  { num: '02', title: 'Invite your members', body: 'Send invite links to members. They join your org directly — no separate account setup needed.' },
  { num: '03', title: 'Start managing', body: 'Post announcements, schedule events, open the forum, and chat. Everything in one place.' },
];

const UPDATES = [
  {
    date: 'May 2026',
    tag: 'Launch',
    title: 'ClubStack is live',
    body: 'Core platform launched with announcements, events, forum, chat, and shop modules. Organizations can be created and customized with per-club branding.',
  },
  {
    date: 'May 2026',
    tag: 'Infrastructure',
    title: 'Multi-tenant architecture with RLS',
    body: 'All data is isolated at the database level using Supabase Row Level Security. No org can ever see another org\'s data.',
  },
  {
    date: 'Coming soon',
    tag: 'Roadmap',
    title: 'Stripe-powered dues & payments',
    body: 'Collect membership dues and sell items with Stripe. Members pay in-app, admins get a dashboard of all transactions.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Updates />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-slate-900 tracking-tight">
          Club<span className="text-indigo-600">Stack</span>
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#updates" className="btn-ghost hidden sm:inline-flex">Updates</a>
          <a href="#contact" className="btn-ghost hidden sm:inline-flex">Contact</a>
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800 text-white">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 py-28 text-center space-y-7">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-indigo-200">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Now live — create your org in minutes
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
          Run your club,<br />
          <span className="text-indigo-300">not your spreadsheets.</span>
        </h1>
        <p className="text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
          ClubStack gives every organization a private hub — announcements, events, forums, chat, and dues collection — all in one place, with full control over branding and access.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/register" className="btn-primary text-base px-7 py-3 bg-white text-indigo-700 hover:bg-indigo-50">
            Get started free
          </Link>
          <Link to="/login" className="btn-secondary text-base px-7 py-3 bg-transparent border-white/30 text-white hover:bg-white/10">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3">
          <p className="section-label">What's included</p>
          <h2 className="text-3xl font-bold text-slate-900">Everything a club needs</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Pick the modules that fit your club. Each one is purpose-built — not bolted on.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-6 space-y-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3">
          <p className="section-label">Getting started</p>
          <h2 className="text-3xl font-bold text-slate-900">Up and running in minutes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map(s => (
            <div key={s.num} className="space-y-4">
              <span className="text-4xl font-black text-indigo-100 select-none">{s.num}</span>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Updates() {
  return (
    <section id="updates" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6 space-y-10">
        <div className="space-y-3">
          <p className="section-label">Changelog</p>
          <h2 className="text-3xl font-bold text-slate-900">Updates & news</h2>
        </div>
        <div className="space-y-0 divide-y divide-slate-100">
          {UPDATES.map(u => (
            <div key={u.title} className="py-7 flex gap-6">
              <div className="w-28 shrink-0 pt-0.5">
                <p className="text-xs text-slate-400">{u.date}</p>
                <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                  u.tag === 'Launch' ? 'bg-green-100 text-green-700' :
                  u.tag === 'Roadmap' ? 'bg-amber-100 text-amber-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                  {u.tag}
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900">{u.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{u.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-24 bg-indigo-950 text-white">
      <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
        <p className="section-label text-indigo-400">Get in touch</p>
        <h2 className="text-3xl font-bold">Have questions?</h2>
        <p className="text-indigo-300 leading-relaxed">
          We're actively building ClubStack. If you have feedback, feature requests, or just want to talk, reach out directly.
        </p>
        <a
          href="mailto:hello@clubstack.app"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white border border-indigo-700 hover:border-indigo-400 rounded-lg px-6 py-3 text-sm font-medium transition-colors"
        >
          hello@clubstack.app
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-500 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-300">
          Club<span className="text-indigo-400">Stack</span>
        </span>
        <span>© {new Date().getFullYear()} ClubStack. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#updates" className="hover:text-slate-300 transition-colors">Updates</a>
          <a href="#contact" className="hover:text-slate-300 transition-colors">Contact</a>
          <Link to="/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
