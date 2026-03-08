# 💰 My Finance - Lično Finansijsko Praćenje

Moderna web aplikacija za praćenje ličnih finansija sa liquid glass dizajnom.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Sadržaj

1. [Pregled](#-pregled)
2. [Funkcionalnosti](#-funkcionalnosti)
3. [Instalacija](#-instalacija)
4. [Korišćenje](#-korišćenje)
5. [Tehnologije](#-tehnologije)
6. [Arhitektura](#-arhitektura)
7. [API](#-api)
8. [Sigurnost](#-sigurnost)
9. [FAQ](#-faq)

---

## 🎯 Pregled

**My Finance** je single-page aplikacija (SPA) kreirana u vanilla JavaScript-u bez korišćenja frameworka. Omogućava kompletno praćenje ličnih finansija sa podrškom za:

- 💼 Praćenje zarade po mesecima
- 💳 Tekući račun/karticu
- 💶 Kućnu gotovinu u EUR
- 💵 Kućnu gotovinu u RSD
- 🏦 Oročene depozite sa kalkulacijom kamata
- 💎 Ukupno bogatstvo u realnom vremenu

---

## ✨ Funkcionalnosti

### 1️⃣ Dashboard
- **Pregled ukupnog bogatstva** u jednom mestu
- Vizuelni prikaz svih finansijskih kategorija
- Godišnji pregled zarade
- Real-time ažuriranje svih podataka
- Grafički prikazi distribuci bogatstva

### 2️⃣ Plata/Zarada
- Dodavanje prihoda po mesecima
- Filtriranje po godini i mesecu
- CRUD operacije (Create, Read, Delete)
- Statistika zarade kroz godine
- Grafički pregled mesečnog trenda

### 3️⃣ Kartica/Račun (RSD)
- Praćenje primanja (plata)
- Evidencija troškova
- Trenutno stanje računa
- Kompletna istorija transakcija

### 4️⃣ Kućna Gotovina (EUR & RSD)
- **EUR gotovina** - Dodavanje i oduzimanje
- **RSD gotovina** - Dodavanje i oduzimanje
- Automatska konverzija EUR u RSD za statistiku
- Odvojene istorije za obe valute
- Real-time kurs valute

### 5️⃣ Oročeni Depoziti
- Kreiranje depozita sa različitim trajanjima
- Prosta i složena kamata
- Tačan obračun zarade
- Prikaz datuma isteka

### 6️⃣ Podešavanja
- **Export podataka** u JSON format
- **Import podataka** iz JSON-a
- Ručno osvežavanje kursa
- Reset svih podataka

---

## 🚀 Instalacija

### Preduslovi
- Web pretraživač (Chrome, Firefox, Edge, Safari)
- Aktivna internet konekcija (za kurs valute)

### Koraci

1. **Preuzmite fajlove:**
```bash
git clone https://github.com/username/my-finance.git
cd my-finance
```

2. **Otvorite aplikaciju:**
- Dvostruki klik na `index.html`
- Ili: drag-and-drop u pretraživač

3. **Gotovo!** Aplikacija je spremna za korišćenje.

---

## 📖 Korišćenje

### Početak rada

1. **Prva poseta:**
   - Aplikacija će automatski preuzeti trenutni EUR/RSD kurs
   - Svi podaci se čuvaju lokalno u pretraživaču
   - Nema potrebe za registracijom

2. **Dodavanje podataka:**
   - Koristite navigacioni meni za prelazak između sekcija
   - Popunite forme sa tačnim podacima
   - Kliknite "Dodaj" za čuvanje

3. **Pregled statistika:**
   - Dashboard prikazuje sve ukupne vrednosti
   - Godišnji pregled pokazuje trendove

### Primeri korišćenja

#### Dodavanje plate
```
Sekcija: Kartica/Račun
Opis: Plata za Januar 2024
Tip: Primanje (Plata)
Iznos: 85000 RSD
```

#### Dodavanje troška
```
Sekcija: Mesečni Unosi
Godina: 2024
Mesec: Januar
Opis: Kirija
Tip: Trošak
Iznos: 25000 RSD
```

#### Kreiranje depozita
```
Sekcija: Oročena Štednja
Iznos: 100000 RSD
Trajanje: 12 meseci
Tip Kamata: Složena kamata
Godišnja Kamata: 5.5%
Datum Početka: 01.01.2024
```

---

## 🛠️ Tehnologije

### Frontend
- **HTML5** - Semantička struktura
- **CSS3** - Glassmorphism dizajn
- **JavaScript (ES6+)** - Logika aplikacije

### Biblioteke i API-ji
- **Fetch API** - HTTP zahtevi
- **LocalStorage API** - Perzistencija podataka
- **Intl.NumberFormat** - Formatiranje valuta
- **ExchangeRate API** - EUR/RSD kurs

### Stilovi
- **Glassmorphism** - Moderni liquid glass efekat
- **CSS Grid & Flexbox** - Responsive layout
- **CSS Variables** - Dinamičke boje
- **CSS Animations** - Smooth transitions

---

## 🏗️ Arhitektura

### Struktura projekta

```
Finansije/
│
├── index.html          # Glavna HTML stranica
├── style.css           # Stilovi (glassmorphism)
├── script.js           # JavaScript logika
└── README.md           # Dokumentacija
```

### Moduli (script.js)

```javascript
1. AppState           // Centralizovano stanje
2. APIService         // Komunikacija sa API-jem
3. StorageService     // localStorage operacije
4. FinanceModule      // Finansijske operacije
5. Calculator         // Matematički obračuni
6. UIController       // Prikaz i navigacija
```

### Data Flow

```
User Input → FinanceModule → AppState → StorageService → localStorage
                    ↓
              Calculator → UIController → DOM Update
```

### State Management

```javascript
AppState = {
    exchangeRate: 117,           // Trenutni kurs
    lastRateUpdate: null,        // Vreme ažuriranja
    monthlyEntries: [],          // Mesečni unosi
    cardTransactions: [],        // Transakcije kartice
    cashHistory: [],             // Istorija gotovine
    termDeposits: [],            // Depoziti
    currentSection: 'dashboard'  // Aktivna sekcija
}
```

---

## 🌐 API

### Exchange Rate API

**Endpoint:**
```
https://api.exchangerate.host/latest?base=EUR&symbols=RSD
```

**Response:**
```json
{
  "rates": {
    "RSD": 117.23
  },
  "base": "EUR",
  "date": "2024-01-15"
}
```

**Fallback:**
- Ako API nije dostupan, koristi se kurs: **117 RSD**
- Upozorenje se prikazuje korisniku

---

## 🔐 Sigurnost

### Čuvanje podataka

- **Lokalno:** Svi podaci se čuvaju u `localStorage`
- **Privatan:** Nema slanja podataka na server
- **Bezbedno:** Podaci ostaju u pretraživaču

### Backup

```javascript
// Redovno pravite backup
1. Idite na "⚙️ Podešavanja"
2. Kliknite "📥 Export Data"
3. Čuvajte JSON fajl na sigurnom mestu
```

### Import

```javascript
// Vraćanje podataka iz backup-a
1. Idite na "⚙️ Podešavanja"
2. Kliknite "📤 Import Data"
3. Izaberite JSON fajl
4. Podaci će biti vraćeni
```

---

## 📊 Kalkulacije

### Prosta Kamata

```
A = P × (1 + r × t)

Gde je:
A = Krajnji iznos
P = Glavnica
r = Godišnja kamata (decimalni oblik)
t = Vreme (godine)
```

**Primer:**
```
Glavnica: 100,000 RSD
Kamata: 5% godišnje
Period: 12 meseci (1 godina)

A = 100,000 × (1 + 0.05 × 1)
A = 100,000 × 1.05
A = 105,000 RSD

Zarada: 5,000 RSD
```

### Složena Kamata (mesečno)

```
A = P × (1 + r/12)^n

Gde je:
A = Krajnji iznos
P = Glavnica
r = Godišnja kamata (decimalni oblik)
n = Broj meseci
```

**Primer:**
```
Glavnica: 100,000 RSD
Kamata: 5% godišnje
Period: 12 meseci

A = 100,000 × (1 + 0.05/12)^12
A = 100,000 × (1.004167)^12
A = 100,000 × 1.05116
A = 105,116 RSD

Zarada: 5,116 RSD
```

---

## 💡 FAQ

### Česta pitanja

**Q: Da li mi je potreban nalog?**
A: Ne, aplikacija radi potpuno lokalno u vašem pretraživaču.

**Q: Šta ako obrišem istoriju pretraživača?**
A: Podaci će biti izgubljeni. Redovno pravite backup!

**Q: Da li mogu koristiti aplikaciju offline?**
A: Da, ali kurs valute neće biti ažuriran.

**Q: Kako resetovati sve podatke?**
A: Podešavanja → "🗑️ Obriši Sve Podatke"

**Q: Da li mogu exportovati podatke u Excel?**
A: Trenutno samo JSON format. Excel support dolazi uskoro.

**Q: Koliko podataka mogu čuvati?**
A: localStorage limit je ~5-10MB (hiljade unosa).

---

## 🔄 Budućnost

### Planirane funkcionalnosti

- [ ] Excel/CSV export
- [ ] Grafički prikazi (charts)
- [ ] Mesečni budžet planer
- [ ] Multi-currency support
- [ ] Dark/Light theme toggle
- [ ] Backend integracija
- [ ] Mobile aplikacija
- [ ] Email izveštaji

---

## 📝 Licenca

MIT License

Copyright (c) 2025 My Finance

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...

---

## 👨‍💻 Autor

**Claude (Anthropic)**
- Kreirao: 2025
- Za: Mladen

---

## 🤝 Doprinos

Pronašli ste bug ili imate ideju?
1. Otvorite issue na GitHub-u
2. Pošaljite pull request
3. Kontaktirajte developera

---

## 📞 Kontakt

Za pitanja i podršku:
- Email: support@myfinance.app
- GitHub: github.com/username/my-finance
- Discord: MyFinance Community

---

## ⭐ Podrška

Ako vam se aplikacija dopada:
- ⭐ Star na GitHub-u
- 📢 Podelite sa prijateljima
- 💬 Ostavite feedback

---

**Made with ❤️ using Vanilla JavaScript**

_Verzija 1.0.0 - Januar 2024_
