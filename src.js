import { Adb, AdbDaemonTransport, AdbFeature } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";

const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
const VERSION = "v0.7.0";
document.querySelector("#version").textContent = VERSION;
status.textContent = `Ready.\nBuild ${VERSION}`;
let adb;

const show = (message) => status.textContent = message;

const shell = async (command, input) => {
  const socket = await adb.createSocket(`shell:${command}`);
  const output = new Response(socket.readable).text();
  if (input) await input.pipeTo(socket.writable);
  return (await output).trim();
};

connectButton.onclick = async () => {
  try {
    if (!AdbDaemonWebUsbDeviceManager.BROWSER) throw new Error("WebUSB is not supported. Use Chrome on Android.");
    const device = await AdbDaemonWebUsbDeviceManager.BROWSER.requestDevice();
    if (!device) return show("No device selected.");
    show("Allow USB debugging on the car display…");
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection: await device.connect(),
      credentialStore: new AdbWebCredentialStore("J7 Web Installer"),
      features: [
        AdbFeature.ShellV2,
        AdbFeature.Cmd,
        AdbFeature.StatV2,
        AdbFeature.ListV2,
        AdbFeature.FixedPushMkdir,
        AdbFeature.Abb,
        AdbFeature.AbbExec,
        AdbFeature.SendReceiveV2
      ],
      initialDelayedAckBytes: 0,
      appendNullToServiceString: true,
      calculateChecksum: true
    });
    adb = new Adb(transport);
    show("ADB authenticated. Testing legacy shell…");
    const probe = await shell("echo J7_READY");
    if (!probe.includes("J7_READY")) throw new Error(`Legacy shell test failed: ${probe || "no output"}`);
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
  const remote = "/data/local/tmp/j7-installer.apk";
  try {
    show(`Uploading ${file.name} via legacy ADB shell…`);
    await shell(`cat > ${remote}`, file.stream());
  } catch (error) {
    show(`UPLOAD FAILED:\n${error?.stack || error}`);
    installButton.disabled = false;
    return;
  }
  try {
    show("Upload complete. Running pm install…");
    const output = await shell(`pm install -r -t ${remote}`);
    if (!output.includes("Success")) throw new Error(output || "pm install returned no output");
    show("SUCCESS: APK installed.");
  } catch (error) {
    show(`PM INSTALL FAILED:\n${error?.stack || error}`);
  } finally {
    try { await shell(`rm -f ${remote}`); } catch {}
    installButton.disabled = false;
  }
};
