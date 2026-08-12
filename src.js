const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
const VERSION = "v1.0.0";

document.querySelector("#version").textContent = VERSION;
status.textContent = `Ready.\nBuild ${VERSION}`;

let adb;
const show = message => status.textContent = message;

connectButton.onclick = async () => {
  try {
    if (!navigator.usb) throw new Error("WebUSB is not supported. Use Chrome on Android.");
    show("Select DesaySV and allow USB debugging on the car display…");
    const transport = await window.Adb.open("WebUSB");
    adb = await transport.connectAdb("host::");
    apkInput.disabled = false;
    connectButton.disabled = true;
    show(`Connected: ${adb.banner || "DesaySV"}\nEngine ${VERSION} / webadb.js 1.0.1`);
  } catch (error) {
    show(`CONNECTION FAILED:\n${error?.stack || error}`);
  }
};

apkInput.onchange = () => installButton.disabled = !apkInput.files?.[0];

installButton.onclick = async () => {
  const file = apkInput.files?.[0];
  if (!adb || !file) return;

  installButton.disabled = true;
  const remote = `/data/local/tmp/j7-${Date.now()}.apk`;
  let phase = "opening sync service";

  try {
    const sync = await adb.sync();
    phase = "uploading APK";
    await sync.push(file, remote, "0644", (done, total) => {
      show(`Uploading ${file.name}… ${Math.round(done / total * 100)}%`);
    });
    phase = "closing sync service";
    await sync.quit();

    phase = "running Package Manager";
    show("Upload complete. Installing…");
    const shell = await adb.shell(`pm install -r ${remote}; rm -f ${remote}`);
    const decoder = new TextDecoder();
    let output = "";
    let response = await shell.receive();
    while (response.cmd === "WRTE") {
      if (response.data) output += decoder.decode(response.data);
      await shell.send("OKAY");
      response = await shell.receive();
    }
    await shell.close();

    if (!output.includes("Success")) throw new Error(output.trim() || `Package Manager ended with ${response.cmd}`);
    show(`SUCCESS: APK installed.\n${output.trim()}`);
  } catch (error) {
    show(`INSTALLATION FAILED DURING ${phase.toUpperCase()}:\n${error?.stack || error}`);
  } finally {
    installButton.disabled = false;
  }
};
