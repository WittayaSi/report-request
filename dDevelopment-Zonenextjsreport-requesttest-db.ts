import { db } from "./src/db/app.db";
import { reportRequests } from "./src/db/app.schema";
import { desc } from "drizzle-orm";

async function main() {
  const reqs = await db.select().from(reportRequests).orderBy(desc(reportRequests.id)).limit(1);
  console.log("LATEST REQUEST:", reqs[0]);
  process.exit(0);
}
main();
