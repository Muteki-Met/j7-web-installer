import { Adb } from "@yume-chan/adb";
import AdbWebUsbBackend, { AdbWebCredentialStore } from "@yume-chan/adb-backend-webusb";

const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
const VERSION = "v0.11.0";
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
    apkInput.disabled = false;
    connectButton.disabled = true;
    show(`Connected: ${adb.model || adb.name || backend.serial}\nEngine ${VERSION} / ADB 0.0.8`);
  } catch (error) {
    show(`CONNECTION FAILED:\n${error?.stack || error}`);
  }
};

apkInput.onchange = () => installButton.disabled = !apkInput.files?.[0];

installButton.onclick = async () => {
  const file = apkInput.files?.[0];
  if (!adb || !file) return;
  installButton.disabled = true;
  const remote = "/sdcard/Download/j7-web-installer.apk";
  const encoded = `${remote}.b64`;
  let phase = "preparing upload";
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    phase = "clearing temporary files";
    await adb.childProcess.exec("rm", `-f ${remote} ${encoded}`);
    for (let offset = 0; offset < base64.length; offset += 2000) {
      phase = `uploading block ${Math.floor(offset / 2000) + 1}/${Math.ceil(base64.length / 2000)}`;
      show(`${phase}…`);
      await adb.childProcess.exec("echo", `-n '${base64.slice(offset, offset + 2000)}' >> ${encoded}`);
    }

    phase = "decoding APK";
    await adb.childProcess.exec("base64", `-d ${encoded} > ${remote}`);

    phase = "verifying upload";
    const uploadedSize = await adb.childProcess.exec("stat", `-c%s ${remote}`);
    if (Number(uploadedSize.trim()) !== file.size) {
      throw new Error(`Upload verification failed: ${uploadedSize.trim()} / ${file.size} bytes`);
    }

    phase = "running Package Manager";
    show(`Upload verified (${file.size} bytes). Installing…`);
    const result = await adb.childProcess.exec("pm", `install -r ${remote}`);
    if (!result.includes("Success")) throw new Error(result.trim() || "Package Manager returned no result");
    await adb.childProcess.exec("rm", `-f ${remote} ${encoded}`);
    show(`SUCCESS: APK installed.\n${result.trim()}`);
  } catch (error) {
    show(`INSTALLATION FAILED DURING ${phase.toUpperCase()}:\n${error?.stack || error}`);
  } finally {
    installButton.disabled = false;
  }
};
