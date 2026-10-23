# Roadmap

- [ ] Fix Delivery/Stock/Payment dialogs: show success toast only after cloud save completes (await + saving state)
- [ ] Add offline support: cache last-known data in localStorage, show it when offline, clear on sign-out
- [ ] Build signed Android APK (Capacitor wrapper around published app) and save to Files
- [ ] Re-run over-selling test: friendly "Not enough stock" message, no raw DB error
- [ ] Clean up QA test customer/records from earlier E2E run
- [ ] Fix RLS tautology findings (customers/deliveries policies) and mark security findings fixed
- [ ] Routine dependency security update (tanstack packages)
