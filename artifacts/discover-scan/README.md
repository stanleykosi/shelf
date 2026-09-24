# Discover and Scan — design review

Captured September 25, 2026 from the local production build. Company listings in these
screenshots are synthetic, intercepted browser fixtures; they are not evidence of current
issuer availability. The application itself continues to use its existing issuer feeds.

Local preview while the server is running:
[Discover](http://127.0.0.1:3101/discover) · [Scan](http://127.0.0.1:3101/scan).

| Screen | Desktop, 1440px | Mobile, 390px |
| --- | --- | --- |
| Discover | [Full page](discover-1440.png) · [First viewport](discover-1440-viewport.png) | [Full page](discover-390.png) · [First viewport](discover-390-viewport.png) |
| Scan | [Full page](scan-1440.png) · [First viewport](scan-1440-viewport.png) | [Full page](scan-390.png) · [First viewport](scan-390-viewport.png) |

Discover puts search, illustrated themes and an issuer directory in one research workspace.
Themes apply real filters, suggestions prepare an editable query, and company rows retain
their issuer detail links. Scan gives capture, local review and identification a clear
sequence, with a direct upload alternative and explicit per-image consent.

Motion is limited to entrance, hover and press feedback. Reduced motion uses a short fade
and removes movement; switching Scan inputs does not replay the entrance. Screenshots
capture the reduced-motion presentation.

Responsive and automated WCAG checks cover 360, 390, 430, 768, 1280 and 1440px. Browser
verification uses Chromium and Pixel 7 emulation. Physical-device camera behavior and
Safari/Firefox were not verified in this pass. This is a local design review, with no
deployment or live-money activation.

Implementation and verification details: [design checklist](../../docs/DISCOVER_SCAN_REDESIGN.md).
