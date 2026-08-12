# databricks-prep

Practice test app to prepare for the Databricks certification exam

## Layout

```
databricks-prep/
├── docker/       Dockerfile and compose files
└── next-app/     the Next.js application (standard create-next-app packaging)
```

## Running locally

```bash
cd next-app
npm install
npm run dev          # http://localhost:3000
```

Other scripts, all from `next-app/`: `npm run build`, `npm start`, `npm test`,
`npm run typecheck`, `npm run lint`.

## Running with Docker

From the `docker/` directory:

```bash
cd docker

docker compose up --build                          # dev server, hot reload
docker compose down

docker compose -f compose.prod.yaml up --build     # production standalone build
docker compose -f compose.prod.yaml down
```

Both stacks come from one multi-stage [`docker/Dockerfile`](docker/Dockerfile) —
`--target dev` for the dev server, `--target runner` for a minimal non-root
production image. The build context is `next-app/`, so `.dockerignore` lives
there alongside the app.

Override the host port with `PORT=4000 docker compose up`.

> Next.js recommends plain `npm run dev` over Docker for day-to-day development on
> macOS and Windows, since containerized filesystem access can slow hot reload. The
> dev container is here for parity checks and for Linux hosts.
