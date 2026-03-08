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
    exchangeRate: 117,
    lastRateUpdate: null,
    salaryEntries: [],
    cardTransactions: [],
    cashHistoryEUR: [],
    cashHistoryRSD: [],
    termDeposits: [],
    currentSection: 'dashboard',
    lastSalaryEntry: null
};

// Predefinisane kategorije
const DEFAULT_CATEGORIES = [
    { id: 'food', name: '🍔 Hrana', type: 'expense', color: '#ef4444' },
    { id: 'transport', name: '🚗 Prevoz', type: 'expense', color: '#f97316' },
    { id: 'utilities', name: '💡 Računi', type: 'expense', color: '#eab308' },
    { id: 'entertainment', name: '🎬 Zabava', type: 'expense', color: '#8b5cf6' },
    { id: 'shopping', name: '🛍️ Kupovina', type: 'expense', color: '#ec4899' },
    { id: 'health', name: '⚕️ Zdravlje', type: 'expense', color: '#10b981' },
    { id: 'education', name: '📚 Edukacija', type: 'expense', color: '#3b82f6' },
    { id: 'other-expense', name: '📦 Ostalo', type: 'expense', color: '#6b7280' },
    { id: 'salary', name: '💼 Plata', type: 'income', color: '#10b981' },
    { id: 'bonus', name: '🎁 Bonus', type: 'income', color: '#14b8a6' },
    { id: 'freelance', name: '💻 Honorar', type: 'income', color: '#06b6d4' },
    { id: 'other-income', name: '💰 Ostali Prihod', type: 'income', color: '#84cc16' }
];

// ========================================
// API SERVICE - Pribavljanje kursa (ALTERNATIVA)
// ========================================

const APIService = {
    /**
     * Pribavlja trenutni EUR/RSD kurs
     * Pokušava više izvora ako prvi ne uspe
     */
    async fetchExchangeRate() {
        // Lista besplatnih API-ja
        const apiUrls = [
            // API 1: exchangerate-api.com (najpouzdaniji)
            {
                url: 'https://api.exchangerate-api.com/v4/latest/EUR',
                parse: (data) => data.rates.RSD
            },
            // API 2: frankfurter.app (Evropska centralna banka)
            {
                url: 'https://api.frankfurter.app/latest?from=EUR&to=RSD',
                parse: (data) => data.rates.RSD
            },
            // API 3: exchangerate.host (backup)
            {
                url: 'https://api.exchangerate.host/latest?base=EUR&symbols=RSD',
                parse: (data) => data.rates.RSD
            }
        ];
        
        // Pokušaj sa svakim API-jem redom
        for (const api of apiUrls) {
            try {
                console.log(`Pokušavam da preuzmem kurs sa: ${api.url}`);
                const response = await fetch(api.url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                const rate = api.parse(data);
                
                if (rate && rate > 0) {
                    AppState.exchangeRate = rate;
                    AppState.lastRateUpdate = new Date().toISOString();
                    console.log('✅ Kurs uspešno preuzet:', rate.toFixed(2), 'RSD');
                    return rate;
                }
            } catch (error) {
                console.warn(`⚠️ Greška sa API-jem ${api.url}:`, error.message);
                // Nastavi sa sledećim API-jem
            }
        }
        
        // Ako nijedan API ne radi, koristi fallback
        console.warn('⚠️ Svi API-ji nedostupni, koristi se fallback 117 RSD');
        AppState.exchangeRate = 117;
        AppState.lastRateUpdate = new Date().toISOString();
        
        // Prikaži upozorenje korisniku
        if (typeof UIController !== 'undefined' && UIController.showNotification) {
            UIController.showNotification('⚠️ Ne mogu da preuzmem trenutni kurs. Koristi se procenjeni kurs od 117 RSD.', 'warning');
        }
        
        return 117;
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
                // Backward compatibility
                AppState.salaryEntries = data.salaryEntries || data.monthlyEntries || [];
                if (data.monthlyEntries && !data.salaryEntries) {
                    AppState.salaryEntries = data.monthlyEntries.filter(e => e.type === 'income');
                }
                AppState.cardTransactions = data.cardTransactions || [];
                // Migracija stare cashHistory u EUR
                AppState.cashHistoryEUR = data.cashHistoryEUR || data.cashHistory || [];
                AppState.cashHistoryRSD = data.cashHistoryRSD || [];
                AppState.termDeposits = data.termDeposits || [];
                AppState.exchangeRate = data.exchangeRate || 117;
                AppState.lastRateUpdate = data.lastRateUpdate || null;
                AppState.lastSalaryEntry = data.lastSalaryEntry || null;
                console.log('✅ Podaci učitani iz localStorage');
            } else {
                // Inicijalizuj default kategorije
                AppState.categories = DEFAULT_CATEGORIES;
            }
        } catch (error) {
            console.error('❌ Greška pri učitavanju podataka:', error);
            AppState.categories = DEFAULT_CATEGORIES;
        }
    },
    
    /**
     * Čuva sve podatke u localStorage
     */
    saveState() {
        try {
            const data = {
                salaryEntries: AppState.salaryEntries,
                cardTransactions: AppState.cardTransactions,
                cashHistoryEUR: AppState.cashHistoryEUR,
                cashHistoryRSD: AppState.cashHistoryRSD,
                termDeposits: AppState.termDeposits,
                exchangeRate: AppState.exchangeRate,
                lastRateUpdate: AppState.lastRateUpdate,
                lastSalaryEntry: AppState.lastSalaryEntry
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
            salaryEntries: AppState.salaryEntries,
            cardTransactions: AppState.cardTransactions,
            cashHistoryEUR: AppState.cashHistoryEUR,
            cashHistoryRSD: AppState.cashHistoryRSD,
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
                AppState.salaryEntries = data.salaryEntries || data.monthlyEntries || [];
                AppState.cardTransactions = data.cardTransactions || [];
                AppState.cashHistoryEUR = data.cashHistoryEUR || data.cashHistory || [];
                AppState.cashHistoryRSD = data.cashHistoryRSD || [];
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
     * Dodaje unos zarade (samo prihod)
     */
    addSalaryEntry(year, month, description, amount) {
        const entry = {
            id: Date.now(),
            year: parseInt(year),
            month: parseInt(month),
            description,
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.salaryEntries.push(entry);
        
        // Sačuvaj posledji unos za brzo kopiranje
        AppState.lastSalaryEntry = {
            description,
            amount: parseFloat(amount)
        };
        
        StorageService.saveState();
        console.log('✅ Dodata zarada:', entry);
    },
    
    /**
     * Briše unos zarade
     */
    deleteSalaryEntry(id) {
        AppState.salaryEntries = AppState.salaryEntries.filter(e => e.id !== id);
        StorageService.saveState();
    },
    
    /**
     * Dodaje transakciju na kartici
     */
    addCardTransaction(description, type, amount, categoryId = null) {
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
     * Dodaje promenu u kućnoj gotovini EUR
     */
    addCashChangeEUR(description, type, amount) {
        const change = {
            id: Date.now(),
            description,
            type, // 'add' ili 'subtract'
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.cashHistoryEUR.push(change);
        StorageService.saveState();
        console.log('✅ Dodata promena u EUR gotovini:', change);
    },
    
    /**
     * Briše promenu u EUR gotovini
     */
    deleteCashChangeEUR(id) {
        AppState.cashHistoryEUR = AppState.cashHistoryEUR.filter(c => c.id !== id);
        StorageService.saveState();
    },
    
    /**
     * Dodaje promenu u kućnoj gotovini RSD
     */
    addCashChangeRSD(description, type, amount) {
        const change = {
            id: Date.now(),
            description,
            type, // 'add' ili 'subtract'
            amount: parseFloat(amount),
            date: new Date().toISOString()
        };
        AppState.cashHistoryRSD.push(change);
        StorageService.saveState();
        console.log('✅ Dodata promena u RSD gotovini:', change);
    },
    
    /**
     * Briše promenu u RSD gotovini
     */
    deleteCashChangeRSD(id) {
        AppState.cashHistoryRSD = AppState.cashHistoryRSD.filter(c => c.id !== id);
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
     * Izračunava ukupnu zaradu
     * NAPOMENA: Ovo se NE računa u ukupno bogatstvo, samo za statistiku!
     */
    calculateTotalSalary() {
        return AppState.salaryEntries.reduce((total, entry) => {
            return total + entry.amount;
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
    calculateCashBalanceEUR() {
        return AppState.cashHistoryEUR.reduce((total, change) => {
            return change.type === 'add'
                ? total + change.amount
                : total - change.amount;
        }, 0);
    },
    
    /**
     * Izračunava ukupnu kućnu gotovinu u RSD
     */
    calculateCashBalanceRSD() {
        return AppState.cashHistoryRSD.reduce((total, change) => {
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
        const r = rate / 100; // Godišnja kamatna stopa kao decimala
        const years = months / 12; // Vreme u godinama
        
        if (type === 'simple') {
            // Prosta kamata: A = P * (1 + r * t)
            // Za 534284 RSD, 4.10%, 3 meseca (0.25 godina):
            // A = 534284 * (1 + 0.041 * 0.25) = 534284 * 1.01025 = 539761.41
            return principal * (1 + r * years);
        } else {
            // Složena kamata sa godišnjom kapitalizacijom: A = P * (1 + r)^t
            // Za kratke periode (ispod godine), koristi prostu kamatu ili prilagođenu formulu
            // Za 534284 RSD, 4.10%, 3 meseca:
            // A = 534284 * (1 + 0.041)^0.25 = 534284 * 1.010157 = 539713.48
            return principal * Math.pow(1 + r, years);
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
     * VAŽNO: Mesečni unosi se NE uključuju, oni su samo za statistiku
     */
    calculateTotalWealth() {
        const cardRSD = this.calculateCardBalance();
        const cashEUR = this.calculateCashBalanceEUR();
        const cashRSD = this.calculateCashBalanceRSD();
        const cashEURtoRSD = this.convertEURtoRSD(cashEUR);
        const depositsRSD = this.calculateTotalDepositsValue();
        
        return cardRSD + cashEURtoRSD + cashRSD + depositsRSD;
    },
    
    /**
     * Generiše godišnji pregled zarade
     */
    generateYearlySummary() {
        const summary = {};
        
        AppState.salaryEntries.forEach(entry => {
            if (!summary[entry.year]) {
                summary[entry.year] = { total: 0, count: 0 };
            }
            summary[entry.year].total += entry.amount;
            summary[entry.year].count += 1;
        });
        
        return summary;
    },
    
    /**
     * Izračunava ukupan budžet i potrošnju za mesec
     */
    calculateMonthlyBudgetSummary(year, month) {
        const budgets = AppState.monthlyBudgets.filter(b => b.year === year && b.month === month);
        const spending = this.calculateCategorySpending(year, month);
        
        let totalBudget = 0;
        let totalSpent = 0;
        
        budgets.forEach(b => {
            totalBudget += b.amount;
            totalSpent += spending[b.categoryId] || 0;
        });
        
        return {
            totalBudget,
            totalSpent,
            totalRemaining: totalBudget - totalSpent,
            percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        };
    }
};

// ========================================
// ACCESSIBILITY SERVICE
// ========================================

const AccessibilityService = {
    /**
     * Announces message to screen readers
     */
    announce(message, priority = 'polite', section = 'dashboard') {
        const announcer = document.getElementById(`${section}Announcer`);
        if (announcer) {
            announcer.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    },
    
    /**
     * Manages focus after actions
     */
    manageFocus(element) {
        if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    
    /**
     * Sets up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + number keys for section navigation
            if (e.altKey && !e.shiftKey && !e.ctrlKey) {
                const shortcuts = {
                    '1': 'dashboard',
                    '2': 'salary',
                    '3': 'card',
                    '4': 'cash',
                    '5': 'deposits',
                    '6': 'settings'
                };
                
                const section = shortcuts[e.key];
                if (section) {
                    e.preventDefault();
                    UIController.showSection(section);
                    const navBtn = document.querySelector(`[data-section="${section}"]`);
                    if (navBtn) {
                        navBtn.focus();
                    }
                    this.announce(`Prešli ste na sekciju ${this.getSectionName(section)}`, 'assertive');
                }
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                const modal = document.getElementById('confirmModal');
                if (modal && modal.style.display !== 'none') {
                    modal.style.display = 'none';
                    this.announce('Modal zatvoren', 'polite');
                }
            }
        });
    },
    
    /**
     * Gets section name for announcements
     */
    getSectionName(section) {
        const names = {
            'dashboard': 'Dashboard',
            'salary': 'Plata i Zarada',
            'card': 'Kartica i Račun',
            'cash': 'Kućna Gotovina',
            'deposits': 'Oročena Štednja',
            'settings': 'Podešavanja'
        };
        return names[section] || section;
    },
    
    /**
     * Traps focus within modal
     */
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
        
        // Focus first element
        firstFocusable?.focus();
    },
    
    /**
     * Updates ARIA attributes for form validation
     */
    updateFormAria(inputId, isValid, errorMessage = '') {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(`${inputId}Error`);
        
        if (input) {
            input.setAttribute('aria-invalid', !isValid);
            
            if (errorSpan) {
                errorSpan.textContent = errorMessage;
                if (errorMessage) {
                    this.announce(`Greška u polju: ${errorMessage}`, 'assertive');
                }
            }
        }
    },
    
    /**
     * Updates sort button state
     */
    updateSortButtonAria(buttonId, isAscending) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.setAttribute('aria-pressed', 'true');
            const label = isAscending ? 'Sortirano rastuće' : 'Sortirano opadajuće';
            button.setAttribute('aria-label', `${label}. Kliknite da promenite redosled`);
        }
    }
};

// ========================================
// UI CONTROLLER
// ========================================

const UIController = {
    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupScrollEffects();
        this.setupForms();
        this.setupSettings();
        this.refresh();
        this.updateExchangeRateDisplay();
        
        // Initialize accessibility features
        AccessibilityService.setupKeyboardShortcuts();
        
        // Set up modal focus trap
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.addEventListener('show', () => {
                AccessibilityService.trapFocus(modal);
            });
        }
        
        setTimeout(() => {
            ChartModule.initCharts();
        }, 500);
        
        const now = new Date();
        document.getElementById('salaryYear').value = now.getFullYear();
        document.getElementById('salaryMonth').value = now.getMonth() + 1;
        document.getElementById('depositStartDate').value = now.toISOString().split('T')[0];
        
        // Announce app ready
        AccessibilityService.announce('Aplikacija je spremna za korišćenje', 'polite');
    },
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.showSection(section);
                
                // Update ARIA states
                document.querySelectorAll('.nav-btn').forEach(b => {
                    b.classList.remove('active');
                    b.removeAttribute('aria-current');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'page');
                
                // Announce section change
                AccessibilityService.announce(
                    `Prešli ste na sekciju ${AccessibilityService.getSectionName(section)}`,
                    'polite'
                );
                
                // Zatvori mobilni meni nakon izbora
                const navContainer = document.querySelector('.nav .container');
                if (navContainer.classList.contains('open')) {
                    navContainer.classList.remove('open');
                }
            });
        });
    },
    
    /**
     * Postavlja mobilni hamburger meni
     */
    setupMobileMenu() {
        // Kreiraj hamburger dugme ako ne postoji
        const nav = document.querySelector('.nav');
        const navContainer = nav.querySelector('.container');
        
        let toggleBtn = document.querySelector('.nav-toggle');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.className = 'nav-toggle';
            toggleBtn.innerHTML = '☰';
            toggleBtn.setAttribute('aria-label', 'Toggle navigation');
            nav.insertBefore(toggleBtn, navContainer);
        }
        
        toggleBtn.addEventListener('click', () => {
            navContainer.classList.toggle('open');
            toggleBtn.innerHTML = navContainer.classList.contains('open') ? '✕' : '☰';
        });
        
        // Zatvori meni kada se klikne van njega
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && navContainer.classList.contains('open')) {
                navContainer.classList.remove('open');
                toggleBtn.innerHTML = '☰';
            }
        });
    },
    
    /**
     * Postavlja scroll efekte za header i nav
     */
    setupScrollEffects() {
        let lastScroll = 0;
        const header = document.querySelector('.header');
        const nav = document.querySelector('.nav');
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Dodaj 'scrolled' klasu kada se skroluje
            if (currentScroll > 10) {
                header.classList.add('scrolled');
                nav.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
                nav.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    },
    
    /**
     * Prikazuje određenu sekciju
     */
    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        targetSection.classList.add('active');
        AppState.currentSection = sectionId;
        
        // Move focus to main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
        }
        
        if (sectionId === 'dashboard') this.refreshDashboard();
        if (sectionId === 'salary') this.refreshSalaryEntries();
        if (sectionId === 'card') this.refreshCardTransactions();
        if (sectionId === 'cash') this.refreshCashHistory();
        if (sectionId === 'deposits') this.refreshDeposits();
    },
    
    /**
     * Postavlja event listenere za forme
     */
    setupForms() {
        // Zarada
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            salaryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validation
                const year = document.getElementById('salaryYear').value;
                const month = document.getElementById('salaryMonth').value;
                const description = document.getElementById('salaryDescription').value;
                const amount = document.getElementById('salaryAmount').value;
                
                let isValid = true;
                
                if (!year || year < 2020 || year > 2100) {
                    AccessibilityService.updateFormAria('salaryYear', false, 'Godina mora biti između 2020 i 2100');
                    isValid = false;
                } else {
                    AccessibilityService.updateFormAria('salaryYear', true);
                }
                
                if (!description.trim()) {
                    AccessibilityService.updateFormAria('salaryDescription', false, 'Opis je obavezan');
                    isValid = false;
                } else {
                    AccessibilityService.updateFormAria('salaryDescription', true);
                }
                
                if (!amount || parseFloat(amount) <= 0) {
                    AccessibilityService.updateFormAria('salaryAmount', false, 'Iznos mora biti veći od 0');
                    isValid = false;
                } else {
                    AccessibilityService.updateFormAria('salaryAmount', true);
                }
                
                if (!isValid) {
                    AccessibilityService.announce('Molimo ispravite greške u formi', 'assertive', 'salary');
                    return;
                }
                
                FinanceModule.addSalaryEntry(year, month, description, amount);
                e.target.reset();
                const now = new Date();
                document.getElementById('salaryYear').value = now.getFullYear();
                document.getElementById('salaryMonth').value = now.getMonth() + 1;
                this.refresh();
                this.showNotification('✅ Zarada uspešno dodata!', 'success');
                
                // Announce to screen readers
                AccessibilityService.announce(
                    `Zarada od ${amount} dinara za ${this.getMonthName(month)} ${year} je uspešno dodata`,
                    'polite',
                    'salary'
                );
                
                // Focus back to first field
                document.getElementById('salaryYear').focus();
            });
        }
        
        // Dugme za kopiranje prošlog unosa
        const copyLastSalary = document.getElementById('copyLastSalary');
        if (copyLastSalary) {
            copyLastSalary.addEventListener('click', () => {
                if (AppState.lastSalaryEntry) {
                    document.getElementById('salaryDescription').value = AppState.lastSalaryEntry.description;
                    document.getElementById('salaryAmount').value = AppState.lastSalaryEntry.amount;
                    this.showNotification('✅ Podaci kopirani iz prošlog unosa!', 'info');
                } else {
                    alert('⚠️ Nema prethodnog unosa za kopiranje!');
                }
            });
        }
        
        // Kartica
        const cardForm = document.getElementById('cardForm');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const description = document.getElementById('cardDescription').value;
                const type = document.getElementById('cardType').value;
                const amount = document.getElementById('cardAmount').value;
                const categoryId = document.getElementById('cardCategory').value;
                
                // Validacija
                if (parseFloat(amount) <= 0) {
                    alert('⚠️ Iznos mora biti veći od 0!');
                    return;
                }
                
                FinanceModule.addCardTransaction(description, type, amount, categoryId || null);
                e.target.reset();
                this.refresh();
                this.showNotification('✅ Transakcija uspešno dodata!', 'success');
            });
        }
        
        // Gotovina EUR
        const cashFormEUR = document.getElementById('cashFormEUR');
        if (cashFormEUR) {
            cashFormEUR.addEventListener('submit', (e) => {
                e.preventDefault();
                const description = document.getElementById('cashDescriptionEUR').value;
                const type = document.getElementById('cashTypeEUR').value;
                const amount = document.getElementById('cashAmountEUR').value;
                
                if (parseFloat(amount) <= 0) {
                    alert('⚠️ Iznos mora biti veći od 0!');
                    return;
                }
                
                FinanceModule.addCashChangeEUR(description, type, amount);
                e.target.reset();
                this.refresh();
                this.showNotification('✅ Promena EUR gotovine uspešno sačuvana!', 'success');
            });
        }
        
        // Gotovina RSD
        const cashFormRSD = document.getElementById('cashFormRSD');
        if (cashFormRSD) {
            cashFormRSD.addEventListener('submit', (e) => {
                e.preventDefault();
                const description = document.getElementById('cashDescriptionRSD').value;
                const type = document.getElementById('cashTypeRSD').value;
                const amount = document.getElementById('cashAmountRSD').value;
                
                if (parseFloat(amount) <= 0) {
                    alert('⚠️ Iznos mora biti veći od 0!');
                    return;
                }
                
                FinanceModule.addCashChangeRSD(description, type, amount);
                e.target.reset();
                this.refresh();
                this.showNotification('✅ Promena RSD gotovine uspešno sačuvana!', 'success');
            });
        }
        
        // Depoziti
        const depositForm = document.getElementById('depositForm');
        if (depositForm) {
            depositForm.addEventListener('submit', (e) => {
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
        }
        
        // Filteri
        const filterYear = document.getElementById('filterYear');
        const filterMonth = document.getElementById('filterMonth');
        
        if (filterYear) {
            filterYear.addEventListener('change', () => this.refreshSalaryEntries());
        }
        
        if (filterMonth) {
            filterMonth.addEventListener('change', () => this.refreshSalaryEntries());
        }
        
        // Budget forma
        const budgetForm = document.getElementById('budgetForm');
        if (budgetForm) {
            budgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryId = document.getElementById('budgetCategory').value;
                const amount = document.getElementById('budgetAmount').value;
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1;
                
                if (!categoryId || parseFloat(amount) <= 0) {
                    alert('⚠️ Izaberite kategoriju i unesite ispravan iznos!');
                    return;
                }
                
                FinanceModule.addMonthlyBudget(categoryId, amount, year, month);
                e.target.reset();
                this.refresh();
                this.showNotification('✅ Budžet uspešno postavljen!', 'success');
            });
        }
        
        // Goals forma
        const goalsForm = document.getElementById('goalsForm');
        if (goalsForm) {
            goalsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('goalName').value;
                const targetAmount = document.getElementById('goalTarget').value;
                const currentAmount = document.getElementById('goalCurrent').value;
                const deadline = document.getElementById('goalDeadline').value;
                
                if (!name.trim() || parseFloat(targetAmount) <= 0) {
                    alert('⚠️ Unesite naziv i ciljni iznos!');
                    return;
                }
                
                FinanceModule.addSavingsGoal(name, targetAmount, currentAmount, deadline);
                e.target.reset();
                this.refresh();
                this.showNotification('✅ Cilj uspešno dodat!', 'success');
            });
        }
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
        this.refreshSalaryEntries();
        this.refreshCardTransactions();
        this.refreshCashHistory();
        this.refreshDeposits();
        this.populateYearFilter();
        
        // Osvežava grafikone
        if (typeof Chart !== 'undefined') {
            ChartModule.refreshCharts();
        }
    },
    
    /**
     * Osvežava dashboard
     */
    refreshDashboard() {
        const totalSalary = Calculator.calculateTotalSalary();
        const cardRSD = Calculator.calculateCardBalance();
        const cashEUR = Calculator.calculateCashBalanceEUR();
        const cashRSD = Calculator.calculateCashBalanceRSD();
        const cashEURtoRSD = Calculator.convertEURtoRSD(cashEUR);
        const depositsRSD = Calculator.calculateTotalDepositsValue();
        const totalWealth = Calculator.calculateTotalWealth();
        
        document.getElementById('totalSalaryRSD').textContent = this.formatCurrency(totalSalary, 'RSD');
        document.getElementById('totalCardRSD').textContent = this.formatCurrency(cardRSD, 'RSD');
        document.getElementById('totalCashEUR').textContent = this.formatCurrency(cashEUR, 'EUR');
        document.getElementById('totalCashRSD').textContent = this.formatCurrency(cashRSD, 'RSD');
        document.getElementById('totalCashEURtoRSD').textContent = this.formatCurrency(cashEURtoRSD, 'RSD');
        document.getElementById('totalDepositsRSD').textContent = this.formatCurrency(depositsRSD, 'RSD');
        document.getElementById('activeDepositsCount').textContent = `${AppState.termDeposits.length} aktivnih`;
        document.getElementById('totalWealth').textContent = this.formatCurrency(totalWealth, 'RSD');
        
        // Announce summary
        AccessibilityService.announce(
            `Ukupno bogatstvo: ${this.formatCurrency(totalWealth, 'RSD')}`,
            'polite'
        );
        
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
                <h4>Godina ${year}</h4>
                <div class="year-stats">
                    <div class="year-stat">
                        <div class="year-stat-label">Ukupna Zarada</div>
                        <div class="year-stat-value" style="color: #10b981;">${this.formatCurrency(summary[year].total, 'RSD')}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Broj Unosa</div>
                        <div class="year-stat-value">${summary[year].count}</div>
                    </div>
                    <div class="year-stat">
                        <div class="year-stat-label">Prosečno</div>
                        <div class="year-stat-value">${this.formatCurrency(summary[year].total / summary[year].count, 'RSD')}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Osvežava mesečne unose
     */
    refreshSalaryEntries() {
        const filterYear = document.getElementById('filterYear').value;
        const filterMonth = document.getElementById('filterMonth').value;
        
        let entries = [...AppState.salaryEntries];
        
        if (filterYear) {
            entries = entries.filter(e => e.year == filterYear);
        }
        if (filterMonth) {
            entries = entries.filter(e => e.month == filterMonth);
        }
        
        entries.sort((a, b) => b.id - a.id);
        
        const container = document.getElementById('salaryEntriesList');
        
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
                <div class="entry-amount income">${this.formatCurrency(entry.amount, 'RSD')}</div>
                <div class="entry-actions">
                    <button class="delete-btn" onclick="UIController.deleteSalaryEntry(${entry.id})">🗑️</button>
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
     * Osvežava istoriju gotovine EUR i RSD
     */
    refreshCashHistory() {
        const balanceEUR = Calculator.calculateCashBalanceEUR();
        const balanceRSD = Calculator.calculateCashBalanceRSD();
        const balanceEURtoRSD = Calculator.convertEURtoRSD(balanceEUR);
        
        document.getElementById('cashBalanceEUR').textContent = this.formatCurrency(balanceEUR, 'EUR');
        document.getElementById('cashBalanceEURtoRSD').textContent = this.formatCurrency(balanceEURtoRSD, 'RSD');
        document.getElementById('cashBalanceRSD').textContent = this.formatCurrency(balanceRSD, 'RSD');
        
        // EUR istorija
        const historyEUR = [...AppState.cashHistoryEUR].sort((a, b) => b.id - a.id);
        const containerEUR = document.getElementById('cashHistoryListEUR');
        
        if (historyEUR.length === 0) {
            containerEUR.innerHTML = '<p style="color: white;">Nema istorije EUR gotovine.</p>';
        } else {
            containerEUR.innerHTML = historyEUR.map(h => `
                <div class="entry-item">
                    <div class="entry-info">
                        <div class="entry-description">${h.description}</div>
                        <div class="entry-meta">${new Date(h.date).toLocaleString('sr-RS')}</div>
                    </div>
                    <div class="entry-amount ${h.type === 'add' ? 'income' : 'expense'}">${this.formatCurrency(h.amount, 'EUR')}</div>
                    <div class="entry-actions">
                        <button class="delete-btn" onclick="UIController.deleteCashChangeEUR(${h.id})">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
        
        // RSD istorija
        const historyRSD = [...AppState.cashHistoryRSD].sort((a, b) => b.id - a.id);
        const containerRSD = document.getElementById('cashHistoryListRSD');
        
        if (historyRSD.length === 0) {
            containerRSD.innerHTML = '<p style="color: white;">Nema istorije RSD gotovine.</p>';
        } else {
            containerRSD.innerHTML = historyRSD.map(h => `
                <div class="entry-item">
                    <div class="entry-info">
                        <div class="entry-description">${h.description}</div>
                        <div class="entry-meta">${new Date(h.date).toLocaleString('sr-RS')}</div>
                    </div>
                    <div class="entry-amount ${h.type === 'add' ? 'income' : 'expense'}">${this.formatCurrency(h.amount, 'RSD')}</div>
                    <div class="entry-actions">
                        <button class="delete-btn" onclick="UIController.deleteCashChangeRSD(${h.id})">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
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
        const years = [...new Set(AppState.salaryEntries.map(e => e.year))].sort().reverse();
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
    deleteSalaryEntry(id) {
        if (confirm('Da li ste sigurni da želite obrisati ovaj unos?')) {
            FinanceModule.deleteSalaryEntry(id);
            this.refresh();
        }
    },
    
    deleteCardTransaction(id) {
        if (confirm('Da li ste sigurni da želite obrisati ovu transakciju?')) {
            FinanceModule.deleteCardTransaction(id);
            this.refresh();
        }
    },
    
    deleteCashChangeEUR(id) {
        if (confirm('Da li ste sigurni da želite obrisati ovu promenu?')) {
            FinanceModule.deleteCashChangeEUR(id);
            this.refresh();
        }
    },
    
    deleteCashChangeRSD(id) {
        if (confirm('Da li ste sigurni da želite obrisati ovu promenu?')) {
            FinanceModule.deleteCashChangeRSD(id);
            this.refresh();
        }
    },
    
    deleteTermDeposit(id) {
        if (confirm('Da li ste sigurni da želite obrisati ovaj depozit?')) {
            FinanceModule.deleteTermDeposit(id);
            this.refresh();
        }
    },
    
    /**
     * Popunjava select-ove sa kategorijama
     */
    populateCategorySelects() {
        const categorySelects = {
            budgetCategory: 'expense',
            cardCategory: null // Oba tipa
        };
        
        Object.entries(categorySelects).forEach(([selectId, filterType]) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // Sačuvaj trenutnu selekciju
            const currentValue = select.value;
            
            // Očisti osim prve opcije
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Dodaj kategorije
            AppState.categories.forEach(cat => {
                if (!filterType || cat.type === filterType) {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    select.appendChild(option);
                }
            });
            
            // Vrati selekciju
            select.value = currentValue;
        });
    },
    
    /**
     * Osvežava pregled budžeta
     */
    refreshBudgetOverview() {
        const container = document.getElementById('budgetOverview');
        if (!container) return;
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const spending = Calculator.calculateCategorySpending(year, month);
        const budgets = AppState.monthlyBudgets.filter(b => b.year === year && b.month === month);
        const summary = Calculator.calculateMonthlyBudgetSummary(year, month);
        
        let html = '';
        
        if (budgets.length === 0) {
            html = `<div class="empty-state">
                <p class="empty-state-text">Još nema postavljenih budžeta za ovaj mesec</p>
                <p class="empty-state-subtext">Postavite budžet koristeći formu ispod</p>
            </div>`;
        } else {
            // Ukupan pregled
            html += `
                <div class="glass-card" style="background: rgba(0,0,0,0.3); margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="color: var(--white); margin: 0;">Ukupan Budžet</h4>
                            <div style="font-size: 14px; color: var(--alabaster-grey); margin-top: 4px;">
                                ${this.formatCurrency(summary.totalSpent, 'RSD')} / ${this.formatCurrency(summary.totalBudget, 'RSD')}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: 700; color: ${summary.percentage > 100 ? 'var(--danger)' : summary.percentage > 80 ? 'var(--orange)' : 'var(--success)'};">
                                ${summary.percentage.toFixed(0)}%
                            </div>
                            <div style="font-size: 12px; color: var(--alabaster-grey);">
                                Preostalo: ${this.formatCurrency(summary.totalRemaining, 'RSD')}
                            </div>
                        </div>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-top: 12px; overflow: hidden;">
                        <div style="width: ${Math.min(summary.percentage, 100)}%; height: 100%; background: ${summary.percentage > 100 ? 'var(--danger)' : summary.percentage > 80 ? 'var(--orange)' : 'var(--success)'}; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
            
            // Po kategorijama
            budgets.forEach(budget => {
                const category = AppState.categories.find(c => c.id === budget.categoryId);
                if (!category) return;
                
                const spent = spending[budget.categoryId] || 0;
                const percentage = (spent / budget.amount) * 100;
                const remaining = budget.amount - spent;
                
                html += `
                    <div class="glass-card" style="background: rgba(0,0,0,0.2); padding: 16px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 16px; font-weight: 600; color: var(--white);">${category.name}</div>
                                <div style="font-size: 14px; color: var(--alabaster-grey); margin-top: 4px;">
                                    ${this.formatCurrency(spent, 'RSD')} / ${this.formatCurrency(budget.amount, 'RSD')}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 20px; font-weight: 700; color: ${percentage > 100 ? 'var(--danger)' : percentage > 80 ? 'var(--orange)' : 'var(--success)'};">
                                    ${percentage.toFixed(0)}%
                                </div>
                                <div style="font-size: 12px; color: ${remaining < 0 ? 'var(--danger)' : 'var(--alabaster-grey)'};">
                                    ${remaining < 0 ? 'Prekoračeno' : 'Preostalo'}: ${this.formatCurrency(Math.abs(remaining), 'RSD')}
                                </div>
                            </div>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: ${percentage > 100 ? 'var(--danger)' : percentage > 80 ? 'var(--orange)' : 'var(--success)'}; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
    },
    
    /**
     * Osvežava listu ciljeva štednje
     */
    refreshGoalsList() {
        const container = document.getElementById('goalsList');
        if (!container) return;
        
        if (AppState.savingsGoals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <p class="empty-state-text">Još nemate postavljenih ciljeva</p>
                    <p class="empty-state-subtext">Postavite svoj prvi cilj štednje!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        AppState.savingsGoals.forEach(goal => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
            const deadline = goal.deadline ? new Date(goal.deadline).toLocaleDateString('sr-RS') : 'Bez roka';
            
            // Provera da li je rok prošao
            const isPastDeadline = goal.deadline && new Date(goal.deadline) < new Date();
            
            html += `
                <div class="glass-card" style="background: rgba(0,0,0,0.3); padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <div>
                            <h4 style="color: var(--white); margin: 0 0 8px 0; font-size: 20px;">${goal.name}</h4>
                            <div style="font-size: 14px; color: var(--alabaster-grey);">
                                Rok: ${deadline} ${isPastDeadline ? '<span style="color: var(--danger);">(Istekao)</span>' : ''}
                            </div>
                        </div>
                        <button onclick="UIController.deleteSavingsGoal(${goal.id})" class="delete-btn" style="background: rgba(239,68,68,0.6); padding: 8px 12px; border-radius: 6px;">
                            🗑️ Obriši
                        </button>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="font-size: 18px; color: var(--white); font-weight: 600;">
                            ${this.formatCurrency(goal.currentAmount, 'RSD')} / ${this.formatCurrency(goal.targetAmount, 'RSD')}
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: ${percentage >= 100 ? 'var(--success)' : 'var(--orange)'};">
                            ${percentage.toFixed(0)}%
                        </div>
                    </div>
                    
                    <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; margin-bottom: 12px;">
                        <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: linear-gradient(90deg, var(--orange) 0%, ${percentage >= 100 ? 'var(--success)' : 'var(--orange)'} 100%); transition: width 0.5s ease;"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--alabaster-grey);">
                        <div>Preostalo: ${this.formatCurrency(remaining, 'RSD')}</div>
                        ${percentage >= 100 ? '<div style="color: var(--success); font-weight: 600;">✅ Cilj ostvaren!</div>' : ''}
                    </div>
                    
                    <div style="margin-top: 12px;">
                        <label style="font-size: 13px; color: var(--alabaster-grey); display: block; margin-bottom: 6px;">Ažuriraj uštođeni iznos:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" id="updateGoal${goal.id}" value="${goal.currentAmount}" step="100" min="0" 
                                   style="flex: 1; padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid var(--orange); color: white; font-size: 14px;">
                            <button onclick="UIController.updateGoalAmount(${goal.id})" class="btn" style="padding: 8px 16px; font-size: 14px;">
                                💾 Sačuvaj
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    /**
     * Ažurira iznos na cilju
     */
    updateGoalAmount(id) {
        const input = document.getElementById(`updateGoal${id}`);
        const amount = parseFloat(input.value);
        
        if (amount < 0) {
            alert('⚠️ Iznos ne može biti negativan!');
            return;
        }
        
        FinanceModule.updateSavingsGoal(id, amount);
        this.refresh();
        this.showNotification('✅ Cilj uspešno ažuriran!', 'success');
    }
};

// ========================================
// DEMO DATA - Za testiranje (opciono)
// ========================================

function loadDemoData() {
    // Mesečni unosi
    FinanceModule.addSalaryEntry(2024, 1, 'Plata Januar', 80000);
    FinanceModule.addSalaryEntry(2024, 1, 'Kirija', -25000);
    FinanceModule.addSalaryEntry(2024, 2, 'Plata Februar', 85000);
    
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
    
    console.log('✅ App Ready');
});

// ========================================
// CHARTS - Grafikon moduli
// ========================================

const ChartModule = {
    charts: {
        wealthPie: null,
        salaryBar: null,
        salaryLine: null
    },
    
    /**
     * Inicijalizuje sve grafikone
     */
    initCharts() {
        this.createWealthPieChart();
        this.createSalaryBarChart();
        this.createSalaryLineChart();
    },
    
    /**
     * Kreira pie chart za distribuciju bogatstva
     */
    createWealthPieChart() {
        const ctx = document.getElementById('wealthPieChart');
        if (!ctx) return;
        
        const cardBalance = Calculator.calculateCardBalance();
        const cashEUR = Calculator.calculateCashBalanceEUR();
        const cashRSD = Calculator.calculateCashBalanceRSD();
        const cashEURtoRSD = Calculator.convertEURtoRSD(cashEUR);
        const depositsRSD = Calculator.calculateTotalDepositsValue();
        
        if (this.charts.wealthPie) {
            this.charts.wealthPie.destroy();
        }
        
        this.charts.wealthPie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Kartica', 'Gotovina EUR', 'Gotovina RSD', 'Depoziti'],
                datasets: [{
                    data: [cardBalance, cashEURtoRSD, cashRSD, depositsRSD],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(139, 92, 246, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white',
                            font: {
                                size: 12
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return label + ': ' + new Intl.NumberFormat('sr-RS').format(value) + ' RSD';
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Kreira bar chart za godišnju zaradu
     */
    createSalaryBarChart() {
        const ctx = document.getElementById('salaryBarChart');
        if (!ctx) return;
        
        const summary = Calculator.generateYearlySummary();
        const years = Object.keys(summary).sort();
        const totals = years.map(year => summary[year].total);
        
        // Uništi postojeći chart ako postoji
        if (this.charts.salaryBar) {
            this.charts.salaryBar.destroy();
        }
        
        this.charts.salaryBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Godišnja Zarada (RSD)',
                    data: totals,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Zarada: ' + new Intl.NumberFormat('sr-RS').format(context.parsed.y) + ' RSD';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white',
                            callback: function(value) {
                                return new Intl.NumberFormat('sr-RS', {
                                    notation: 'compact',
                                    compactDisplay: 'short'
                                }).format(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Kreira line chart za mesečni trend zarade
     */
    createSalaryLineChart() {
        const ctx = document.getElementById('salaryLineChart');
        if (!ctx) return;
        
        // Grupiši po godini i mesecu
        const monthlyData = {};
        AppState.salaryEntries.forEach(entry => {
            const key = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = 0;
            }
            monthlyData[key] += entry.amount;
        });
        
        // Sortiraj po datumu
        const sortedKeys = Object.keys(monthlyData).sort();
        const labels = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            return `${month}/${year}`;
        });
        const values = sortedKeys.map(key => monthlyData[key]);
        
        // Uništi postojeći chart ako postoji
        if (this.charts.salaryLine) {
            this.charts.salaryLine.destroy();
        }
        
        this.charts.salaryLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mesečna Zarada',
                    data: values,
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'white',
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Zarada: ' + new Intl.NumberFormat('sr-RS').format(context.parsed.y) + ' RSD';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white',
                            callback: function(value) {
                                return new Intl.NumberFormat('sr-RS', {
                                    notation: 'compact',
                                    compactDisplay: 'short'
                                }).format(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Osvežava sve grafikone sa novim podacima
     */
    refreshCharts() {
        this.createWealthPieChart();
        this.createSalaryBarChart();
        this.createSalaryLineChart();
    }
};

