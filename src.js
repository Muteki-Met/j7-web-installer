import { Adb } from "@yume-chan/adb";
import AdbWebUsbBackend, { AdbWebCredentialStore } from "@yume-chan/adb-backend-webusb";

const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
const VERSION = "v0.8.0";
document.querySelector("#version").textContent = VERSION;
status.textContent = `Ready.\nBuild ${VERSION}`;
let adb;

const show = (message) => status.textContent = message;

connectButton.onclick = async () => {
  try {
    if (!AdbWebUsbBackend.isSupported()) throw new Error("WebUSB is not supported. Use Chrome on Android.");
    const backend = await AdbWebUsbBackend.requestDevice();
    if (!backend) return show("No device selected.");
    show("Allow USB debugging on the car display…");
    adb = new Adb(backend);
    await adb.connect(new AdbWebCredentialStore("j7-web-installer-key"));
    show("ADB 0.0.9 authenticated. Testing shell…");
    const probe = await adb.childProcess.exec("echo", "J7_READY");
    if (!probe.includes("J7_READY")) throw new Error(`Legacy shell test failed: ${probe || "no output"}`);
    apkInput.disabled = false;
    connectButton.disabled = true;
    show(`Connected: ${adb.model || adb.name || backend.serial}\nEngine ${VERSION} / ADB 0.0.9`);
  } catch (error) {
    show(`CONNECTION FAILED:\n${error?.stack || error}`);
  }
};

apkInput.onchange = () => installButton.disabled = !apkInput.files?.[0];

installButton.onclick = async () => {
  const file = apkInput.files?.[0];
  if (!adb || !file) return;
  installButton.disabled = true;
  try {
    show(`Installing ${file.name} with ADB 0.0.9…`);
    await adb.install(await file.arrayBuffer(), uploaded => {
      show(`Uploading ${file.name}… ${Math.min(100, Math.round(uploaded / file.size * 100))}%`);
    });
    show("SUCCESS: APK installed.");
  } catch (error) {
    show(`INSTALLATION FAILED:\n${error?.stack || error}`);
  } finally {
    installButton.disabled = false;
  }
};
