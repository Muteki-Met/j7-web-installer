const connectButton = document.querySelector("#connect");
const apkInput = document.querySelector("#apk");
const installButton = document.querySelector("#install");
const status = document.querySelector("#status");
const VERSION = "v1.1.0";

document.querySelector("#version").textContent = VERSION;
status.textContent = `Ready.\nBuild ${VERSION}`;

let adb;
const show = message => status.textContent = message;

async function runShell(command) {
  const shell = await adb.shell(command);
  const decoder = new TextDecoder();
  let output = "";
  let response = await shell.receive();
  while (response.cmd === "WRTE") {
    if (response.data) output += decoder.decode(response.data);
    await shell.send("OKAY");
    response = await shell.receive();
  }
  await shell.close();
  return output;
}

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
  const id = Date.now();
  const remote = `/sdcard/Download/${id}_j7probe.apk`;
  const config = "/sdcard/Download/p.conf";
  let phase = "opening sync service";

  try {
    const sync = await adb.sync();
    phase = "uploading APK";
    await sync.push(file, remote, "0644", (done, total) => {
      show(`Uploading ${file.name}… ${Math.round(done / total * 100)}%`);
    });
    phase = "closing sync service";
    await sync.quit();

    phase = "preparing DesaySV install command 1/2";
    show("Upload complete. Preparing installer…");
    await runShell(`echo -n 'for FILE in /sdcard/Download/${id}_*.apk; do echo $FILE; cat $FILE | pm ins' > ${config}`);

    phase = "preparing DesaySV install command 2/2";
    await runShell(`echo 'tall -d -g -S \`stat -c%s $FILE\`; done' >> ${config}`);

    phase = "running Package Manager";
    show("Installer prepared. Installing…");
    const output = await runShell(`sh ${config}; echo 1 > ${config}`);

    if (!output.includes("Success")) throw new Error(output.trim() || "Package Manager returned no result");
    show(`SUCCESS: APK installed.\n${output.trim()}`);
  } catch (error) {
    show(`INSTALLATION FAILED DURING ${phase.toUpperCase()}:\n${error?.stack || error}`);
  } finally {
    installButton.disabled = false;
  }
};
