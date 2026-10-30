// Invoked in independent processes by test:durable; never logs credentials or the owner cookie.
import { updateWorkspace } from "../../src/lib/server/store";
void updateWorkspace(process.env.PROFILY_TEST_OWNER!, async (current) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return {
    ...current,
    pendingSources: [
      ...current.pendingSources,
      {
        id: "worker-" + process.env.PROFILY_TEST_WORKER!,
        group: "durable-test",
        kind: "developer",
        title: "Synthetic concurrency check",
        excerpt: "No real candidate information.",
      },
    ],
  };
})
  .then(() => console.log("Independent write persisted"))
  .catch(() => {
    console.error("Independent durable write failed");
    process.exitCode = 1;
  });
