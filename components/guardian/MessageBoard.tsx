"use client";

import { useEffect, useRef, useState } from "react";
import type { FamilyMessage } from "@prisma/client";

const fieldClass = "rounded-xl border border-surface-border bg-background px-3 py-2 outline-none focus:border-accent";

/**
 * 가족이 환자에게 남기는 짧은 메시지 + 사진 첨부. AI가 대화 중 먼저 "메시지가 있어요,
 * 읽어드릴까요?"라고 물어보고 원할 때만 전달한다(app/api/chat/route.ts, Neurocare 쪽) -
 * 여기서는 남기기/목록/삭제만 다룬다.
 */
export function MessageBoard({ patientId }: { patientId: string }) {
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromName, setFromName] = useState("");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/guardian/messages?patientId=${patientId}`);
        const data = await response.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        if (!cancelled) setError("메시지를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [patientId]);

  function pickPhoto(file: File) {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("patientId", patientId);
      form.append("fromName", fromName);
      form.append("content", content);
      if (photo) form.append("file", photo);

      const response = await fetch("/api/guardian/messages", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setMessages((prev) => [data.message, ...prev]);
      setFromName("");
      setContent("");
      clearPhoto();
    } catch {
      setError("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/guardian/messages/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
      <h3 className="font-semibold">가족 메시지</h3>
      <p className="text-sm text-muted-foreground">
        여기 남긴 메시지는 대화 중 AI가 먼저 &ldquo;OO님이 메시지를 남기셨어요, 읽어드릴까요?&rdquo;라고
        물어본 뒤 원하실 때만 전달합니다. 사진도 함께 보낼 수 있어요.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="보낸 사람 (예: 손녀 지민)"
            required
            className={`text-sm sm:w-40 ${fieldClass}`}
          />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지 내용"
            required
            className={`flex-1 text-sm ${fieldClass}`}
          />
        </div>

        {photoPreview ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="" className="h-16 w-16 rounded-lg border border-surface-border object-cover" />
            <button type="button" onClick={clearPhoto} className="text-xs text-danger-foreground underline">
              사진 빼기
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-fit items-center gap-2 rounded-full border border-dashed border-surface-border px-3 py-1.5 text-xs text-muted-foreground hover:border-accent/50"
          >
            📷 사진 첨부 (선택)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickPhoto(file);
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          className="self-end rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "보내는 중..." : "남기기"}
        </button>
      </form>

      {error && <p className="text-sm text-danger-foreground">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">남긴 메시지가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.map((message) => (
            <li key={message.id} className="flex items-start gap-3 rounded-xl border border-surface-border bg-background px-3 py-2 text-sm">
              {message.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={message.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <p>
                  <span className="font-medium">{message.fromName}</span>: {message.content}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString("ko-KR")} ·{" "}
                  {message.deliveredAt ? "전달됨" : "아직 전달 전"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(message.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-danger-foreground"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
