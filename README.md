# J7 Web Installer

Installer APK minimale per infotainment Android tramite ADB su WebUSB.

## Uso

1. Aprire la pagina con Chrome su Android.
2. Collegare telefono e auto tramite adattatore OTG.
3. Chiudere qualsiasi altra applicazione ADB.
4. Premere **Connetti auto** e autorizzare il debug USB sull'auto.
5. Selezionare un singolo APK e premere **Installa APK**.

Il file viene trasferito direttamente dal browser all'auto. Nessun dato viene caricato su un server.

## Build

```sh
npm install
npm run build
```

La build statica viene generata in `dist/`.
