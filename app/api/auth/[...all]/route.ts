import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth-server";

export const { GET, POST } = toNextJsHandler((request: Request) => getAuth().handler(request));
