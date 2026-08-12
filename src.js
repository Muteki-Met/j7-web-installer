import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { PackageManager } from "@yume-chan/android-bin";

const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
let adb;

const show = (message) => status.textContent = message;

connectButton.onclick = async () => {
  try {
    if (!AdbDaemonWebUsbDeviceManager.BROWSER) throw new Error("WebUSB is not supported. Use Chrome on Android.");
    const device = await AdbDaemonWebUsbDeviceManager.BROWSER.requestDevice();
    if (!device) return show("No device selected.");
    show("Allow USB debugging on the car display…");
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection: await device.connect(),
      credentialStore: new AdbWebCredentialStore("J7 Web Installer")
    });
    adb = new Adb(transport);
    apkInput.disabled = false;
    connectButton.disabled = true;
    show(`Connected: ${device.name || device.serial}`);
  } catch (error) {
    show(`CONNECTION FAILED:\n${error?.stack || error}`);
  }
};

apkInput.onchange = () => installButton.disabled = !apkInput.files?.[0];

installButton.onclick = async () => {
  const file = apkInput.files?.[0];
  if (!adb || !file) return;
  installButton.disabled = true;
  show(`Installing ${file.name}…`);
  try {
    await new PackageManager(adb).installStream(file.size, file.stream(), { allowTest: true });
    show("SUCCESS: APK installed.");
  } catch (error) {
    show(`INSTALLATION FAILED:\n${error?.stack || error}`);
  } finally {
    installButton.disabled = false;
  }
};
