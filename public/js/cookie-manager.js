/**
 * CookieBanner - Manages the display and logic of the cookie consent banner.
 * Saves preference to localStorage: 'dailypolitics_consent' = 'accepted' | 'rejected'
 */
class CookieBanner {
    constructor(trackingId) {
        this.storageKey = 'dailypolitics_consent';
        this.bannerId = 'dp-cookie-banner';
        this.trackingId = trackingId;
    }

    init() {
        if (!this.hasConsented()) {
            this.render();
        } else if (this.getStoredConsent() === 'accepted') {
            this.loadAnalytics();
        }
    }

    getStoredConsent() {
        return sessionStorage.getItem(this.storageKey);
    }

    hasConsented() {
        return this.getStoredConsent() !== null;
    }

    setConsent(status) {
        sessionStorage.setItem(this.storageKey, status);
        this.removeBanner();

        if (status === 'accepted') {
            this.loadAnalytics();
            window.dispatchEvent(new CustomEvent('cookie-consent-accepted'));
        }
    }

    loadAnalytics() {
        if (!this.trackingId) return;

        // Prevent duplicate loading
        if (window.gtag) return;

        // Inject Google Tag Manager script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
        document.head.appendChild(script);

        // Initialize DataLayer
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        window.gtag = gtag; // expose to window
        gtag('js', new Date());
        gtag('config', this.trackingId);

        console.log('Google Analytics loaded via Cookie Manager');
    }

    removeBanner() {
        const banner = document.getElementById(this.bannerId);
        if (banner) {
            banner.remove();
        }
    }

    render() {
        // Prevent duplicate rendering
        if (document.getElementById(this.bannerId)) return;

        const html = `
            <div id="${this.bannerId}" class="dp-cookie-banner" role="region" aria-label="Cookie banner">
                <div class="container">
                    <div class="row">
                        <div class="col-md-8">
                            <h2 class="dp-cookie-banner__heading">Cookies on Daily Politics</h2>
                            <p class="dp-cookie-banner__text">
                                We use some essential cookies to make this website work.
                                We’d like to set additional cookies to understand how you use Daily Politics, remember your settings and improve our services.
                            </p>
                        </div>
                        <div class="col-md-4 dp-cookie-banner__actions">
                            <button id="dp-cookie-accept" class="btn btn-success btn-lg">Accept analytics cookies</button>
                            <button id="dp-cookie-reject" class="btn btn-outline-dark btn-lg">Reject analytics cookies</button>
                            <a href="/privacy-policy/index.html" class="dp-cookie-banner__link">View cookies</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', html);

        // Bind events
        document.getElementById('dp-cookie-accept').addEventListener('click', () => this.setConsent('accepted'));
        document.getElementById('dp-cookie-reject').addEventListener('click', () => this.setConsent('rejected'));
    }
}

// Attach to window so it can be instantiated by the helper script
window.CookieBanner = CookieBanner;
