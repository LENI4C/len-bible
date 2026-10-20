"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBook } from "@/lib/books";
import { useProgressStore } from "@/store/useProgressStore";
import { AppLoading } from "@/components/AppLoading";
import { ReportModal } from "@/components/ReportModal";
import { ChevronLeft, Flag } from "lucide-react";

interface Reply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string; avatar: string } | null;
}

interface Thread {
  id: string;
  title: string;
  body: string;
  verse: number | null;
  created_at: string;
  profiles: { username: string; avatar: string } | null;
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string; threadId: string }>;
}) {
  const { book, chapter: chapterStr, threadId } = use(params);
  const bookId = book.toUpperCase();
  const chapter = parseInt(chapterStr, 10);
  const bookData = getBook(bookId);
  const profile = useProgressStore((s) => s.profile);

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "thread" | "reply";
    id: string;
  } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [threadRes, repliesRes] = await Promise.all([
      supabase.from("discussion_threads").select("*, profiles(username, avatar)").eq("id", threadId).single(),
      supabase.from("discussion_replies").select("*, profiles(username, avatar)").eq("thread_id", threadId).order("created_at"),
    ]);
    setThread(threadRes.data as Thread);
    setReplies((repliesRes.data as Reply[]) ?? []);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = createClient();
      const [threadRes, repliesRes] = await Promise.all([
        supabase.from("discussion_threads").select("*, profiles(username, avatar)").eq("id", threadId).single(),
        supabase.from("discussion_replies").select("*, profiles(username, avatar)").eq("thread_id", threadId).order("created_at"),
      ]);
      if (!cancelled) {
        setThread(threadRes.data as Thread);
        setReplies((repliesRes.data as Reply[]) ?? []);
        setLoading(false);
      }
    };

    void run();

    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussion_replies", filter: `thread_id=eq.${threadId}` },
        () => { void load(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [threadId, load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || cooldown) return;
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase.from("discussion_replies").insert({
      thread_id: threadId,
      author_id: profile.id,
      body: replyBody.trim(),
    });

    if (insertError) {
      setError(insertError.message.includes("rate_limit") ? "Slow down — wait a minute before posting again." : insertError.message);
      return;
    }

    setReplyBody("");
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
    void load();
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
  if (!thread) return <p className="p-8 text-center text-muted">Thread not found</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title="Report content"
        onSubmit={async (reason) => {
          if (!profile || !reportTarget) return;
          const supabase = createClient();
          const { error: reportError } = await supabase.from("reports").insert({
            target_type: reportTarget.type,
            target_id: reportTarget.id,
            reporter_id: profile.id,
            reason,
          });
          if (reportError) throw new Error(reportError.message);
        }}
      />
      <Link href={`/discuss/${bookId}/${chapter}`} className="mb-6 flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to discussion
      </Link>

      <div className="glass-card mb-6 rounded-2xl p-6">
        <div className="mb-2 flex justify-between">
          <h1 className="text-xl font-bold">{thread.title}</h1>
          <button
            type="button"
            onClick={() => setReportTarget({ type: "thread", id: threadId })}
            className="text-muted hover:text-danger"
            aria-label="Report thread"
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>
        {thread.verse && <p className="mb-2 text-sm text-primary">Verse {thread.verse}</p>}
        <p className="mb-4 text-muted">{thread.body}</p>
        <p className="text-xs text-muted">{thread.profiles?.avatar} {thread.profiles?.username} · {new Date(thread.created_at).toLocaleDateString()}</p>
      </div>

      <div className="mb-6 space-y-3">
        <h2 className="font-semibold">Replies ({replies.length})</h2>
        {replies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            No replies yet — share a thoughtful response.
          </p>
        ) : (
          replies.map((r) => (
            <div key={r.id} className="glass-card rounded-xl p-4">
              <div className="mb-2 flex justify-between">
                <span className="text-xs text-muted">
                  {r.profiles?.avatar} {r.profiles?.username}
                </span>
                <button
                  type="button"
                  onClick={() => setReportTarget({ type: "reply", id: r.id })}
                  className="text-muted hover:text-danger"
                  aria-label="Report reply"
                >
                  <Flag className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm">{r.body}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleReply} className="glass-card rounded-2xl p-4 space-y-3">
        <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} required minLength={2} rows={3} placeholder="Write a reply…" className="w-full rounded-xl border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={cooldown} className="rounded-xl bg-primary px-4 py-2 font-semibold text-background disabled:opacity-50">
          {cooldown ? "Posted!" : "Reply"}
        </button>
      </form>
    </div>
  );
}
