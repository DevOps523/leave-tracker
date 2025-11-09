if ("serviceWorker" in navigator) {
    navigator.serviceWorker
    .register("sw.js")
    .then((reg) => console.log("Register SW",reg))
    .catch((err) => console.error("Error register SW", err));
}else {
    console.log("There is no service worker");
}