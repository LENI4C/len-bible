"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBook } from "@/lib/books";
import { useProgressStore } from "@/store/useProgressStore";
import { AppLoading } from "@/components/AppLoading";
import { ReportModal } from "@/components/ReportModal";
import { ChevronLeft, MessageSquare, Flag, Plus } from "lucide-react";

interface Thread {
  id: string;
  book_id: string;
  chapter: number;
  verse: number | null;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string; avatar: string } | null;
}

export default function DiscussPage({
  params,
  searchParams,
}: {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ verse?: string }>;
}) {
  const { book, chapter: chapterStr } = use(params);
  const { verse: verseParam } = use(searchParams);
  const bookId = book.toUpperCase();
  const chapter = parseInt(chapterStr, 10);
  const bookData = getBook(bookId);
  const profile = useProgressStore((s) => s.profile);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!verseParam);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [verse, setVerse] = useState(verseParam ? parseInt(verseParam, 10) : "");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [reportThreadId, setReportThreadId] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("discussion_threads")
      .select("*, profiles(username, avatar)")
      .eq("book_id", bookId)
      .eq("chapter", chapter)
      .order("created_at", { ascending: false });
    setThreads((data as Thread[]) ?? []);
    setLoading(false);
  }, [bookId, chapter]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("discussion_threads")
        .select("*, profiles(username, avatar)")
        .eq("book_id", bookId)
        .eq("chapter", chapter)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setThreads((data as Thread[]) ?? []);
        setLoading(false);
      }
    };

    void run();

    const supabase = createClient();
    const channel = supabase
      .channel(`discuss-${bookId}-${chapter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_threads",
          filter: `book_id=eq.${bookId}`,
        },
        () => { void loadThreads(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [bookId, chapter, loadThreads]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || cooldown) return;
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase.from("discussion_threads").insert({
      book_id: bookId,
      chapter,
      verse: verse === "" ? null : Number(verse),
      author_id: profile.id,
      title: title.trim(),
      body: body.trim(),
    });

    if (insertError) {
      setError(insertError.message.includes("rate_limit") ? "Slow down — wait a minute before posting again." : insertError.message);
      return;
    }

    setTitle("");
    setBody("");
    setVerse("");
    setShowForm(false);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
    void loadThreads();
  };

  if (!bookData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">Book not found.</p>
        <Link href="/journey" className="mt-4 text-primary hover:underline">
          Back to Journey
        </Link>
      </div>
    );
  }
  if (loading) return <AppLoading />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <ReportModal
        open={!!reportThreadId}
        onClose={() => setReportThreadId(null)}
        title="Report thread"
        onSubmit={async (reason) => {
          if (!profile || !reportThreadId) return;
          const supabase = createClient();
          const { error: reportError } = await supabase.from("reports").insert({
            target_type: "thread",
            target_id: reportThreadId,
            reporter_id: profile.id,
            reason,
          });
          if (reportError) throw new Error(reportError.message);
        }}
      />
      <Link href={`/read/${bookId}/${chapter}`} className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to {bookData.name} {chapter}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"><span className="gradient-text">Discuss</span></h1>
          <p className="text-muted">{bookData.name} · Chapter {chapter}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-background"
        >
          <Plus className="h-4 w-4" />
          Ask
        </button>
      </div>

      {showForm && (
        <form onSubmit={handlePost} className="glass-card mb-6 rounded-2xl p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} className="w-full rounded-xl border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Verse (optional)</label>
            <input type="number" value={verse} onChange={(e) => setVerse(e.target.value === "" ? "" : parseInt(e.target.value, 10))} min={1} className="w-24 rounded-xl border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Your question</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} rows={4} className="w-full rounded-xl border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={cooldown} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">
            {cooldown ? "Posted!" : "Post question"}
          </button>
        </form>
      )}

      {threads.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">No questions yet — be the first to ask about this chapter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link href={`/discuss/${bookId}/${chapter}/thread/${t.id}`} className="flex-1 hover:text-primary">
                  <h3 className="font-semibold">{t.title}</h3>
                  {t.verse && <p className="text-xs text-primary">Verse {t.verse}</p>}
                </Link>
                <button
                  type="button"
                  onClick={() => setReportThreadId(t.id)}
                  className="text-muted hover:text-danger"
                  title="Report"
                  aria-label="Report thread"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 line-clamp-2 text-sm text-muted">{t.body}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{t.profiles?.avatar} {t.profiles?.username}</span>
                <span>·</span>
                <span>{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
