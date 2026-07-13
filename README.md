# EmergencyMidas

Strumento di backup per le officine Midas Italia in caso di outage del
gestionale del punto vendita. Login con Google (Supabase Auth), consultazione
del calendario appuntamenti dell'officina collegata all'utente.

Backend: Supabase (progetto **MidasStore**, condiviso con altre app — non
sono state fatte modifiche allo schema oltre a una singola policy RLS di
sola lettura su `util_shop_appointments`).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase Auth (Google OAuth) + Postgres/RLS
- Deploy: Vercel

## 1. Pubblicare su GitHub

```bash
cd emergencymidas
git remote add origin https://github.com/<tuo-account>/EmergencyMidas.git
git branch -M main
git push -u origin main
```

(Il repo è già inizializzato con un primo commit.)

## 2. Pubblicare su Vercel

- Importa il repo `EmergencyMidas` da GitHub in Vercel (New Project → Import
  Git Repository).
- Framework: Next.js (rilevato automaticamente). Nessuna variabile
  d'ambiente è necessaria: URL e chiave pubblica Supabase sono in
  `lib/supabase/config.ts` (sono valori pubblici per design, protetti da
  Row Level Security lato database — non sono segreti).
- Deploy.

## 3. Configurare l'URL di redirect in Supabase

In Supabase → Authentication → URL Configuration, aggiungi l'URL del
deploy Vercel (e l'eventuale dominio custom) sia come **Site URL** sia tra
i **Redirect URLs**, nella forma:

```
https://<tuo-dominio-vercel>/auth/callback
```

Se il provider Google OAuth non è già abilitato nel progetto Supabase
(dovrebbe già esserlo, condiviso con altre app Midas), va attivato in
Authentication → Providers → Google, con Client ID/Secret dalla Google
Cloud Console, aggiungendo l'URL di callback Supabase
(`https://ivxjhqmqzzyknlxunevx.supabase.co/auth/v1/callback`) tra gli
Authorized redirect URIs del progetto Google.

## Come funziona l'accesso

- Al primo login, un trigger già presente sul database
  (`handle_new_auth_user`) collega automaticamente l'utente Google alla
  riga `customers` il cui campo `Mail` corrisponde all'email Google usata.
- Se l'email non corrisponde a nessun punto vendita e non è in
  `admin_emails`, l'utente vede la pagina "Nessuna officina collegata".
- Gli utenti admin (email in `admin_emails`) vedono un selettore per
  scegliere quale officina consultare.

## Struttura

```
app/
  login/              pagina di login Google
  auth/callback/       scambio codice OAuth → sessione
  dashboard/
    layout.tsx          header + tab (Calendario attivo, altri "presto")
    calendario/         consultazione appuntamenti settimana per settimana
  access-denied/        utente autenticato ma senza officina collegata
lib/
  supabase/              client browser/server + refresh sessione (middleware)
  dates.ts               utility date/settimane in timezone Europe/Rome
  types.ts               tipi condivisi
```

## Prossimi passi previsti

- Tab "Preventivi" (creazione preventivi)
- Tab "Distinte lavori" (distinte lavori eseguiti)
- Eventuale scrittura/modifica appuntamenti (oggi la consultazione è in
  sola lettura)
