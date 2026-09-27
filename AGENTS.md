# Technical Decisions

- Admin access uses short-lived server-signed session tokens stored in session storage; the password is sent only to the login action and is never retained client-side.