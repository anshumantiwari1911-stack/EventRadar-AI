import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Compass,
  ExternalLink,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { getSearchEventsQueryKey, useSearchEvents } from '@workspace/api-client-react';
import type { EventResult, SearchEventsParams } from '@workspace/api-client-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function EventCard({ event, index }: { event: EventResult; index: number }) {
  const facts = [
    { label: 'Date', value: event.date, missing: 'date' as const, icon: CalendarDays },
    { label: 'Location', value: event.location, missing: 'location' as const, icon: MapPin },
  ];
  return (
    <article className="event-card group" data-testid={`card-event-${index}`}>
      <div className="event-card-top">
        <span className="event-index">RADAR / {String(index + 1).padStart(2, '0')}</span>
        <a className="source-link" href={event.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-source-${index}`}>
          <span>{event.sourceTitle || 'View source'}</span><ExternalLink size={14} />
        </a>
      </div>
      <h3 className="event-title" data-testid={`text-event-name-${index}`}>{event.name}</h3>
      {event.summary && <p className="event-summary">{event.summary}</p>}
      <div className="event-facts">
        {facts.map(({ label, value, missing, icon: Icon }) => (
          <div className={`fact ${!value ? 'fact-missing' : ''}`} key={label}>
            <Icon size={15} strokeWidth={1.8} />
            <span className="fact-label">{label}</span>
            <span className="fact-value">{value || `Not listed by source`}</span>
            {!value && <span className="fact-flag">{event.missingDetails.includes(missing) ? 'UNCONFIRMED' : 'NOT PROVIDED'}</span>}
          </div>
        ))}
      </div>
      <div className="event-card-bottom">
        <span className="verified-note"><ShieldCheck size={15} /> Source-backed listing</span>
        {event.registrationUrl ? (
          <a className="register-link" href={event.registrationUrl} target="_blank" rel="noreferrer" data-testid={`link-register-${index}`}>
            Registration <ArrowUpRight size={15} />
          </a>
        ) : (
          <span className="register-missing"><X size={13} /> Registration link not listed</span>
        )}
      </div>
    </article>
  );
}

function Home() {
  const [topic, setTopic] = useState('');
  const [city, setCity] = useState('');
  const [submitted, setSubmitted] = useState<SearchEventsParams | null>(null);
  const params: SearchEventsParams = submitted || { topic: 'AI', city: 'Bengaluru', limit: 6 };
  const { data, isLoading, isError, error, refetch, isFetching } = useSearchEvents(params, {
    query: { enabled: !!submitted, queryKey: getSearchEventsQueryKey(params), retry: 1 },
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTopic = topic.trim();
    const cleanCity = city.trim();
    if (cleanTopic.length < 2 || cleanCity.length < 2) return;
    setSubmitted({ topic: cleanTopic, city: cleanCity, limit: 6 });
  }

  const reset = () => {
    setSubmitted(null);
    setTopic('');
    setCity('');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a href="/" className="brand" aria-label="EventRadar AI home">
          <span className="brand-mark"><Radio size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">eventradar<span>.ai</span></span>
        </a>
        <div className="topbar-right">
          <span className="live-indicator"><i /> LIVE SEARCH</span>
          <span className="topbar-divider" />
          <span className="edition">INDIA / STUDENT EDITION</span>
        </div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <div className="eyebrow"><span className="eyebrow-rule" /> YOUR NEXT BUILD STARTS HERE</div>
          <h1>Find your next<br /><em>big build.</em></h1>
          <p className="intro-description">Real hackathons, AI challenges, coding competitions and tech meetups — gathered from the sources that host them.</p>
        </div>
        <div className="radar-visual" aria-hidden="true">
          <div className="radar-grid" />
          <div className="radar-ring ring-one" />
          <div className="radar-ring ring-two" />
          <div className="radar-ring ring-three" />
          <div className="radar-crosshair horizontal" />
          <div className="radar-crosshair vertical" />
          <div className="radar-sweep" />
          <span className="radar-center"><Radio size={18} /></span>
          <span className="radar-ping ping-a" />
          <span className="radar-ping ping-b" />
          <span className="radar-ping ping-c" />
          <span className="radar-coordinate">12.9716° N<br />77.5946° E</span>
        </div>
      </section>

      <section className="search-panel" aria-label="Search events">
        <div className="search-heading">
          <div><span className="section-kicker">EVENT FINDER</span><h2>What are you looking for?</h2></div>
          <span className="search-index">01 <span>/</span> SEARCH</span>
        </div>
        <form className="search-form" onSubmit={search}>
          <label className="field">
            <span className="field-label">I'M INTO</span>
            <span className="field-control"><Search size={18} /><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="AI, hackathons, web3..." minLength={2} maxLength={120} required aria-label="Event topic" data-testid="input-topic" /></span>
          </label>
          <span className="field-separator" />
          <label className="field city-field">
            <span className="field-label">AROUND</span>
            <span className="field-control"><MapPin size={18} /><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City in India" minLength={2} maxLength={80} required aria-label="City" data-testid="input-city" /></span>
          </label>
          <button className="search-button" type="submit" disabled={isFetching} data-testid="button-search">
            {isFetching ? <span className="button-loading" /> : <><span>Find events</span><ArrowRight size={17} /></>}
          </button>
        </form>
        <div className="search-foot">
          <span><ShieldCheck size={14} /> Every result links to its original source</span>
          <span className="limit-note">UP TO 6 RESULTS <ChevronDown size={13} /></span>
        </div>
      </section>

      <section className="results-section" aria-live="polite">
        {!submitted && (
          <div className="welcome-state">
            <div className="welcome-mark"><Compass size={21} /></div>
            <div className="welcome-copy"><h2>Point your radar.</h2><p>Choose a topic and city to uncover source-verified opportunities near you.</p></div>
            <div className="welcome-aside"><Sparkles size={15} /><span>HACKATHONS<br />AI EVENTS<br />TECH MEETUPS</span></div>
          </div>
        )}

        {submitted && isLoading && (
          <div className="results-loading" data-testid="status-loading">
            <div className="results-header"><div><span className="section-kicker">SCANNING THE WEB</span><h2>Picking up a signal<span className="loading-dots">...</span></h2></div><span className="scan-pulse"><i /></span></div>
            <div className="skeleton-list">{[1, 2, 3].map((n) => <div className="skeleton-card" key={n}><div className="skeleton-line short" /><div className="skeleton-line title" /><div className="skeleton-line medium" /><div className="skeleton-bottom"><i /><i /></div></div>)}</div>
          </div>
        )}

        {submitted && isError && (
          <div className="status-panel error-panel" data-testid="status-error">
            <div className="status-icon error-icon"><CircleAlert size={21} /></div>
            <div className="status-copy"><span className="section-kicker">SIGNAL INTERRUPTED</span><h2>We couldn't reach the radar.</h2><p>{error instanceof Error ? error.message : 'Something went wrong while searching. Please try again.'}</p><button className="retry-button" onClick={() => void refetch()} data-testid="button-retry">Try again <ArrowRight size={15} /></button></div>
          </div>
        )}

        {submitted && !isLoading && !isError && data && (
          <>
            <div className="results-header">
              <div><span className="section-kicker">SEARCH RESULTS <span className="header-dot" /></span><h2>Signals near {data.city || submitted.city}</h2></div>
              <button className="clear-search" onClick={reset} data-testid="button-clear-search">New search <ArrowUpRight size={14} /></button>
            </div>
            {data.events.length > 0 ? (
              <>
                <div className="results-meta"><span><b>{data.events.length}</b> source-backed {data.events.length === 1 ? 'event' : 'events'} for <b>{data.query}</b></span><span className="meta-right">SORTED BY RELEVANCE <ArrowDownRight size={13} /></span></div>
                <div className="event-list">{data.events.map((event, index) => <EventCard key={`${event.sourceUrl}-${index}`} event={event} index={index} />)}</div>
              </>
            ) : (
              <div className="status-panel empty-panel" data-testid="status-empty">
                <div className="status-icon"><Search size={20} /></div>
                <div className="status-copy"><span className="section-kicker">NO SIGNALS FOUND</span><h2>Nothing matched this search.</h2><p>Try a broader topic or a nearby city. We only show events with a source to verify them.</p><button className="retry-button" onClick={reset} data-testid="button-edit-search">Adjust search <ArrowRight size={15} /></button></div>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        <span className="footer-brand"><Radio size={14} /> EVENTRADAR.AI</span>
        <span>Built for the next generation of builders.</span>
        <span className="footer-right">SOURCE FIRST. ALWAYS.</span>
      </footer>
    </main>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
