import { createClient } from "redis";

async function main() {
  console.log("Starting Worker!");

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const clinet = await createClient({ url: redisUrl });

  await clinet.connect();

  if (clinet.isOpen) {
    console.log("Redis client connected successfully");
  }

  if (!clinet) {
    console.error("Failed to connect to Redis");
    return;
  }

  console.log("Worker started successfully");

  while (1) {
    const data = await clinet?.brPop("req", 0);
    const req: any = await JSON.parse(data?.element || "");

    console.log("Processing request:", req);
  }
  

}

main();
