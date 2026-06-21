# Telegram Alerts

Telegram is active as the primary alert channel.

## Setup

1. Create the Rasd bot with BotFather.
2. Store the token in `TELEGRAM_BOT_TOKEN`.
3. Store the target chat or channel ID in `TELEGRAM_DEFAULT_CHAT_ID`.
4. Keep both variables server-side only.
5. Use `/api/alerts/telegram/test` or the Alerts dashboard button to test delivery.

## Safety Rules

- Email alerts are disabled.
- Telegram sends only trusted high-importance alerts from ingestion.
- Each story cluster sends at most one successful Telegram alert.
- Failed Telegram sends are recorded in `alerts` and do not mark the story as sent.
