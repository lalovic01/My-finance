/**
 * MY FINANCE - Lično Finansijsko Praćenje
 * 
 * ARHITEKTURA:
 * 1. State Management - Centralizovano stanje aplikacije
 * 2. API Service - Komunikacija sa spoljnim API-jevima (kurs)
 * 3. Storage Service - localStorage CRUD operacije
 * 4. Finance Modules - Moduli za različite finansijske operacije
 * 5. Calculator - Matematički obračuni (kamata, suma, konverzija)
 * 6. UI Controller - Prikaz podataka i navigacija
 * 
 * KORIŠĆENJE:
 * - Navigacija između sekcija klikom na dugmiće u navbaru
 * - Svi podaci se čuvaju lokalno u localStorage
 * - Export/Import za backup podataka
 * - Automatsko osvežavanje prikaza posle svake akcije
 */

// ========================================
// STATE MANAGEMENT
// ========================================

const AppState = {
    exchangeRate: 117, // Fallback kurs
    lastRateUpdate: null,
    monthlyEntries: [],
    cardTransactions: [],
    cashHistory: [],
    termDeposits: [],
    currentSection: 'dashboard'
};

// ========================================
// API SERVICE - Pribavljanje kursa
// ========================================

const APIService = {
    /**
     * Pribavlja trenutni EUR/RSD kurs sa javnog API-ja
     * Fallback na 117 RSD ako API ne radi
     */
    async fetchExchangeRate() {
        try {
            const response = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=RSD');
            const data = await response.json();
            
            if (data.rates && data.rates.RSD) {
                AppState.exchangeRate = data.rates.RSD;
                AppState.lastRateUpdate = new Date().toISOString();
                console.log('✅ Kurs uspešno preuzet:', AppState.exchangeRate);
                return AppState.exchangeRate;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.warn('⚠️ Greška pri preuzimanju kursa, koristi se fallback 117 RSD:', error);
            AppState.exchangeRate = 117;
            AppState.lastRateUpdate = new Date().toISOString();
            return 117;
        }
    }
};

// ========================================
// STORAGE SERVICE - localStorage operacije
// ========================================

const StorageService = {
    STORAGE_KEY: 'financeApp_data',
    
    /**
     * Učitava sve podatke iz localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                AppState.monthlyEntries = data.monthlyEntries || [];
                AppState.cardTransactions = data.cardTransactions || [];
                AppState.cashHistory = data.cashHistory || [];
                AppState.termDeposits = data.termDeposits || [];
                AppState.exchangeRate = data.exchangeRate || 117;
                AppState.lastRateUpdate = data.lastRateUpdate || null;
                console.log('✅ Podaci učitani iz localStorage');
            }
        } catch (error) {
            console.error('❌ Greška pri učitavanju podataka:', error);
        }
    },
    
    /**
     * Čuva sve podatke u localStorage
     */
    saveState() {
        try {
            const data = {
                monthlyEntries: AppState.monthlyEntries,
                cardTransactions: AppState.cardTransactions,
                cashHistory: AppState.cashHistory,
                termDeposits: AppState.termDeposits,
                exchangeRate: AppState.exchangeRate,
                lastRateUpdate: AppState.lastRateUpdate
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('✅ Podaci sačuvani u localStorage');
        } catch (error) {
            console.error('❌ Greška pri čuvanju podataka:', error);
        }
    },
    
    /**
     * Exportuje podatke u JSON fajl
     */
    exportData() {
        const data = {
            monthlyEntries: AppState.monthlyEntries,
            cardTransactions: AppState.cardTransactions,
            cashHistory: AppState.cashHistory,
            termDeposits: AppState.termDeposits,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('✅ Podaci exportovani');
    },
    
    /**
     * Importuje podatke iz JSON fajla
     */
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                AppState.monthlyEntries = data.monthlyEntries || [];
                AppState.cardTransactions = data.cardTransactions || [];
                AppState.cashHistory = data.cashHistory || [];
                AppState.termDeposits = data.termDeposits || [];
                this.saveState();
                UIController.refresh();
                alert('✅ Podaci uspešno importovani!');
            } catch (error) {
                console.error('❌ Greška pri importovanju:', error);
                alert('❌ Greška pri čitanju fajla!');
            }
        };
        reader.readAsText(file);
    }
};

// ========================================
// FINANCE MODULES
// ========================================

const FinanceModule = {
    /**
     * Dodaje mesečni unos (prihod ili trošak)
     */
    addMonthlyEntry(year, month, description, type, amount) {
        const entry = {
            id: Date.now(),
            year: parseInt(year),
            month: parseInt(month),
            description,
            type, // 'income' ili 'expense'
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.monthlyEntries.push(entry);
        StorageService.saveState();
        console.log('✅ Dodat mesečni unos:', entry);
    },
    
    /**
     * Briše mesečni unos
     */
    deleteMonthlyEntry(id) {
        AppState.monthlyEntries = AppState.monthlyEntries.filter(e => e.id !== id);
        StorageService.saveState();
    },
    
    /**
     * Dodaje transakciju na kartici
     */
    addCardTransaction(description, type, amount) {
        const transaction = {
            id: Date.now(),
            description,
            type, // 'income' ili 'expense'
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.cardTransactions.push(transaction);
        StorageService.saveState();
        console.log('✅ Dodata transakcija na kartici:', transaction);
    },
    
    /**
     * Briše transakciju sa kartice
     */
    deleteCardTransaction(id) {
        AppState.cardTransactions = AppState.cardTransactions.filter(t => t.id !== id);
        StorageService.saveState();
    },
    
    /**
     * Dodaje promenu u kućnoj gotovini (EUR)
     */
    addCashChange(description, type, amount) {
        const change = {
            id: Date.now(),
            description,
            type, // 'add' ili 'subtract'
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.cashHistory.push(change);
        StorageService.saveState();
        console.log('✅ Dodata promena u gotovini:', change);
    },
    
    /**
     * Briše promenu u gotovini
     */
    deleteCashChange(id) {
        AppState.cashHistory = AppState.cashHistory.filter(c => c.id !== id);
        StorageService.saveState();
    },
    
    /**
     * Dodaje oročeni depozit
     */
    addTermDeposit(amount, duration, interestType, interestRate, startDate) {
        const deposit = {
            id: Date.now(),
            amount: parseFloat(amount),
            duration: parseInt(duration), // meseci
            interestType, // 'simple' ili 'compound'
            interestRate: parseFloat(interestRate),
            startDate,
            createdAt: new Date().toISOString()
        };
        AppState.termDeposits.push(deposit);
        StorageService.saveState();
        console.log('✅ Dodat oročeni depozit:', deposit);
    },
    
    /**
     * Briše oročeni depozit
     */
    deleteTermDeposit(id) {
        AppState.termDeposits = AppState.termDeposits.filter(d => d.id !== id);
        StorageService.saveState();
    }
};

// ========================================
// CALCULATOR - Finansijski obračuni
// ========================================

const Calculator = {
    /**
     * Izračunava ukupan saldo mesečnih unosa
     */
    calculateMonthlyBalance() {
        return AppState.monthlyEntries.reduce((total, entry) => {
            return entry.type === 'income' 
                ? total + entry.amount 
                : total - entry.amount;
        }, 0);
    },
    
    /**
     * Izračunava stanje kartice/računa
     */
    calculateCardBalance() {
        return AppState.cardTransactions.reduce((total, transaction) => {
            return transaction.type === 'income'
                ? total + transaction.amount
                : total - transaction.amount;
        }, 0);
    },
    
    /**
     * Izračunava ukupnu kućnu gotovinu u EUR
     */
    calculateCashBalance() {
        return AppState.cashHistory.reduce((total, change) => {
            return change.type === 'add'
                ? total + change.amount
                : total - change.amount;
        }, 0);
    },
    
    /**
     * Konvertuje EUR u RSD
     */
    convertEURtoRSD(amountEUR) {
        return amountEUR * AppState.exchangeRate;
    },
    
    /**
     * Izračunava vrednost oročenog depozita na kraju perioda
     * @param {number} principal - Glavnica
     * @param {number} rate - Godišnja kamatna stopa (%)
     * @param {number} months - Trajanje u mesecima
     * @param {string} type - 'simple' ili 'compound'
     */
    calculateTermDepositMaturity(principal, rate, months, type) {
        const r = rate / 100;
        
        if (type === 'simple') {
            // Prosta kamata: A = P * (1 + r * t)
            const years = months / 12;
            return principal * (1 + r * years);
        } else {
            // Složena kamata (mesečno): A = P * (1 + r/12)^(months)
            return principal * Math.pow(1 + r / 12, months);
        }
    },
    
    /**
     * Izračunava ukupnu vrednost svih depozita
     */
    calculateTotalDepositsValue() {
        return AppState.termDeposits.reduce((total, deposit) => {
            const maturityValue = this.calculateTermDepositMaturity(
                deposit.amount,
                deposit.interestRate,
                deposit.duration,
                deposit.interestType
            );
            return total + maturityValue;
        }, 0);
    },
    
    /**
     * Izračunava ukupno bogatstvo
     */
    calculateTotalWealth() {
        const monthlyRSD = this.calculateMonthlyBalance();
        const cardRSD = this.calculateCardBalance();
        const cashEUR = this.calculateCashBalance();
        const cashRSD = this.convertEURtoRSD(cashEUR);
        const depositsRSD = this.calculateTotalDepositsValue();
        
        return monthlyRSD + cardRSD + cashRSD + depositsRSD;
    },
    
    /**
     * Generiše godišnji pregled
     */
    generateYearlySummary() {
        const summary = {};
        
        AppState.monthlyEntries.forEach(entry => {
            if (!summary[entry.year]) {
                summary[entry.year] = { income: 0, expense: 0, balance: 0 };
            }
            
            if (entry.type === 'income') {
                summary[entry.year].income += entry.amount;
            } else {
                summary[entry.year].expense += entry.amount;
            }
        });
        
        // Izračunaj balans za svaku godinu
        Object.keys(summary).forEach(year => {
            summary[year].balance = summary[year].income - summary[year].expense;
        });
        
        return summary;
    }
};

// ========================================
// UI CONTROLLER
// ========================================

const UIController = {
    /**
     * Inicijalizuje UI i event listenere
     */
    init() {
        this.setupNavigation();
        this.setupForms();
        this.setupSettings();
        this.refresh();
        this.updateExchangeRateDisplay();
        
        // Postavi trenutnu godinu i mesec u formu
        const now = new Date();
        document.getElementById('monthlyYear').value = now.getFullYear();
        document.getElementById('monthlyMonth').value = now.getMonth() + 1;
        document.getElementById('depositStartDate').value = now.toISOString().split('T')[0];
    },
    
    /**
     * Postavlja navigaciju između sekcija
     */
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.showSection(section);
                
                // Update active state
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },
    
    /**
     * Prikazuje određenu sekciju
     */
    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        AppState.currentSection = sectionId;
        
        // Refresh data for specific section
        if (sectionId === 'dashboard') this.refreshDashboard();
        if (sectionId === 'monthly') this.refreshMonthlyEntries();
        if (sectionId === 'card') this.refreshCardTransactions();
        if (sectionId === 'cash') this.refreshCashHistory();
        if (sectionId === 'deposits') this.refreshDeposits();
    },
    
    /**
     * Postavlja event listenere za forme
     */
    setupForms() {
        // Mesečni unosi
        document.getElementById('monthlyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const year = document.getElementById('monthlyYear').value;
            const month = document.getElementById('monthlyMonth').value;
            const description = document.getElementById('monthlyDescription').value;
            const type = document.getElementById('monthlyType').value;
            const amount = document.getElementById('monthlyAmount').value;
            
            // Validacija
            if (parseFloat(amount) <= 0) {
                alert('⚠️ Iznos mora biti veći od 0!');
                return;
            }
            
            FinanceModule.addMonthlyEntry(year, month, description, type, amount);
            e.target.reset();
            const now = new Date();
            document.getElementById('monthlyYear').value = now.getFullYear();
            document.getElementById('monthlyMonth').value = now.getMonth() + 1;
            this.refresh();
            this.showNotification('✅ Unos uspešno dodat!', 'success');
        });
        
        // Kartica
        document.getElementById('cardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const description = document.getElementById('cardDescription').value;
            const type = document.getElementById('cardType').value;
            const amount = document.getElementById('cardAmount').value;
            
            // Validacija
            if (parseFloat(amount) <= 0) {
                alert('⚠️ Iznos mora biti veći od 0!');
                return;
            }
            
            FinanceModule.addCardTransaction(description, type, amount);
            e.target.reset();
            this.refresh();
            this.showNotification('✅ Transakcija uspešno dodata!', 'success');
        });
        
        // Gotovina
        document.getElementById('cashForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const description = document.getElementById('cashDescription').value;
            const type = document.getElementById('cashType').value;
            const amount = document.getElementById('cashAmount').value;
            
            // Validacija
            if (parseFloat(amount) <= 0) {
                alert('⚠️ Iznos mora biti veći od 0!');
                return;
            }
            
            FinanceModule.addCashChange(description, type, amount);
            e.target.reset();
            this.refresh();
            this.showNotification('✅ Promena uspešno sačuvana!', 'success');
        });
        
        // Depoziti
        document.getElementById('depositForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = document.getElementById('depositAmount').value;
            const duration = document.getElementById('depositDuration').value;
            const interestType = document.getElementById('depositInterestType').value;
            const interestRate = document.getElementById('depositInterestRate').value;
            const startDate = document.getElementById('depositStartDate').value;
            
            // Validacija
            if (parseFloat(amount) <= 0 || parseFloat(interestRate) <= 0) {
                alert('⚠️ Iznos i kamata moraju biti veći od 0!');
                return;
            }
            
            FinanceModule.addTermDeposit(amount, duration, interestType, interestRate, startDate);
            e.target.reset();
            document.getElementById('depositStartDate').value = new Date().toISOString().split('T')[0];
            this.refresh();
            this.showNotification('✅ Depozit uspešno dodat!', 'success');
        });
        
        // Filteri
        document.getElementById('filterYear').addEventListener('change', () => this.refreshMonthlyEntries());
        document.getElementById('filterMonth').addEventListener('change', () => this.refreshMonthlyEntries());
    },
    
    /**
     * Postavlja podešavanja
     */
    setupSettings() {
        // Refresh rate buttons
        document.getElementById('refreshRate').addEventListener('click', () => this.refreshExchangeRate());
        document.getElementById('manualRefreshRate').addEventListener('click', () => this.refreshExchangeRate());
        
        // Export/Import
        document.getElementById('exportData').addEventListener('click', () => StorageService.exportData());
        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                StorageService.importData(e.target.files[0]);
            }
        });
        
        // Reset data
        document.getElementById('resetData').addEventListener('click', () => {
            if (confirm('⚠️ Da li ste sigurni da želite da obrišete SVE podatke? Ova akcija je nepovratna!')) {
                localStorage.removeItem(StorageService.STORAGE_KEY);
                location.reload();
            }
        });
    },
    
    /**
     * Osvežava kurs
     */
    async refreshExchangeRate() {
        const rateDisplay = document.getElementById('rateValue');
        rateDisplay.textContent = 'Učitavanje...';
        rateDisplay.classList.add('loading');
        
        await APIService.fetchExchangeRate();
        StorageService.saveState();
        this.updateExchangeRateDisplay();
        this.refresh();
        
        rateDisplay.classList.remove('loading');
    },
    
    /**
     * Ažurira prikaz kursa
     */
    updateExchangeRateDisplay() {
        const rate = AppState.exchangeRate.toFixed(2);
        document.getElementById('rateValue').textContent = `1 EUR = ${rate} RSD`;
        document.getElementById('settingsRate').textContent = rate;
        
        if (AppState.lastRateUpdate) {
            const date = new Date(AppState.lastRateUpdate);
            document.getElementById('lastUpdate').textContent = date.toLocaleString('sr-RS');
        }
    },
    
    /**
     * Osvežava sve prikaze
     */
    refresh() {
        this.refreshDashboard();
        this.refreshMonthlyEntries();
        this.refreshCardTransactions();
        this.refreshCashHistory();
        this.refreshDeposits();
        this.populateYearFilter();
    },
    
    /**
     * Osvežava dashboard
     */
    refreshDashboard() {
        const monthlyRSD = Calculator.calculateMonthlyBalance();
        const cardRSD = Calculator.calculateCardBalance();
        const cashEUR = Calculator.calculateCashBalance();
        const cashRSD = Calculator.convertEURtoRSD(cashEUR);
        const depositsRSD = Calculator.calculateTotalDepositsValue();
        const totalWealth = Calculator.calculateTotalWealth();
        
        document.getElementById('totalMonthlyRSD').textContent = this.formatCurrency(monthlyRSD, 'RSD');
        document.getElementById('totalCardRSD').textContent = this.formatCurrency(cardRSD, 'RSD');
        document.getElementById('totalCashEUR').textContent = this.formatCurrency(cashEUR, 'EUR');
        document.getElementById('totalCashRSD').textContent = this.formatCurrency(cashRSD, 'RSD');
        document.getElementById('totalDepositsRSD').textContent = this.formatCurrency(depositsRSD, 'RSD');
        document.getElementById('activeDepositsCount').textContent = `${AppState.termDeposits.length} aktivnih`;
        document.getElementById('totalWealth').textContent = this.formatCurrency(totalWealth, 'RSD');
        
        // Godišnji pregled
        this.refreshYearlyOverview();
    },
    
    /**
     * Osvežava godišnji pregled
     */
    refreshYearlyOverview() {
        const summary = Calculator.generateYearlySummary();
        const container = document.getElementById('yearlyOverview');
        
        if (Object.keys(summary).length === 0) {
            container.innerHTML = '<p style="color: white;">Nema podataka za prikaz.</p>';
            return;
        }
        
        container.innerHTML = Object.keys(summary).sort().reverse().map(year => `
            <div class="year-summary">
                <h4>${year}</h4>
                <div class="year-stats">
                    <div class="year-stat">
                        <div class="year-stat-label">Prihodi</div>
                        <div class="year-stat-value" style="color: #10b981;">${this.formatCurrency(summary[year].income, 'RSD')}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Troškovi</div>
                        <div class="year-stat-value" style="color: #ef4444;">${this.formatCurrency(summary[year].expense, 'RSD')}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Balans</div>
                        <div class="year-stat-value">${this.formatCurrency(summary[year].balance, 'RSD')}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Osvežava mesečne unose
     */
    refreshMonthlyEntries() {
        const filterYear = document.getElementById('filterYear').value;
        const filterMonth = document.getElementById('filterMonth').value;
        
        let entries = [...AppState.monthlyEntries];
        
        if (filterYear) {
            entries = entries.filter(e => e.year == filterYear);
        }
        if (filterMonth) {
            entries = entries.filter(e => e.month == filterMonth);
        }
        
        entries.sort((a, b) => b.id - a.id);
        
        const container = document.getElementById('monthlyEntriesList');
        
        if (entries.length === 0) {
            container.innerHTML = '<p style="color: white;">Nema unosa.</p>';
            return;
        }
        
        container.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-description">${entry.description}</div>
                    <div class="entry-meta">${entry.year} - ${this.getMonthName(entry.month)}</div>
                </div>
                <div class="entry-amount ${entry.type}">${this.formatCurrency(entry.amount, 'RSD')}</div>
                <div class="entry-actions">
                    <button class="delete-btn" onclick="UIController.deleteMonthlyEntry(${entry.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Osvežava transakcije na kartici
     */
    refreshCardTransactions() {
        const balance = Calculator.calculateCardBalance();
        document.getElementById('cardBalance').textContent = this.formatCurrency(balance, 'RSD');
        
        const transactions = [...AppState.cardTransactions].sort((a, b) => b.id - a.id);
        const container = document.getElementById('cardTransactionsList');
        
        if (transactions.length === 0) {
            container.innerHTML = '<p style="color: white;">Nema transakcija.</p>';
            return;
        }
        
        container.innerHTML = transactions.map(t => `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-description">${t.description}</div>
                    <div class="entry-meta">${new Date(t.date).toLocaleString('sr-RS')}</div>
                </div>
                <div class="entry-amount ${t.type}">${this.formatCurrency(t.amount, 'RSD')}</div>
                <div class="entry-actions">
                    <button class="delete-btn" onclick="UIController.deleteCardTransaction(${t.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Osvežava istoriju gotovine
     */
    refreshCashHistory() {
        const balanceEUR = Calculator.calculateCashBalance();
        const balanceRSD = Calculator.convertEURtoRSD(balanceEUR);
        
        document.getElementById('cashBalance').textContent = this.formatCurrency(balanceEUR, 'EUR');
        document.getElementById('cashBalanceRSD').textContent = this.formatCurrency(balanceRSD, 'RSD');
        
        const history = [...AppState.cashHistory].sort((a, b) => b.id - a.id);
        const container = document.getElementById('cashHistoryList');
        
        if (history.length === 0) {
            container.innerHTML = '<p style="color: white;">Nema istorije.</p>';
            return;
        }
        
        container.innerHTML = history.map(h => `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-description">${h.description}</div>
                    <div class="entry-meta">${new Date(h.date).toLocaleString('sr-RS')}</div>
                </div>
                <div class="entry-amount ${h.type === 'add' ? 'income' : 'expense'}">${this.formatCurrency(h.amount, 'EUR')}</div>
                <div class="entry-actions">
                    <button class="delete-btn" onclick="UIController.deleteCashChange(${h.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Osvežava depozite
     */
    refreshDeposits() {
        const deposits = [...AppState.termDeposits].sort((a, b) => b.id - a.id);
        const container = document.getElementById('depositsList');
        
        if (deposits.length === 0) {
            container.innerHTML = '<p style="color: white;">Nema aktivnih depozita.</p>';
            return;
        }
        
        container.innerHTML = deposits.map(d => {
            const maturityValue = Calculator.calculateTermDepositMaturity(d.amount, d.interestRate, d.duration, d.interestType);
            const interest = maturityValue - d.amount;
            const maturityDate = new Date(d.startDate);
            maturityDate.setMonth(maturityDate.getMonth() + d.duration);
            
            return `
                <div class="deposit-card">
                    <div class="deposit-header">
                        <div class="deposit-amount">${this.formatCurrency(d.amount, 'RSD')}</div>
                        <div class="deposit-status">Aktivan</div>
                    </div>
                    <div class="deposit-details">
                        <div class="deposit-detail">
                            <div class="deposit-detail-label">Trajanje</div>
                            <div class="deposit-detail-value">${d.duration} meseci</div>
                        </div>
                        <div class="deposit-detail">
                            <div class="deposit-detail-label">Kamata</div>
                            <div class="deposit-detail-value">${d.interestRate}% (${d.interestType === 'simple' ? 'prosta' : 'složena'})</div>
                        </div>
                        <div class="deposit-detail">
                            <div class="deposit-detail-label">Početak</div>
                            <div class="deposit-detail-value">${new Date(d.startDate).toLocaleDateString('sr-RS')}</div>
                        </div>
                        <div class="deposit-detail">
                            <div class="deposit-detail-label">Istek</div>
                            <div class="deposit-detail-value">${maturityDate.toLocaleDateString('sr-RS')}</div>
                        </div>
                    </div>
                    <div class="deposit-maturity">
                        <strong>Iznos na isteku:</strong> ${this.formatCurrency(maturityValue, 'RSD')}<br>
                        <small>Zarada: ${this.formatCurrency(interest, 'RSD')}</small>
                    </div>
                    <div class="entry-actions">
                        <button class="delete-btn" onclick="UIController.deleteTermDeposit(${d.id})">🗑️ Obriši depozit</button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Popunjava filter za godine
     */
    populateYearFilter() {
        const years = [...new Set(AppState.monthlyEntries.map(e => e.year))].sort().reverse();
        const select = document.getElementById('filterYear');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Sve godine</option>' + 
            years.map(year => `<option value="${year}">${year}</option>`).join('');
        
        if (currentValue) select.value = currentValue;
    },
    
    /**
     * Formatira iznos novca
     */
    formatCurrency(amount, currency) {
        return new Intl.NumberFormat('sr-RS', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    /**
     * Vraća ime meseca
     */
    getMonthName(month) {
        const months = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
        return months[month - 1];
    },
    
    /**
     * Prikazuje notifikaciju
     */
    showNotification(message, type = 'info') {
        // Kreiraj notifikaciju ako ne postoji
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },
    
    // Delete funkcije koje se pozivaju iz HTML-a
    deleteMonthlyEntry(id) {
        if (confirm('Da li ste sigurni da želite da obrišete ovaj unos?')) {
            FinanceModule.deleteMonthlyEntry(id);
            this.refresh();
        }
    },
    
    deleteCardTransaction(id) {
        if (confirm('Da li ste sigurni da želite da obrišete ovu transakciju?')) {
            FinanceModule.deleteCardTransaction(id);
            this.refresh();
        }
    },
    
    deleteCashChange(id) {
        if (confirm('Da li ste sigurni da želite da obrišete ovu promenu?')) {
            FinanceModule.deleteCashChange(id);
            this.refresh();
        }
    },
    
    deleteTermDeposit(id) {
        if (confirm('Da li ste sigurni da želite da obrišete ovaj depozit?')) {
            FinanceModule.deleteTermDeposit(id);
            this.refresh();
        }
    }
};

// ========================================
// DEMO DATA - Za testiranje (opciono)
// ========================================

function loadDemoData() {
    // Mesečni unosi
    FinanceModule.addMonthlyEntry(2024, 1, 'Plata Januar', 'income', 80000);
    FinanceModule.addMonthlyEntry(2024, 1, 'Kirija', 'expense', 25000);
    FinanceModule.addMonthlyEntry(2024, 2, 'Plata Februar', 'income', 85000);
    
    // Kartica
    FinanceModule.addCardTransaction('Plata Februar', 'income', 85000);
    FinanceModule.addCardTransaction('Kupovina', 'expense', 15000);
    
    // Gotovina
    FinanceModule.addCashChange('Početno stanje', 'add', 500);
    FinanceModule.addCashChange('Zamena novca', 'subtract', 100);
    
    // Depozit
    FinanceModule.addTermDeposit(100000, 12, 'compound', 5.5, '2024-01-01');
    
    console.log('✅ Demo podaci učitani');
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 My Finance App Started');
    
    // Učitaj podatke iz localStorage
    StorageService.loadState();
    
    // Učitaj trenutni kurs
    await APIService.fetchExchangeRate();
    StorageService.saveState();
    
    // Inicijalizuj UI
    UIController.init();
    
    // Opciono: Učitaj demo podatke ako nema podataka
    // if (AppState.monthlyEntries.length === 0) {
    //     loadDemoData();
    //     UIController.refresh();
    // }
    
    console.log('✅ App Ready');
});
