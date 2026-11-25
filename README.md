# Raahi frontend

Raahi is a ride-booking prototype with a public landing page, passenger and
rider workspaces, admin screens, and a TypeScript API foundation. The API has
phone OTP authentication routes, but SMS delivery is not configured and the
frontend demo is not connected to them. Ride booking and account actions in the
frontend remain demo-only.

## Run locally

Open `index.html` in a browser for the frontend demo. To run the API, use Node.js
24 or newer:

```sh
npm install
npm run dev
```

The API listens on `http://127.0.0.1:3000`. `GET /api/health` checks that the
server is running; `GET /api/ready` checks whether MySQL is configured and
reachable. Run `npm test` to compile the TypeScript API and run its HTTP tests.

Authentication routes are `POST /api/auth/otp/request`,
`POST /api/auth/otp/verify`, `GET /api/auth/me`, and `POST /api/auth/logout`.
OTP request and verification require a configured MySQL database and an
`OTP_HASH_SECRET` of at least 32 bytes. Sessions use opaque bearer tokens and
are stored as token hashes. SMS delivery is intentionally disabled until an
SMS provider adapter is configured; OTP codes are never returned by the API.
Twilio is supported through `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
`TWILIO_PHONE_NUMBER` environment variables.

### Configure local MySQL

Install and start MySQL Server 8+, then create a local database and a dedicated
application user with the interactive setup command:

```sh
npm run db:setup
```

The command asks for the local MySQL root password and a new password for the
Raahi database user; input is hidden. It creates the `raahi_dev` database,
grants the local `raahi_app` account access only to that database, writes the
credentials and a generated OTP hash secret to the git-ignored `.env`, and
applies the schema. Do not share either password or the OTP hash secret in chat
or commit `.env`. Run the command from an
interactive terminal in the project root. If the schema needs to be reapplied
later, use `npm run db:migrate`.

The first migration creates users, rider profiles, vehicles, rides and ride
history, event requests and quotations, complaints, OTP challenges, and admin
audit logs. Authentication and ride endpoints will be connected in subsequent
backend steps. For production, use a separate migration account and narrower
runtime database privileges.

## Project layout

```text
index.html
README.md
assets/
  fonts/
  icons/
  images/
css/
  public.css
  passenger.css
  rider.css
  style.css
  theme.css
js/
  passenger.js
  public.js
  rider.js
  main.js
pages/
  auth/
  passenger/
    dashboard.html
    rides.html
    profile.html
    support.html
    events.html
  rider/
    registration.html
    dashboard.html
    requests.html
    active-ride.html
    earnings.html
    support.html
  admin/
    dashboard.html
    passengers.html
    riders.html
    rides.html
    events.html
    complaints.html
    fares.html
    reports.html
    settings.html
src/
  app.ts
  app.test.ts
  database.ts
  server.ts
package.json
tsconfig.json
```

The public homepage includes About, Our rides, wedding/event transport, How it
works, and Contact sections, plus demo login and signup dialogs. The passenger
demo includes booking, ride history/tracking preview, profile, support, and a
multi-vehicle event request page. Event requests can be reviewed and quoted in
the admin event bookings page; the customer can accept or decline a quotation.
These event demo requests are stored in browser local storage so the customer
and admin pages can share them in the same browser. The rider
demo includes registration/verification, dashboard, requests, active ride,
earnings, and support. The admin demo includes overview, passenger and rider
management, ride monitoring, event booking quotations, complaint review, fare
controls, reports, and settings. All names, counts, fares, charts, and actions
are illustrative; no account, verification, live tracking, payment, support, or
admin action is connected to a backend. Event requests saved in local storage
are local demo data only. `assets/` is prepared for future media.

## Planned ride types

- Bike
- Auto
- Cab
- E-rickshaw
- Pickup for transporting goods
