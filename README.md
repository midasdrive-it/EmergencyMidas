# EmergencyMidas

Strumento di backup per le officine Midas Italia in caso di outage del
gestionale del punto vendita. Login con Google oppure email/password
(Supabase Auth), consultazione del calendario appuntamenti dell'officina
collegata all'utente.

Backend: Supabase (progetto **MidasStore**, condiviso con altre app — non
sono state fatte modifiche allo schema oltre a una singola policy RLS di
sola lettura su `util_shop_appointments`).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase Auth (Google OAuth + email/password) + Postgres/RLS
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

## 4. Abilitare l'accesso con email/password

L'accesso con email e password richiede che il provider **Email** sia
attivo nel progetto Supabase: Authentication → Providers → Email → attivo.
È un'impostazione a livello di progetto: essendo il Supabase condiviso con
altre app Midas, l'attivazione vale per tutte (non modifica né disattiva il
login Google, che continua a funzionare).

Poiché molti utenti esistono già con la sola identità Google (senza
password), l'app non offre una registrazione self-service. Chi vuole usare
email/password imposta la propria password dalla schermata di login →
"Password dimenticata? Impostala qui": riceve un'email con un link che
porta alla pagina `/auth/update-password`. Il flusso funziona anche per gli
utenti nati da Google e richiede che l'URL del deploy sia tra i **Redirect
URLs** di Supabase (già configurato al punto 3).

L'onboarding di un nuovo punto vendita resta come prima: primo accesso via
Google (il trigger `handle_new_auth_user` collega l'utente all'officina in
base alla mail) oppure utente creato dall'amministratore; da lì l'utente
può impostarsi una password col flusso qui sopra.

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
  login/              pagina di login (Google + email/password)
  auth/callback/       scambio codice OAuth/recovery → sessione
  auth/update-password/ impostazione password dopo il link via email
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
