"use client";

import { MessageBoard } from "@/components/guardian/MessageBoard";
import { PatientSelector } from "@/components/guardian/PatientSelector";
import { useLinkedPatients } from "@/hooks/useLinkedPatients";

export default function MessagesPage() {
  const { patients, selectedId, setSelectedId, loading } = useLinkedPatients();

  if (loading) return <p className="text-muted-foreground">불러오는 중...</p>;
  if (patients.length === 0) {
    return <p className="text-muted-foreground">연동된 환자가 없습니다. 먼저 환자를 연동해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} />
      {selectedId && <MessageBoard patientId={selectedId} />}
    </div>
  );
}
