var log = document.getElementById('log');
var imgArea = document.getElementById('img-area');

function p(msg) {
  log.textContent += '\n' + msg;
  log.scrollTop = 9999;
}

p('JS carregou OK via arquivo externo.');
p('URL: ' + window.location.href);

// Teste 1
document.getElementById('btn1').addEventListener('click', function() {
  document.getElementById('btn1').className = 'btn ok';
  p('TESTE 1 OK - JS basico funciona');
});

// Teste 2
document.getElementById('btn2').addEventListener('click', function() {
  try {
    localStorage.setItem('teste', '123');
    var v = localStorage.getItem('teste');
    if (v === '123') {
      document.getElementById('btn2').className = 'btn ok';
      p('TESTE 2 OK - localStorage funciona');
    } else {
      p('TESTE 2 FALHOU - valor incorreto: ' + v);
    }
    localStorage.removeItem('teste');
  } catch(e) {
    p('TESTE 2 ERRO - ' + e.message);
  }
});

// Teste 3
document.getElementById('btn3').addEventListener('click', function() {
  var el = document.querySelector('#btn3');
  if (el) {
    document.getElementById('btn3').className = 'btn ok';
    p('TESTE 3 OK - querySelector funciona');
  } else {
    p('TESTE 3 FALHOU - elemento nao encontrado');
  }
});

// Teste 4 - upload
document.getElementById('file-inp').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) { p('UPLOAD - nenhum arquivo'); return; }
  p('UPLOAD - arquivo: ' + file.name + ' (' + Math.round(file.size/1024) + 'KB)');

  var reader = new FileReader();
  reader.onload = function(ev) {
    var data = ev.target.result;
    p('UPLOAD - FileReader OK: ' + Math.round(data.length/1024) + 'KB');
    imgArea.innerHTML = '';
    var img = document.createElement('img');
    img.onload = function() { p('UPLOAD - imagem exibida OK ' + img.naturalWidth + 'x' + img.naturalHeight); };
    img.onerror = function() { p('UPLOAD - ERRO ao exibir img'); };
    img.src = data;
    imgArea.appendChild(img);
  };
  reader.onerror = function() { p('UPLOAD - FileReader ERRO'); };
  reader.readAsDataURL(file);
  e.target.value = '';
});

p('Todos os listeners registrados. Pode testar.');
