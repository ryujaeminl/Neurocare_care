import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7은 .env를 자동으로 읽지 않으므로 직접 로드한다.
// DATABASE_URL은 .env에 둔다. TURSO_* 값은 Next.js 전용인 .env.local에 있으므로
// 그것도 함께 읽어야 마이그레이션 CLI가 같은 값을 본다.
loadEnv();
loadEnv({ path: ".env.local", override: true });

const tursoUrl = process.env.TURSO_DATABASE_URL;

// 환자 앱(Neurocare)과 완전히 같은 DB를 본다 - 스키마도 그쪽과 동일하게 유지해야 한다.
// 마이그레이션 CLI는 드라이버 어댑터를 안 쓰므로, Turso auth token은 URL 쿼리로 붙인다.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: tursoUrl
      ? `${tursoUrl}?authToken=${process.env.TURSO_AUTH_TOKEN}`
      : (process.env.DATABASE_URL ?? "file:./dev.db"),
  },
});
