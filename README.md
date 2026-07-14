# EmergencyMidas

Strumento di backup per le officine Midas Italia in caso di outage del
gestionale del punto vendita. Login con Google oppure email/password
(Supabase Auth), consultazione del calendario appuntamenti e creazione
preventivi dell'officina collegata all'utente.

Backend: Supabase (progetto **MidasStore**, condiviso con altre app). Le
modifiche allo schema introdotte da questa app sono limitate e additive:
- una policy RLS di sola lettura su `util_shop_appointments`;
- la tabella `util_shop_quotes` (preventivi) con relativa RLS e la funzione
  `create_quote` per la creazione (vedi "Modulo Preventivi").

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

## Modulo Preventivi

Permette all'officina di costruire un preventivo linea per linea, con
articoli di più tipi (colonna `item_type`):

- **forfait** — listino `util_forfait_fixed` (`price`);
- **pneumatico** — listino `util_prix_sale_tires` (`prix_vente`, testo);
- **ricambio** — listino `util_prix_sale_parts` (`pv`, double precision);
- **libero** — riga a testo libero: descrizione (`description`) e prezzo
  inseriti dall'utente (nessun codice; `forfait_code` nullo);
- **sconto** — riga di sconto: l'utente inserisce un importo positivo (es.
  `50`), la RPC lo salva come **negativo** (`unit_price = -abs(valore)`,
  quantità forzata a `1`). Trattato come un articolo qualunque ai fini del
  database (stessa tabella, stesso flusso), ma non annidabile né annidabile
  al suo interno; sottratto dall'imponibile prima del calcolo IVA.

### Prezzo di acquisto e margine

Ogni riga salva anche `purchase_price` (snapshot al momento del
salvataggio, come `unit_price`):

- **forfait** e **sconto** → sempre `0` (nessun costo diretto);
- **pneumatico** / **ricambio** → risolto server-side dai listini di
  acquisto (`util_prix_purchase_tires` / `util_prix_purchase_parts`):
  preferisce il distributore `MIDAS` se presente, altrimenti il **minimo**
  tra i distributori disponibili per quel codice (entrambe le tabelle hanno
  più righe per `reference`, una per `distributor`);
- **libero** → inserito manualmente dall'utente (campo opzionale, default
  `0`).

Nel modale, mentre si compone il preventivo, il margine è stimato anche
lato client (stessa logica MIDAS→minimo) per un'anteprima immediata; il
valore salvato è comunque quello ririsolto server-side al momento del
salvataggio, non quello inviato dal client.

Margine e tasso di margine sono mostrati **solo nel modale** (mai nella
stampa PDF): il margine conta il costo di **tutte** le righe, incluse
quelle annidate sotto un forfait (un ricambio incluso in un forfait ha
comunque un costo reale anche se il suo prezzo di vendita è barrato),
mentre il ricavo (imponibile) resta quello di sola prima riga, come per i
totali.

- La UI (`/dashboard/preventivi`) elenca i preventivi **una riga per
  preventivo** (veicolo, numero, data, totale) con un pulsante **Apri** che
  mostra il preventivo in un modale in **stile documento/PDF** (crea / vedi /
  modifica). Il modale ha un catalogo a tre schede (Forfait / Ricambi /
  Pneumatici): pneumatici e ricambi si cercano per token sulla descrizione
  (es. "michelin 205 55 16") **oppure** per codice (`reference`). Listini da
  ~48k e ~170k righe, con indici trigram su descrizione e `reference`.
- Le **quantità** possono essere frazionate (es. `5,5`).
- Modifica di un preventivo esistente via
  `update_quote(p_quote_id, p_vehicle_plate, p_lines)` (`SECURITY DEFINER`):
  verifica che il preventivo sia della propria officina (o admin), poi
  sostituisce le righe rileggendo i prezzi dai listini.
- **Annidamento**: pneumatici, ricambi e voci libere possono essere annidati
  in un **contenitore** (un forfait oppure una voce libera di primo livello,
  identificata dal suo codice) tramite `parent_forfait`. Gli articoli
  annidati mostrano il proprio prezzo **barrato** e non contano nel totale
  (fa fede il prezzo del contenitore); quelli sfusi sono prezzati
  singolarmente. Le voci libere hanno un codice (inserito o auto-generato
  `LIB-n`) proprio per poter fare da contenitore.
- Il salvataggio passa dalla funzione
  `create_quote(p_vehicle_plate, p_lines, p_shop_id)` (`SECURITY DEFINER`):
  genera `shop_id` e `quote_id` (`<shop_id>-DDMMYY-HHMMSS`, tz Europe/Rome),
  legge il prezzo **dal listino corretto per tipo** (non dal client) e
  valida che il `parent_forfait` sia un forfait di primo livello dello
  stesso preventivo. Le linee finiscono in `util_shop_quotes` (una riga per
  articolo, PK surrogata `id`).
- Lettura protetta da RLS come per gli appuntamenti:
  `(shop_id = get_customer_id()) OR is_admin()`. L'inserimento avviene solo
  tramite la RPC (nessuna INSERT diretta).
- Gli utenti officina creano sempre per la propria officina. Gli admin
  scelgono l'officina da un selettore e possono creare per quella (la RPC
  accetta `p_shop_id` solo se `is_admin()`; per gli altri è ignorato, così
  non è possibile falsificare lo `shop_id`).
- **Stampa/PDF**: ogni preventivo ha un link "Stampa PDF" verso una pagina
  dedicata (`/preventivi/<quote_id>/stampa`, fuori dal layout dashboard) con
  intestazione dati officina (incluso `MIDAS <User_ID> - <Town>`), righe
  (annidamento incluso) e totali imponibile / IVA (22% approssimato) /
  totale, più una nota che il documento è prodotto da EMidas, il software
  di backup, per indisponibilità temporanea del gestionale ufficiale. Usa la
  stampa del browser ("Salva come PDF"), senza dipendenze aggiuntive; la
  pagina imposta un titolo dedicato (`Preventivo <quote_id>`) al posto del
  titolo generale dell'app nell'intestazione di stampa del browser — l'URL
  in fondo è aggiunto dal browser stesso e va disattivato da lì
  ("Intestazioni e piè di pagina" nella finestra di stampa).

## Struttura

```
app/
  login/              pagina di login (Google + email/password)
  auth/callback/       scambio codice OAuth/recovery → sessione
  auth/update-password/ impostazione password dopo il link via email
  dashboard/
    layout.tsx          header giallo + sidebar moduli
    calendario/         consultazione appuntamenti settimana per settimana
    preventivi/         lista preventivi + modale creazione linea per linea
  access-denied/        utente autenticato ma senza officina collegata
  preventivi/[quoteId]/stampa/  vista PDF stampabile del preventivo
components/
  Sidebar.tsx            navigazione moduli a sinistra
  Logo.tsx               logo Midas (asset in public/midas-logo.png)
lib/
  supabase/              client browser/server + refresh sessione (middleware)
  dates.ts               utility date/settimane in timezone Europe/Rome
  money.ts               formattazione valuta (EUR/it-IT)
  types.ts               tipi condivisi
```

## Prossimi passi previsti

- Modulo "Distinte lavori" (distinte lavori eseguiti)
- Preventivi: stato (bozza/inviato), forfait a tempo
  (`util_forfait_timescale`) e ricambi oltre al forfait fisso
- Eventuale scrittura/modifica appuntamenti (oggi la consultazione è in
  sola lettura)
