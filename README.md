# Proxmox Booking HT26

Starter-repo för DV1677 JavaScript-baserade webbramverk HT26.

Ett alternativt projekt – ett server-renderat bokningssystem för resurser
(t.ex. virtuella maskiner i Proxmox), byggt med Express och SQLite. Under
kursens gång byggs det om/refaktoreras.

# dv1677-ht26-grupp6-backend

## Gruppmedlemmar

| Namn | GitHub |
|------|--------|
| Johanna Johansson | @jojjan-johansson |
| Rebecka Corell | @beckabeckis |

## Projektval

Vi har valt  **bokningssystem**

Motivering:

Vi valde projektet bokningssystem för det verkade som ett intressant projekt och något som kan komma
till nytta att kunna i framtida yrken.

## Teknikval

**Frontend-ramverk:** React

Motivering:

Vi valde React dels för att vi båda har jobbat i det innan men också för att det är 
väldigt vanligt. Vi tror att det är det ramverket vi kommer att ha mest nytta av i framtiden.

## Kör lokalt

```bash
git clone git@github.com:beckabeckis/dv1677-ht26-grupp6-backend.git
cd dv1677-ht26-grupp6-backend
cp .env.example .env
npm install
npm start
```

Öppna sedan `http://localhost:3000`


## Tillvägagångssätt

Dokumentera löpande vad ni gjort och hur ni löst problem.

- Vecka 1-2: 
Diskuterat och bestämt vilket projekt och vilket ramverk vi kommer jobba med i kursen.
Vi har haft tre möten där vi har diskuterat uppgiften, t.ex. hur vi skulle göra PUT-route då det inte var så tydligt i 
instruktionerna hur man skulle lösa den delen. Vi mailade läraren om hjälp och löste sedan uppgiften.

- Vecka 3:

Vi jobbade med databasen, migrerade från SQLite till MongoDB.
Skapade seed.js fil som byggde upp databasen med data.
Tog bort alla vyer och skrev om app.js till att endast hantera ett JSON api.

- Vecka 4:

Kopplade oss till VPS med SSH-nycklar.
Skrev git workflow filerna ci.yml och deploy.yml och driftsatte projektet i github.

- Vecka 5:

Utökade dokumenten i MongoDB och la till fler routes.
Installerade Vite och Supertest och skrev om app.js och la till server.js så att testerna skulle fungera.
Skrev tester till tre routes; GET, POST och DELETE resources.


## Krav

> **OBS: Kräver Node.js 22.23 eller högre.**
> `better-sqlite3` använder nativa binärer kompilerade för en specifik Node-version — äldre 22.x (t.ex. 22.11) ger `Segmentation fault` vid start.
>
> Uppgradera med nvm:
> ```bash
> nvm install 22.23
> nvm use 22.23
> ```


## Env-variabler

`PORT` - porten som Express lyssnar på -> `3000`

## Teknikstack

- [Node](https://nodejs.org)
- [Express](https://expressjs.com)
- [SQLite](https://www.sqlite.org) (byts ut mot MongoDB)
- [EJS](https://ejs.co) (byts ut mot frontend-ramverk)

## MongoDB Datamodell

![image](public/datamodell_resourcebooking_v1.drawio.png)


