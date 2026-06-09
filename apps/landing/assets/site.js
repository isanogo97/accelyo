document.addEventListener('DOMContentLoaded', function () {
  var b = document.getElementById('burger');
  var m = document.getElementById('menu');
  if (b && m) b.addEventListener('click', function () { m.classList.toggle('open'); });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});
