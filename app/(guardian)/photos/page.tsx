"use client";

import { useEffect, useState } from "react";
import { FamilyMemberCard, type FamilyMemberSummary } from "@/components/guardian/FamilyMemberCard";
import { PhotoUploader, type UploadedPhoto } from "@/components/guardian/PhotoUploader";
import { useLinkedPatients } from "@/hooks/useLinkedPatients";

export default function PhotosPage() {
  const { patients, selectedId, setSelectedId, loading: loadingPatients } = useLinkedPatients();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [filterMemberId, setFilterMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [photosRes, membersRes] = await Promise.all([
          fetch(`/api/guardian/photos?patientId=${selectedId}`),
          fetch(`/api/guardian/family?patientId=${selectedId}`),
        ]);
        const photosData = await photosRes.json();
        const membersData = await membersRes.json();
        if (cancelled) return;
        if (!photosRes.ok) {
          setError(photosData.error ?? "사진을 불러오지 못했습니다.");
          return;
        }
        setPhotos(photosData.photos ?? []);
        setMembers(membersData.members ?? []);
        setError(null);
      } catch {
        if (!cancelled) setError("사진을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleDelete(id: string) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const response = await fetch(`/api/guardian/photos/${id}`, { method: "DELETE" });
    if (response.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const visiblePhotos = filterMemberId ? photos.filter((p) => p.familyMemberId === filterMemberId) : photos;

  if (loadingPatients) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (patients.length === 0) {
    return <p className="text-muted-foreground">연동된 환자가 없습니다. 먼저 환자를 연동해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {patients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => setSelectedId(patient.id)}
            className={`rounded-2xl border px-5 py-3 text-left font-semibold transition ${
              selectedId === patient.id
                ? "border-accent bg-accent/10"
                : "border-surface-border bg-surface hover:border-accent/50"
            }`}
          >
            {patient.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : (
        <>
          <h2 className="text-lg font-semibold">사진</h2>
          {selectedId && (
            <PhotoUploader patientId={selectedId} familyMembers={members} onUploaded={(p) => setPhotos((prev) => [p, ...prev])} />
          )}

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                onClick={() => setFilterMemberId("")}
                className={`rounded-full border px-3 py-1 ${
                  filterMemberId === "" ? "border-accent bg-accent/10" : "border-surface-border"
                }`}
              >
                전체
              </button>
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setFilterMemberId(member.id)}
                  className={`rounded-full border px-3 py-1 ${
                    filterMemberId === member.id ? "border-accent bg-accent/10" : "border-surface-border"
                  }`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          )}

          {members.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">가족 구성원</h2>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {members.map((member) => (
                  <FamilyMemberCard key={member.id} member={member} />
                ))}
              </div>
            </section>
          )}

          {error && <p className="text-danger-foreground">{error}</p>}
          {visiblePhotos.length === 0 ? (
            <p className="text-muted-foreground">업로드된 사진이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visiblePhotos.map((photo) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-surface-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption ?? ""} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    <span className="truncate">{photo.caption || photo.familyMember?.name || ""}</span>
                    <button type="button" onClick={() => handleDelete(photo.id)} className="shrink-0 underline">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
