// JS Goes here - ES6 supported
function darkMode() {
  var t = (new Date()).getHours();
  var b = document.querySelector("body");

  if (t >= 16 || t <= 8) {
    b.classList.add("is-night");
  }
}
darkMode();
