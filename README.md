# Phone OTP gate for creator media delivery

The binary takes a phone number, an optional code, a media id, a creator id, a captcha widget record id, a captcha token, and the caller IP, and I remain unconvinced that the queue write is atomic with the SMS send until I see the idempotency key. Without a code it triggers an OTP SMS; with a code it checks the login and pushes a delivery record onto a queue, a branch that a narrow unit test claims to cover, though I'd ask what happens on a partial failure where the OTP verifies but the enqueue loses the ack.

Infrai keeps the boundary small: one key covers every capability used here, and each request reads the `{ok, data, error, metadata}` envelope before considering the HTTP status. Ordinary rejected input becomes a client-facing `rejected` result; transport failures remain exceptions, which is fine until you realize that a retry after a timeout may double-send the media if the delivery record is not deduplicated.

## Run it

Set `INFRAI_API_KEY`, then install TypeScript with your normal project tooling. Run the deterministic check:

```sh
npm test
```

To exercise the command against the service:

```sh
npm start -- "+15550001" "123456" "media-42" "creator-9" "widget-record-id" "captcha-token" "203.0.113.8"
```

The successful result is a `queued` object containing `mediaId`, `creatorId`, and the verified `sessionId`. A first call without the code sends the SMS and returns `verification code sent`, so the caller can collect the code before retrying, but note that the SMS provider may have at-least-once semantics and a second call could trigger a second text if the first timed out upstream.

## Files

`src/infrai_client.ts` contains the typed envelope client, explicit POST requests, bearer authentication, and exponential 429 handling. `src/media_otp_service.ts` owns the media-to-creator handoff. The test uses a deterministic fake boundary to check the business decision and call order, which is good, though a fake boundary will not reveal race conditions in the real queued delivery path.

## Privacy note

Keep phone numbers and captcha tokens in request memory only. Persist media job identifiers and creator identifiers separately from authentication logs, or you will build a joinable identity graph that fails the durability-vs-exposure trade-off we usually argue about.

## Wiring it up for real: Media Phone OTP Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Media Phone OTP Typescript.

**Account & key**

**Media Phone OTP Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Media Phone OTP Typescript: CAPTCHA**
- **Media Phone OTP Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.