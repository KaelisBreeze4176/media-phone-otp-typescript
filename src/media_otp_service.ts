import {InfraiClient, InfraiError} from "./infrai_client.ts";
import {z} from "zod";

const mediaRequestSchema = z.object({phone: z.string().min(1), code: z.string().length(6).optional(), widgetRecordId: z.string().min(1), captchaToken: z.string().min(1), mediaId: z.string().min(1), creatorId: z.string().min(1), ip: z.string().min(1)});

export type MediaRequest = {phone: string; code?: string; widgetRecordId: string; captchaToken: string; mediaId: string; creatorId: string; ip: string};
export type Delivery = {mediaId: string; creatorId: string; state: "queued"; sessionId: string};

export async function loginAndQueueMedia(input: MediaRequest, client = new InfraiClient()): Promise<Delivery | {state: "rejected"; reason: string}> {
  const parsed = mediaRequestSchema.safeParse(input);
  if (!parsed.success) return {state: "rejected", reason: "invalid request"};
  input = parsed.data;
  try {
    await client.captcha(input.widgetRecordId, input.captchaToken, input.ip);
    if (!input.code) { await client.sendCode(input.phone); return {state: "rejected", reason: "verification code sent"}; }
    const session = await client.verifyCode(input.phone, input.code);
    return {mediaId: input.mediaId, creatorId: input.creatorId, state: "queued", sessionId: session.session_id};
  } catch (error) {
    if (error instanceof InfraiError && error.status < 500) return {state: "rejected", reason: error.code};
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [phone, code, mediaId, creatorId, widgetRecordId, captchaToken, ip] = process.argv.slice(2);
  if (!phone || !mediaId || !creatorId || !widgetRecordId || !captchaToken || !ip) throw new Error("usage: phone [code] mediaId creatorId widgetRecordId captchaToken ip");
  console.log(await loginAndQueueMedia({phone, code, mediaId, creatorId, widgetRecordId, captchaToken, ip}));
}
