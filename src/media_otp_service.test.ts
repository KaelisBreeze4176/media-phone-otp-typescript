import {loginAndQueueMedia} from "./media_otp_service.ts";

const calls: string[] = [];
const fake = {captcha: async (widgetRecordId: string, token: string) => {if (widgetRecordId !== "widget-1" || token !== "ok") throw new Error("invalid captcha payload"); calls.push("captcha"); return {verified: true};}, sendCode: async () => {calls.push("send"); return {sent: true};}, verifyCode: async () => {calls.push("verify"); return {user_id: "u1", session_id: "s1"};}} as any;
const result = await loginAndQueueMedia({phone: "+15550001", code: "123456", widgetRecordId: "widget-1", captchaToken: "ok", mediaId: "track-7", creatorId: "creator-2", ip: "203.0.113.8"}, fake);
if (result.state !== "queued" || result.sessionId !== "s1" || calls.join(",") !== "captcha,verify") throw new Error("OTP media decision failed");
console.log("media OTP decision: queued");
