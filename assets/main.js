function getLsValues() {
  lsValues = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    var value = localStorage.getItem(key);

    if (key.endsWith('file')) {
      lsValues.push(value);
    }

  }

}

async function getFileAs(type, file) {
  var data = await file.async(type);
  return data;
}

function createApp(app, appId) {
  var elements = document.getElementById('apps');
  var fileName = app.name;
  var zip = new JSZip();

  var checkbox = document.createElement('input');
  checkbox.type = "checkbox";
  checkbox.id = appId;

  var btn = document.createElement('button');
  btn.onclick = function() {
    if (checkbox.checked) {
      checkbox.checked = false;
      btn.classList.remove("activeBtn");
    } else {
      checkbox.checked = true;
      btn.classList.add("activeBtn");
    }
  };

  var img = document.createElement('img');

  var name = document.createElement('span');
  name.textContent = fileName;

  var element = document.createElement('div');
  element.id = appId + "div";
  element.classList.add("apps");

  zip.loadAsync(app)
  .then(async function(appData) {
    var fileList = Object.keys(appData.files);

    if (fileList.includes('icon.png') || fileList.includes('icon.jpg')) {
      if (fileList.includes('icon.png')) {
        imgExt = "png";
      } else if (fileList.includes('icon.jpg')) {
        imgExt = "jpg";
      }

      var imgFile = zip.file("icon." + imgExt);
      var imgBlob = await getFileAs("blob", imgFile)
      var imgURL = URL.createObjectURL(imgBlob);
      img.src = imgURL;
    } else {
      img.src = "assets/imgs/xdc.svg";
    }

    if (fileList.includes('manifest.toml')) {

      var manifest = zip.file('manifest.toml');
      var manifestData = await getFileAs("string", manifest);

      var regex = /name\s*=\s*"([^"]+)"/;
      var match = manifestData.match(regex);
      if (match) {
        name.textContent = match[1];
      }
    }

    element.appendChild(checkbox);
    btn.appendChild(img);
    btn.appendChild(name);
    element.appendChild(btn);
    elements.appendChild(element);
  });
}


function createApps() {
  getLsValues();
  lsValues.forEach(function(appId) {
    localforage.getItem(appId)
    .then(function(app) {
      createApp(app, appId);
    });
  });
}

createApps();

function addApps() {
  var zip = new JSZip();
  var files = fileInput.files;
  Array.from(files).forEach(async function(file) {
    var fileName = file.name;
    if (fileName.endsWith('.xdc')) {
    var randomNumber = Math.floor(Math.random() * 100) + 1;
    var appId = fileName + "-" + randomNumber;
    localforage.setItem(appId, file)
    .then(function() {
      localStorage.setItem(appId + "file", appId);
      createApp(file, appId);
    });
    }
    
    if (fileName.endsWith('.zip')) {
      zip.loadAsync(file)
      .then(function(zipContent) {
        zipContent.forEach(async function(relativePath, fileZip) {
          var randomNumber = Math.floor(Math.random() * 100) + 1;
          var name = fileZip.name;
          var appId = name + "-" + randomNumber;
          if (relativePath.endsWith('.xdc')) {
            
            var appBlob = await getFileAs("blob", fileZip);
            var appFile = new File([appBlob], name, {type: "blob"});
            localforage.setItem(appId, appFile)
            .then(function() {
              localStorage.setItem(appId + "file", appId);
              
              createApp(appFile, appId);
            });
          }
          
        });
      });
    }
    
  });
  
  fileInput.value = "";

}

fileInput.addEventListener("change", addApps);

fileBtn.addEventListener("click", function() {
  fileInput.click();
});

function getKeys() {
  var checkboxes = document.getElementsByTagName('input');
  keys = [];

  for (var i = 0; i < checkboxes.length; i++) {
    var checkbox = checkboxes[i];
    if (checkbox.checked) {
      keys.push(checkbox.id);
    }
  }

}

function shareFile(file, fileName) {

  window.webxdc.sendToChat({
    file: {
      blob: file, name: fileName
    }
  });

}

function shareApps() {
  getKeys();
  var keysLength = keys.length;
  if (keysLength === 1) {
    var appId = keys[0];
    localforage.getItem(appId).then(function(app) {
      var appName = app.name;
      shareFile(app, appName);
    });
  } else {
    var zip = new JSZip();
    var lastApp = keys[keysLength - 1];
    keys.forEach(function(appId) {
      localforage.getItem(appId)
      .then(async function(app) {
        zip.file(appId, app);
      })
      .then(function() {
        if (appId === lastApp) {
          zip.generateAsync({
            type: "blob"
          })
          .then(function(zipFile) {
            var zipName = "Apps.zip";
            keys = [];
            shareFile(zipFile, zipName);
          });

        }
      });
    });

  }
}

shareBtn.addEventListener('click', shareApps);

function deleteApps() {
  getKeys();
  var lastAppId = keys[keys.length - 1];
  keys.forEach(function(appId) {
    localforage.removeItem(appId)
    .then(async function() {
      localStorage.removeItem(appId + "file");
      var app = document.getElementById(appId + "div");
      apps.removeChild(app);
    }).then(function() {
      if (appId === lastAppId) {
        keys = [];
      }
    });
  });
}

deleteBtn.addEventListener('click', deleteApps);

async function fetchAsBlob(root) {
  const response = await fetch(root);
  const blob = await response.blob();
  return blob;
}



var z = new JSZip();
var f = 1;
var links = "";

function waitUntil(value, target, callback) {
  var interval = setInterval(function() {
    if (value === target) {
      clearInterval(interval);
      callback();
    }
  },
    100);
}

async function createDS() {
  var filesArray = Object.keys(z.files);
  var zLength = filesArray.length;
  waitUntil(f,
    zLength,
    async function() {

      const iconPng = await fetchAsBlob('icon.png');

      const xdcSvg = await fetchAsBlob('assets/imgs/xdc.svg');
      var indexHtml = `<!DOCTYPE html>
      <html>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="app.css">
      </head>
      <body align="middle">
      <h3>Delta Shortcuts</h3>
      <hr>
      ${links}
      <script src="app.js"></script>
      </body>
      </html>`;

      var manifestToml = `name = "Delta-Shortcuts"`;

      var appJs = `function openApp(link) {
      location.href = link;
      }
      `;
      var dsJs = `document.addEventListener("DOMContentLoaded", back);
      function back() {
      var link = document.createElement('button');
      link.onclick = function() {
      location.href = "/index.html";
      };
      link.style.display = "block";
      link.style.width = "12%";
      link.style.border = "none";
      link.backgroundColor = "transparent";
      link.style.maxWidth = "5em";
      link.style.maxHeight = "5em";
      link.style.textAlign = "left";
      var img = document.createElement('img');
      img.src = "/left.svg";
      img.style.width = "90%";
      img.backgroundColor = "transparent";
      img.style.maxWidth = "4em";
      img.style.maxHeight = "4em";
      link.appendChild(img);
      document.body.insertBefore(link, document.body.firstChild);
      }`;

      var appCss = `@media (prefers-color-scheme: dark) {
      :root {
      --text-color: #fff;
      --bg-color: #0d1117;
      --btn-color: #161b22;
      }
      }
      body {
      color: var(--text-color, #000);
      background-color: var(--bg-color, #fff);
      }
      button {
      color: var(--text-color, #000);
      background-color: var(--btn-color, #ddd);
      }
      button:hover, button:focus, button:active {
      color: var(--text-color, #000);
      background-color: #1670FE;
      }
      button {
      display: inline-block;
      width: 18%;
      border: none;
      border-radius: 15%;
      margin: 2px;
      }
      button img {
      width: 100%;
      border-radius: 15%;
      }
      button span {
      font-size: 60%;
      word-wrap: break-word;
      }
      h3 {
      color: #1670FE;
      }
      hr {
      border-color: #1670FE;
      }
      `;

      var leftSvg = `<svg fill="#1670FE" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M134.059 296H436c6.627 0 12-5.373 12-12v-56c0-6.627-5.373-12-12-12H134.059v-46.059c0-21.382-25.851-32.09-40.971-16.971L7.029 239.029c-9.373 9.373-9.373 24.569 0 33.941l86.059 86.059c15.119 15.119 40.971 4.411 40.971-16.971V296z"/></svg>`;

      z.file("icon.png", iconPng);
      z.file("xdc.svg", xdcSvg);
      z.file("left.svg", leftSvg);
      z.file("app.css", appCss);
      z.file("manifest.toml", manifestToml);
      z.file("ds.js", dsJs);
      z.file("app.js", appJs);
      z.file("index.html", indexHtml);


      DS = await z.generateAsync({
        type: "blob"
      });
      confirmShare.showModal();
      var dsSize = DS.size / 1024;
      size.textContent = dsSize.toFixed(2);
    });

}

async function getDSFiles(app, appId) {
  var zip = new JSZip();
  var fileName = app.name;
  var appContent = await zip.loadAsync(app);

  var fileList = Object.keys(appContent.files);

  var imgPath = 'xdc.svg';
  var appName = fileName;
  if (fileList.includes('icon.png')) {
    imgPath = `apps/${appId}/icon.png`;
  } else if (fileList.includes('icon.jpg')) {
    imgPath = `apps/${appId}/icon.jpg`;
  }

  if (fileList.includes('manifest.toml')) {
    var manifest = zip.file('manifest.toml');
    var manifestData = await getFileAs("string", manifest);
    var regex = /name\s*=\s*"([^"]+)"/;
    var match = manifestData.match(regex);
    if (match) {
      appName = match[1];
    }
  }

  f = f + 1;

  links += `<button onclick="openApp('apps/${appId}/index.html')"><img src="${imgPath}"><span>${appName}</span></button>`;


  appContent.forEach(async function(relativePath,
    appFile) {

    f = f + 1;

    var path = "apps/" + appId + "/" + relativePath;

    if (appFile.dir) {
      z.folder(path);
    } else {
      if (relativePath === "index.html") {
        var indexData = await getFileAs("string", appFile);
        var newIndex = indexData.replace(`</head>`, `<script src="/ds.js"></script>
        </head>`);
        z.file(path, newIndex);
      } else {
        var file = await getFileAs("blob",
          appFile);
        z.file(path, file);
      }
    }
    createDS();
  });
}

function getDS() {
  getKeys();
  var keysLength = keys.length;
  var lastFile = keys[keysLength - 1];
  if (keysLength > 1) {

    keys.forEach(function(appId) {
      localforage.getItem(appId)
      .then(function(app) {
        getDSFiles(app, appId);
      });
    });

  }
}

dsBtn.addEventListener('click', getDS);


shareDS.addEventListener('click', function() {
  shareFile(DS, "Delta-Shortcuts.xdc");
});

cancelShare.addEventListener('click', function() {
  links = "";
  f = 1;
  z = new JSZip();
  confirmShare.close();
});