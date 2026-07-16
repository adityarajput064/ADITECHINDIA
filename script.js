(function () {
  var BLOBS = [
    { color: "124,92,255", size: 62, top: "18%", left: "18%", duration: 26, parallax: 0.028, cls: "float-a" },
    { color: "56,132,255", size: 58, top: "66%", left: "74%", duration: 32, parallax: 0.045, cls: "float-b" },
    { color: "34,211,238", size: 50, top: "78%", left: "22%", duration: 22, parallax: 0.06, cls: "float-a" },
    { color: "236,72,153", size: 52, top: "14%", left: "78%", duration: 36, parallax: 0.035, cls: "float-b" },
    { color: "16,185,129", size: 46, top: "46%", left: "48%", duration: 20, parallax: 0.07, cls: "float-a" }
  ];

  var scene = document.getElementById('aurora-scene');
  if (!scene) return;

  var isCoarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) scene.classList.add('reduced');

  var grain = document.createElement('div');
  grain.className = 'grain';
  grain.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix type=%27matrix%27 values=%270 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')";
  grain.style.backgroundSize = '180px 180px';
  scene.appendChild(grain);

  var vignette = document.createElement('div');
  vignette.className = 'vignette';
  scene.appendChild(vignette);

  var blobInners = [];
  BLOBS.forEach(function (b) {
    var wrap = document.createElement('div');
    wrap.className = 'blob-wrap ' + b.cls;
    wrap.style.top = b.top; wrap.style.left = b.left;
    wrap.style.width = b.size + 'vmax'; wrap.style.height = b.size + 'vmax';
    wrap.style.marginLeft = (-b.size / 2) + 'vmax'; wrap.style.marginTop = (-b.size / 2) + 'vmax';
    wrap.style.animationDuration = b.duration + 's';

    var inner = document.createElement('div');
    inner.className = 'blob-inner';
    var alpha = isCoarse ? 0.28 : 0.36;
    inner.style.background = 'radial-gradient(circle at 50% 50%, rgba(' + b.color + ',' + alpha + ') 0%, rgba(' + b.color + ',0) 70%)';
    inner.style.filter = 'blur(' + (isCoarse ? 40 : 70) + 'px)';
    inner.style.mixBlendMode = 'screen';

    wrap.appendChild(inner);
    scene.insertBefore(wrap, scene.firstChild);
    blobInners.push({ el: inner, parallax: b.parallax });
  });

  var bloomEl = null, lightEl = null;
  if (!isCoarse) {
    bloomEl = document.createElement('div');
    bloomEl.className = 'bloom';
    bloomEl.style.width = '520px'; bloomEl.style.height = '520px';
    bloomEl.style.background = 'radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(180,150,255,0.24) 20%, rgba(80,200,255,0.14) 45%, rgba(0,0,0,0) 72%)';
    bloomEl.style.mixBlendMode = 'screen';
    bloomEl.style.filter = 'blur(6px)';
    scene.appendChild(bloomEl);

    lightEl = document.createElement('div');
    lightEl.className = 'keylight';
    lightEl.style.width = '860px'; lightEl.style.height = '860px';
    lightEl.style.background = 'radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)';
    lightEl.style.mixBlendMode = 'screen';
    scene.appendChild(lightEl);
  }

  var w = window.innerWidth, h = window.innerHeight;
  var target = { x: w / 2, y: h / 2 };
  var spring = { x: w / 2, y: h / 2, vx: 0, vy: 0 };
  var lastMove = performance.now() - 5000;

  window.addEventListener('resize', function () { w = window.innerWidth; h = window.innerHeight; });
  if (!isCoarse) {
    window.addEventListener('pointermove', function (e) {
      target.x = e.clientX; target.y = e.clientY; lastMove = performance.now();
    }, { passive: true });
  }

  var lastT = performance.now();
  var STIFFNESS = 90, DAMPING = 16;

  function tick(t) {
    var dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    if (!reducedMotion) {
      var ax = (target.x - spring.x) * STIFFNESS - spring.vx * DAMPING;
      var ay = (target.y - spring.y) * STIFFNESS - spring.vy * DAMPING;
      spring.vx += ax * dt; spring.vy += ay * dt;
      spring.x += spring.vx * dt; spring.y += spring.vy * dt;

      var speed = Math.min(Math.hypot(spring.vx, spring.vy) / 900, 1);
      var idleFor = t - lastMove;
      var idleFade = Math.max(0, 1 - idleFor / 1400);
      var intensity = isCoarse ? 0.3 : Math.max(idleFade, speed * 0.9);

      var cx = w / 2, cy = h / 2;
      var dx = spring.x - cx, dy = spring.y - cy;

      blobInners.forEach(function (b) {
        var factor = b.parallax * (isCoarse ? 0.3 : 1);
        var px = dx * factor, py = dy * factor;
        b.el.style.transform = 'translate3d(' + px.toFixed(2) + 'px, ' + py.toFixed(2) + 'px, 0)';
      });

      if (bloomEl) {
        var scale = 0.85 + intensity * 0.45;
        bloomEl.style.transform = 'translate3d(' + spring.x + 'px, ' + spring.y + 'px, 0) translate3d(-50%, -50%, 0) scale(' + scale.toFixed(3) + ')';
        bloomEl.style.opacity = (0.3 + intensity * 0.5).toFixed(3);
      }
      if (lightEl) {
        lightEl.style.transform = 'translate3d(' + spring.x + 'px, ' + spring.y + 'px, 0) translate3d(-50%, -50%, 0)';
        lightEl.style.opacity = (0.2 + intensity * 0.2).toFixed(3);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  var toggle = document.querySelector('.menu-toggle');
  var links = document.querySelector('.navlinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
  }
})();
