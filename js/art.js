/* Flat SVG workout illustrations (no external assets).
   App.art(kind, {bare})   -> <div class="art"> with an inline SVG scene
   App.artFor(item)        -> picks the kind from a workout {category} or an exercise {name}
   kinds: strength | cardio | mobility | recovery | fullbody */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var HUE = { strength: "#6757E8", cardio: "#D95363", mobility: "#26966B", recovery: "#E8A23B", fullbody: "#2B8CC4" };

  // body parts as round-capped strokes; each scene lists limbs as point arrays
  var SCENES = {
    strength: { // overhead barbell press
      head: [200, 74],
      limbs: [[[200, 96], [200, 152]], [[200, 104], [166, 52]], [[200, 104], [234, 52]],
              [[200, 152], [184, 192], [180, 226]], [[200, 152], [216, 192], [220, 226]]],
      props: '<g class="art-move"><rect x="92" y="48" width="216" height="8" rx="4" fill="@ink"/>' +
             '<rect x="92" y="24" width="14" height="56" rx="5" fill="@hue"/><rect x="108" y="32" width="10" height="40" rx="4" fill="@hue" opacity=".6"/>' +
             '<rect x="294" y="24" width="14" height="56" rx="5" fill="@hue"/><rect x="282" y="32" width="10" height="40" rx="4" fill="@hue" opacity=".6"/></g>'
    },
    cardio: { // sprinting runner with speed lines
      head: [214, 66],
      limbs: [[[208, 90], [192, 142]], [[204, 98], [232, 116], [254, 100]], [[204, 98], [176, 110], [158, 132]],
              [[192, 142], [228, 160], [216, 206]], [[192, 142], [160, 178], [128, 198]]],
      props: '<g class="art-lines" stroke="@hue" stroke-width="5" stroke-linecap="round" opacity=".7"><path d="M60 100h60"/><path d="M40 130h70"/><path d="M70 160h50"/></g>'
    },
    mobility: { // tree pose, arms overhead
      head: [200, 88],
      limbs: [[[200, 110], [200, 152]], [[200, 116], [156, 88], [200, 38]], [[200, 116], [244, 88], [200, 38]],
              [[200, 152], [200, 226]], [[200, 152], [242, 168], [206, 190]]],
      props: '<g class="art-lines" fill="none" stroke="@hue" stroke-width="4" stroke-linecap="round" opacity=".6"><circle cx="200" cy="130" r="86"/><circle cx="200" cy="130" r="108" opacity=".5"/></g>'
    },
    recovery: { // seated meditation with halo
      head: [200, 92],
      limbs: [[[200, 114], [200, 164]], [[200, 120], [166, 156], [176, 190]], [[200, 120], [234, 156], [224, 190]],
              [[150, 200], [200, 176], [250, 200]]],
      props: '<circle cx="200" cy="130" r="96" fill="@hue" opacity=".16"/><g class="art-lines" fill="none" stroke="@hue" stroke-width="4" stroke-linecap="round" opacity=".7">' +
             '<path d="M90 214q20-12 40 0t40 0 40 0 40 0 40 0"/></g>'
    },
    fullbody: { // squat holding a kettlebell
      head: [186, 84],
      limbs: [[[190, 106], [182, 164]], [[190, 114], [226, 134]], [[182, 164], [226, 176], [208, 222]], [[182, 164], [148, 186], [150, 224]]],
      props: '<g class="art-move"><path d="M214 134a14 14 0 0 1 28 0" fill="none" stroke="@ink" stroke-width="7" stroke-linecap="round"/><circle cx="228" cy="156" r="22" fill="@hue"/></g>'
    }
  };

  function path(points) { return "M" + points.map(function (p) { return p[0] + " " + p[1]; }).join("L"); }

  function art(kind, opts) {
    opts = opts || {};
    var hue = HUE[kind] ? kind : "fullbody", color = HUE[hue], sc = SCENES[hue], ink = opts.bare ? "#fff" : "var(--text)";
    var id = "g" + Math.random().toString(36).slice(2, 8);
    var limbs = sc.limbs.map(function (l) { return '<path d="' + path(l) + '"/>'; }).join("");
    var bg = opts.bare ? "" :
      '<circle cx="330" cy="50" r="70" fill="' + color + '" opacity=".10"/><circle cx="70" cy="200" r="90" fill="' + color + '" opacity=".08"/>' +
      '<ellipse cx="200" cy="230" rx="120" ry="7" fill="' + color + '" opacity=".22"/>';
    var svg = '<svg xmlns="' + NS + '" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + hue + ' illustration">' + bg +
      '<g class="art-figure">' + sc.props.replace(/@hue/g, color).replace(/@ink/g, ink) +
      '<g fill="none" stroke="' + ink + '" stroke-width="15" stroke-linecap="round" stroke-linejoin="round">' + limbs + '</g>' +
      '<circle cx="' + sc.head[0] + '" cy="' + sc.head[1] + '" r="19" fill="' + color + '" stroke="' + ink + '" stroke-width="6"/></g></svg>';
    var d = document.createElement("div");
    d.className = "art art--" + hue + (opts.bare ? " art--bare" : "");
    if (!opts.bare) d.style.background = "linear-gradient(135deg, color-mix(in srgb, " + color + " 12%, var(--surface)), color-mix(in srgb, " + color + " 30%, var(--surface)))";
    d.innerHTML = svg;
    return d;
  }

  // real photos (img/cat-<kind>.webp) when present; the SVG scene stays as fallback if a photo fails to load
  var PHOTO = { strength: "img/cat-strength.webp", cardio: "img/cat-cardio.webp", mobility: "img/cat-mobility.webp",
                recovery: "img/cat-recovery.webp", fullbody: "img/cat-fullbody.webp" };
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function photo(kind, opts, seed) {
    var d = document.createElement("div"), img = document.createElement("img");
    d.className = "art art--photo art--" + kind + (opts.bare ? " art--bare" : "");
    var queue = (opts.own ? ["img/" + opts.own + ".webp"] : []).concat(PHOTO[kind]);
    img.alt = ""; img.loading = "lazy"; img.decoding = "async";
    img.style.objectPosition = (20 + hash(seed || kind) % 60) + "% 50%"; // vary the crop between cards sharing a photo
    img.onerror = function () { if (queue.length) img.src = queue.shift(); else d.replaceWith(art(kind, opts)); };
    img.src = queue.shift();
    d.appendChild(img);
    return d;
  }

  var KEYS = [
    ["strength", /press|bench|squat|deadlift|curl|row|raise|extension|pull|push|lift|dip|lunge|strength|chest|shoulder|tricep|bicep|back|leg/i],
    ["cardio", /run|sprint|jump|burpee|hiit|cycle|bike|rope|row machine|cardio|tempo|interval|conditioning/i],
    ["mobility", /stretch|yoga|mobility|pose|flow|flexib|core|posture|balance/i],
    ["recovery", /foam|recover|breath|medit|cool|relax|sleep|walk/i]
  ];
  function artFor(item, opts) {
    item = item || {};
    var text = (item.category ? item.category + " " : "") + (item.name || "");
    var kind = "fullbody";
    if (item.category && HUE[String(item.category).toLowerCase().replace(/\s+/g, "")]) kind = String(item.category).toLowerCase().replace(/\s+/g, "");
    else for (var i = 0; i < KEYS.length; i++) if (KEYS[i][1].test(text)) { kind = KEYS[i][0]; break; }
    return PHOTO[kind] && !(opts && opts.svg) ? photo(kind, Object.assign({ own: item.photo || item.id }, opts || {}), item.id || item.name) : art(kind, opts);
  }

  if (window.App) { window.App.art = art; window.App.artFor = artFor; }
})();
