# Sources

Rasd source records define the trust basis for monitoring.

## Source Types

- `official`: government, emergency authority, court, central bank, military command, or verified institutional feeds.
- `major_agency`: large global news agencies.
- `trusted_media`: reputable editorial outlets.
- `monitoring_only`: useful for early awareness but not sufficient for confirmed alerts.

## Credibility Weights

Use `0-100`. Suggested defaults:

- Official: `90-100`
- Major agency: `85-95`
- Trusted media: `70-85`
- Monitoring only: `30-55`

## Seed Sources

The operational migration seeds BBC Arabic, BBC World, Al Jazeera Arabic/English, Sky News Arabia, RT Arabic, Guardian World, Axios, CNN World, and Reuters through a Google News RSS fallback. Paid APIs are intentionally avoided.

## Alert Rule

Telegram alerts are sent only when importance is at least `75`, confidence is at least `80`, and the story has either two trusted sources or a combination of official source and major agency. Monitoring-only sources never trigger confirmed alerts by themselves.

## Verification Philosophy

Rasd shows source links, source count, source types, confidence score, status, and reason. It does not claim to know reality independently. Social-media-only or unofficial claims must remain monitoring or likely and must not trigger confirmed alerts.
