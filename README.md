# SMSBazaar

SMSBazaar is a single-page dashboard for comparing `OPENAI(ChatGPT)` SMS verification prices and stock across multiple SMS providers.

It aggregates provider API snapshots on the server, normalizes countries to ISO2, converts prices to CNY and USD, and renders a country-first comparison table with expandable provider details.

## Features

- Compare `OPENAI(ChatGPT)` prices and stock by country.
- Supports 7 providers: Hero SMS, SMSBower, 5sim, NexSMS, GrizzlySMS, SMS Verification Number, and SMSPool.
- Country names are shown in Chinese with English names in parentheses.
- Register mode is filtered by OpenAI-supported countries.
- Bind mode uses a maintained whitelist.
- Recommended mode is driven by a simple text config.
- Backend refreshes snapshots automatically every minute by default.
- Manual refresh API is protected by an administrator token.
- Frontend supports system, light, and dark themes.

## Architecture

- Frontend: React SPA built with Vite.
- Backend: Express API and static file server.
- Storage: SQLite for provider snapshots, refresh state, exchange rates, and service metadata.
- Runtime: One Node.js process can serve both API and frontend assets after build.

## Requirements

- Node.js 20 or newer.
- npm.
- API keys for the providers you want to enable.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8787`.

## Production Build

```bash
npm install
npm run build
npm start
```

By default the production server listens on `PORT=8787` and serves `dist/client`.

## Environment Variables

Copy `.env.example` to `.env` on the server and fill in the provider keys.

```env
PORT=8787
REFRESH_INTERVAL_MS=60000
REFRESH_COOLDOWN_MS=30000
DATABASE_PATH=./data/app.sqlite
EXCHANGE_RATE_URL=https://api.frankfurter.app/latest?from=USD
RECOMMENDED_COUNTRY_PATHS_FILE=./data/recommended-country-paths.txt
OPENAI_SUPPORTED_COUNTRIES_FILE=./data/openai-supported-api-countries.txt
ADMIN_REFRESH_TOKEN=
EXPOSE_PROVIDER_ERRORS=false
```

Provider API keys:

```env
HERO_SMS_API_KEY=
SMSBOWER_API_KEY=
FIVESIM_API_KEY=
NEXSMS_API_KEY=
GRIZZLYSMS_API_KEY=
SMS_VERIFICATION_API_KEY=
SMSPOOL_API_KEY=
```

Provider service codes can also be overridden:

```env
HERO_SMS_SERVICE_CODE=dr
SMSBOWER_SERVICE_CODE=dr
FIVESIM_SERVICE_CODE=openai
NEXSMS_SERVICE_CODE=dr
GRIZZLYSMS_SERVICE_CODE=dr
SMS_VERIFICATION_SERVICE_CODE=dr
SMSPOOL_SERVICE_CODE=dr
```

## Recommended Countries

The recommended country list is loaded from `data/recommended-country-paths.txt`.

Each non-comment line uses:

```txt
ISO2 PATH
```

`PATH` values:

- `0` means register path.
- `1` means bind path.

Example:

```txt
GB 1
PH 0
```

The frontend displays business labels only and does not expose the raw file path.

## API

```http
GET /api/meta
GET /api/compare?mode=register|bind|recommended&country=US&provider=smsbower&status=in_stock&sort=price_asc
POST /api/refresh
```

`POST /api/refresh` requires one of:

```http
x-admin-refresh-token: your-token
Authorization: Bearer your-token
```

## VPS Deployment Notes

Recommended setup:

- Run the Node process with `pm2` or `systemd`.
- Put Nginx in front of the Node server.
- Enable HTTPS.
- Store `.env` and the SQLite database outside disposable deployment directories.
- Keep `EXPOSE_PROVIDER_ERRORS=false` on public deployments.
- Set a strong `ADMIN_REFRESH_TOKEN`.

Example PM2 command:

```bash
pm2 start src/server.js --name smsbazaar
pm2 save
```

Example Nginx reverse proxy:

```nginx
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## License

MIT
