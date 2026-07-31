import { Pinecone } from "@pinecone-database/pinecone";
import { embedText } from "@/lib/memory/embedClient";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "neurocare-memory";

export interface FamilyMemoryRecord {
  memoryId: string;
  patientId: string;
  title: string;
  content: string;
  createdAt: Date;
}

/**
 * Pinecone은 선택 사항이다. 키가 없으면 기억은 DB에만 저장되고 환자 앱 대화 중
 * RAG 검색 대상에서는 빠진다. 환자 앱 lib/memory/pineconeClient.ts와 같은 인덱스를 쓴다 -
 * 거기서 metadata.kind로 "turn"(과거 대화)과 "family_memory"(이 앱이 넣는 기억)를 구분해 읽는다.
 */
export function isPineconeConfigured(): boolean {
  return Boolean(PINECONE_API_KEY);
}

let cachedClient: Pinecone | null = null;

function getIndex() {
  if (!PINECONE_API_KEY) return null;
  cachedClient ??= new Pinecone({ apiKey: PINECONE_API_KEY });
  return cachedClient.index(PINECONE_INDEX);
}

/**
 * 보호자가 입력한 가족 기억을 벡터로 저장한다. 실패해도 예외를 던지지 않는다 -
 * Pinecone 저장이 안 된다고 DB 저장까지 실패하면 안 되기 때문이다.
 */
export async function upsertFamilyMemory(record: FamilyMemoryRecord): Promise<string | null> {
  const index = getIndex();
  if (!index) return null;

  try {
    const text = `${record.title}: ${record.content}`;
    const values = await embedText(text, "passage");
    await index.upsert({
      records: [
        {
          id: record.memoryId,
          values,
          metadata: {
            patientId: record.patientId,
            kind: "family_memory",
            text,
            createdAt: record.createdAt.toISOString(),
          },
        },
      ],
    });
    return record.memoryId;
  } catch {
    return null;
  }
}

export async function deleteFamilyMemory(memoryId: string): Promise<void> {
  const index = getIndex();
  if (!index) return;
  try {
    await index.deleteMany([memoryId]);
  } catch {
    // 벡터 삭제 실패가 DB 삭제까지 막지 않도록 조용히 넘어간다.
  }
}
