# Crossover Service

## Development setup

#### - Install NodeJS
#### - Install tools

- `sudo npm install -g firebase-tools`
(more info: https://firebase.google.com/docs/cli/)

optional:
- `sudo npm install -g nodemon`

#### - Install dependencies

- `npm install`

#### - Download Firebase Service Account

- Download service account (json) from Firebase Service Accounts or Google Developers Console.
- Save account file (rename into `service-account.json`) in root folder

More info: https://firebase.google.com/docs/admin/setup

#### - Run Service
by default, just type:
`node ./service.js`

 or,
`nodemon ./service.js`

This will start the local development service.

