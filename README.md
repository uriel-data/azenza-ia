# Azenza IA

App gratuita de [Azenza](https://azenza.com.ar) para que emprendedores construyan las bases de su negocio, paso a
paso y sin jerga. Vive en `https://ia.azenza.com.ar`.

- **Frontend:** React 19 + Vite + React Router (SPA).
- **API:** una Netlify Function (`/api/*`) en el mismo sitio.
- **Base:** Postgres en Neon (plan gratuito).
- **IA:** Gemini API (plan gratuito), solo para el Consultor.

```bash
npm install
npm run dev     # http://localhost:5174
npm test
```

- Cómo se trabaja en el repo: [`CLAUDE.md`](CLAUDE.md).
- Cómo se publica: [`docs/DEPLOY.md`](docs/DEPLOY.md).
