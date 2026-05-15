import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Announcements',
    description: 'Post updates that reach every member instantly. Pin important notices and keep everyone aligned.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    title: 'Events',
    description: 'Create events, collect RSVPs, and manage attendance — all without leaving your dashboard.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Forum',
    description: 'Give members a place to discuss, ask questions, and share ideas in organized threads.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    title: 'Chat',
    description: 'Real-time messaging channels for quick coordination and community building.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Shop & Dues',
    description: 'Sell gear, collect dues, and track payments — built-in, no third-party storefronts needed.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    title: 'Multi-tenant',
    description: 'Each organization gets its own isolated space with custom branding and feature controls.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

const STEPS = [
  { title: 'Create your organization', body: 'Sign up, name your club, pick your features, and set your brand color in under two minutes.' },
  { title: 'Invite your members', body: 'Send invite links to members. They join your org directly — no separate account setup needed.' },
  { title: 'Start managing', body: 'Post announcements, schedule events, open the forum, and chat. Everything in one place.' },
];

const UPDATES = [
  {
    date: 'May 2026',
    tag: 'Launch',
    tagColor: 'bg-green-100 text-green-700',
    title: 'ClubStack is live',
    body: 'Core platform launched with announcements, events, forum, chat, and shop modules. Organizations can be created and customized with per-club branding.',
  },
  {
    date: 'May 2026',
    tag: 'Infrastructure',
    tagColor: 'bg-indigo-100 text-indigo-700',
    title: 'Multi-tenant architecture with RLS',
    body: "All data is isolated at the database level using Supabase Row Level Security. No org can ever see another org's data.",
  },
  {
    date: 'Coming soon',
    tag: 'Roadmap',
    tagColor: 'bg-amber-100 text-amber-700',
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="w-full px-8 xl:px-16 h-16 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl text-slate-900 tracking-tight">
          Club<span className="text-indigo-600">Stack</span>
        </Link>
        <nav className="flex items-center gap-1">
          <a href="#updates" className="btn-ghost hidden sm:inline-flex text-slate-600">Updates</a>
          <a href="#contact" className="btn-ghost hidden sm:inline-flex text-slate-600">Contact</a>
          <Link to="/login" className="btn-ghost text-slate-600">Sign in</Link>
          <Link to="/register" className="btn-primary ml-2">Get started</Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800 text-white">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative w-full px-8 xl:px-16 py-28 lg:py-36 text-center space-y-8 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-indigo-200">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Now live — create your org in minutes
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
          Run your club,<br />
          <span className="text-indigo-300">not your spreadsheets.</span>
        </h1>
        <p className="text-xl text-indigo-200 max-w-2xl mx-auto leading-relaxed">
          ClubStack gives every organization a private hub — announcements, events, forums, chat, and dues collection — with full control over branding and access.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/register" className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-semibold text-base hover:bg-indigo-50 transition-colors">
            Get started free
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-colors">
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
      <div className="w-full px-8 xl:px-16 max-w-screen-xl mx-auto space-y-14">
        <h2 className="text-4xl font-bold text-slate-900">Everything a club needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-7 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg text-slate-900">{f.title}</h3>
              </div>
              <p className="text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 bg-indigo-950 text-white">
      <div className="w-full px-8 xl:px-16 max-w-screen-xl mx-auto space-y-14">
        <h2 className="text-4xl font-bold">Up and running in minutes</h2>
        <div className="flex flex-col md:flex-row items-start gap-6">
          {STEPS.map((s, i) => (
            <>
              <div key={s.title} className="flex-1 space-y-3">
                <h3 className="font-semibold text-xl text-white">{s.title}</h3>
                <p className="text-indigo-300 leading-relaxed">{s.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div key={`div-${i}`} className="self-center shrink-0 rotate-90 md:rotate-0 text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}

function Updates() {
  return (
    <section id="updates" className="py-24 bg-white">
      <div className="w-full px-8 xl:px-16 max-w-screen-lg mx-auto space-y-12">
        <h2 className="text-4xl font-bold text-slate-900">Updates & news</h2>
        <div className="divide-y divide-slate-100">
          {UPDATES.map(u => (
            <div key={u.title} className="py-8 flex gap-8">
              <div className="w-32 shrink-0 pt-0.5 space-y-2">
                <p className="text-sm text-slate-400">{u.date}</p>
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${u.tagColor}`}>
                  {u.tag}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-slate-900">{u.title}</h3>
                <p className="text-slate-500 leading-relaxed">{u.body}</p>
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
      <div className="w-full px-8 xl:px-16 max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-4xl font-bold">Have questions?</h2>
        <p className="text-lg text-indigo-300 leading-relaxed">
          We're actively building ClubStack. If you have feedback, feature requests, or just want to talk, reach out directly.
        </p>
        <a
          href="mailto:hello@clubstack.app"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white border border-indigo-700 hover:border-indigo-400 rounded-lg px-7 py-3.5 font-medium transition-colors"
        >
          hello@clubstack.app
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-500 py-8 border-t border-slate-800">
      <div className="w-full px-8 xl:px-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-300 text-base">
          Club<span className="text-indigo-400">Stack</span>
        </span>
        <span>© {new Date().getFullYear()} ClubStack. All rights reserved.</span>
        <div className="flex gap-5">
          <a href="#updates" className="hover:text-slate-300 transition-colors">Updates</a>
          <a href="#contact" className="hover:text-slate-300 transition-colors">Contact</a>
          <Link to="/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
