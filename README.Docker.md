# AI Study Hub Docker

Docker Compose runs the API. The API is built in production mode from TypeScript to `dist` and runs with `npm start`.

## Run locally

1. Edit your `.env` file to ensure the correct secrets and MongoDB Atlas credentials are set:

```env
JWT_PRIVATE_KEY=your-secret
PASSWORD_SECRET=your-secret
DB_USERNAME=your-atlas-username
DB_PASSWORD=your-atlas-password
DB_NAME=aiStudyHubDb
```

2. Start the stack:

```bash
docker compose up -d --build
```

The API is available at `http://localhost:5284` and Swagger is available at `http://localhost:5284/api-docs`.

## Services

- `server`: Express API, built from `Dockerfile`, exposed on host port `5284`.
- `uploads-data`: named volume for uploaded avatars and documents.

## Email OTP

Gmail SMTP is optional. If `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is empty, the app logs OTP email content in server logs for development.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM="AI Study Hub <your_gmail@gmail.com>"
```

## Useful commands

```bash
docker compose config --quiet
docker compose ps
docker compose logs -f server
docker compose down
```

Use `docker compose down -v` only when you intentionally want to delete uploaded files.
