
(function () {
  'use strict';

  var KEY = 'gestao_doacoes_v1';
  var MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var TIPO_COR = { Alimentos: '#3D5A80', Roupas: '#9A6B2F', Higiene: '#7A4E7E' };

  var items = [];
  var editId = null;
  var draft = { tipo: '', size: '' };

  /* ---------------- utils ---------------- */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function parseD(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length !== 3) return null;
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function br(s) { var d = parseD(s); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : '\u2014'; }
  function dias(s) {
    var d = parseD(s); if (!d) return null;
    return Math.round((d - today()) / 86400000);
  }
  /* semáforo de validade */
  function vstat(it) {
    if (it.tipo !== 'Alimentos' || !it.validade) return null;
    var n = dias(it.validade);
    if (n < 0) return { k: 'exp', cor: '#B3261E', txt: 'Vencido h\u00e1 ' + Math.abs(n) + 'd' };
    if (n <= 30) return { k: 'soon', cor: '#B8860B', txt: 'Vence em ' + n + 'd' };
    return { k: 'ok', cor: '#2F7D4F', txt: 'Vence em ' + n + 'd' };
  }
  function qtdTxt(it) {
    var n = Number(it.qtd) || 0;
    var s = (n % 1 === 0) ? String(n) : n.toFixed(2).replace('.', ',');
    return s + ' ' + (it.tipo === 'Alimentos' ? 'kg' : 'un');
  }
  function toast(msg, warn) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (warn ? ' warn' : '');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  /* ---------------- storage (Firebase Firestore) ---------------- */
  function load() { items = []; }
  function save() {
    window.DonationBackend.save(items);
  }
  function seed() {
    var d = today(), out = [], id = 1;
    function add(tipo, nome, qtd, mesAtras, size, valDias, baixa) {
      var dt = new Date(d.getFullYear(), d.getMonth() - mesAtras, Math.min(10 + (id % 15), 28));
      var o = { id: id++, tipo: tipo, nome: nome, qtd: qtd, data: iso(dt), size: size || '', validade: '', obs: '', baixa: !!baixa };
      if (valDias != null) o.validade = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + valDias));
      out.push(o);
    }
    add('Alimentos', 'Arroz tipo 1', 25, 4, null, 120);
    add('Alimentos', 'Feij\u00e3o carioca', 18, 4, null, 75);
    add('Roupas', 'Camiseta adulto', 30, 4, 'M');
    add('Alimentos', 'Macarr\u00e3o espaguete', 12, 3, null, 20);
    add('Higiene', 'Sabonete', 60, 3, null, null);
    add('Roupas', 'Cal\u00e7a jeans', 15, 3, 'G');
    add('Alimentos', 'Leite em p\u00f3', 8, 2, null, -5);
    add('Higiene', 'Creme dental', 45, 2, null, null);
    add('Roupas', 'Agasalho infantil', 22, 2, 'P');
    add('Alimentos', '\u00d3leo de soja', 14, 1, null, 45);
    add('Roupas', 'Blusa de frio', 18, 1, 'GG');
    add('Higiene', 'Papel higi\u00eanico', 80, 1, null, null);
    add('Alimentos', 'A\u00e7\u00facar refinado', 20, 0, null, 10);
    add('Roupas', 'Meia infantil', 40, 0, 'PP');
    add('Higiene', 'Shampoo', 25, 0, null, null);
    add('Alimentos', 'Farinha de trigo', 16, 0, null, 200);
    add('Roupas', 'Jaqueta adulto', 9, 5, 'XG', null, true);
    add('Alimentos', 'Biscoito', 10, 5, null, 60, true);
    return out;
  }

  /* ---------------- modal ---------------- */
  var ov = document.getElementById('ov');

  function openModal(id) {
    editId = id || null;
    draft = { tipo: '', size: '' };
    document.getElementById('mErr').className = 'err';
    document.querySelectorAll('.tipo-opt').forEach(function (e) { e.classList.remove('on'); });
    document.querySelectorAll('.sz-opt').forEach(function (e) { e.classList.remove('on'); });

    var it = null;
    if (editId) { it = items.filter(function (x) { return x.id === editId; })[0]; }

    document.getElementById('mTitle').innerHTML = it ? 'Editar arrecada\u00e7\u00e3o' : 'Nova arrecada\u00e7\u00e3o';
    document.getElementById('mSave').innerHTML = it ? 'Salvar altera\u00e7\u00f5es' : 'Salvar arrecada\u00e7\u00e3o';
    document.getElementById('mNome').value = it ? (it.nome || '') : '';
    document.getElementById('mQtd').value = it ? it.qtd : '';
    document.getElementById('mVal').value = it ? (it.validade || '') : '';
    document.getElementById('mData').value = it ? it.data : iso(today());
    document.getElementById('mObs').value = it ? (it.obs || '') : '';

    if (it) {
      draft.tipo = it.tipo; draft.size = it.size || '';
      document.querySelectorAll('.tipo-opt').forEach(function (e) {
        if (e.dataset.tipo === it.tipo) e.classList.add('on');
      });
      document.querySelectorAll('.sz-opt').forEach(function (e) {
        if (e.dataset.sz === it.size) e.classList.add('on');
      });
    }
    applyTipo();
    ov.classList.add('open');
    setTimeout(function () { document.getElementById('mNome').focus(); }, 80);
  }
  function closeModal() { ov.classList.remove('open'); editId = null; }

  /* campos condicionais */
  function applyTipo() {
    var t = draft.tipo;
    var isAli = (t === 'Alimentos'), isRou = (t === 'Roupas');
    document.getElementById('fldSize').style.display = isRou ? '' : 'none';
    document.getElementById('fldVal').style.display = isAli ? '' : 'none';
    document.getElementById('mUnit').textContent = isAli ? 'kg' : 'un';
    document.getElementById('mQtdHint').textContent = isAli
      ? 'Alimentos s\u00e3o registrados por peso, em quilos (kg).'
      : 'Informe a quantidade de itens (un).';
    document.getElementById('mQtd').step = isAli ? '0.01' : '1';
    document.getElementById('lblData').textContent = 'Data da arrecada\u00e7\u00e3o';
    previewVal();
  }
  /* pré-visualização do semáforo */
  function previewVal() {
    var box = document.getElementById('valPrev');
    var v = document.getElementById('mVal').value;
    if (draft.tipo !== 'Alimentos' || !v) { box.className = 'val-prev'; return; }
    var st = vstat({ tipo: 'Alimentos', validade: v });
    box.className = 'val-prev show';
    box.style.background = st.k === 'exp' ? '#FBEFEE' : (st.k === 'soon' ? '#FBF6E8' : '#EEF6F0');
    box.style.color = st.cor;
    box.innerHTML = '<span class="dot" style="background:' + st.cor + '"></span><span>' + st.txt +
      '. ' + (st.k === 'exp' ? 'n\u00e3o utilizar' : (st.k === 'soon' ? 'usar com prioridade' : 'prazo confort\u00e1vel')) + '</span>';
  }

  function mErr(msg) {
    var e = document.getElementById('mErr');
    e.textContent = '\u26A0 ' + msg;
    e.className = 'err show';
  }

  function saveItem() {
    var tipo = draft.tipo;
    if (!tipo) return mErr('Escolha o tipo da arrecada\u00e7\u00e3o.');
    var qtd = parseFloat(String(document.getElementById('mQtd').value).replace(',', '.'));
    if (!qtd || qtd <= 0) return mErr('Informe uma quantidade maior que zero.');
    var data = document.getElementById('mData').value;
    if (!data) return mErr('Informe a data da arrecada\u00e7\u00e3o.');
    if (tipo === 'Roupas' && !draft.size) return mErr('Escolha o tamanho da pe\u00e7a.');
    var val = document.getElementById('mVal').value;
    if (tipo === 'Alimentos' && !val) return mErr('Informe a data de validade do alimento.');

    var nome = document.getElementById('mNome').value.trim() || tipo;
    var obs = document.getElementById('mObs').value.trim();

    if (editId) {
      var it = items.filter(function (x) { return x.id === editId; })[0];
      if (it) {
        it.tipo = tipo; it.nome = nome; it.qtd = qtd; it.data = data;
        it.size = (tipo === 'Roupas') ? draft.size : '';
        it.validade = (tipo === 'Alimentos') ? val : '';
        it.obs = obs;
      }
      toast('Arrecada\u00e7\u00e3o atualizada');
    } else {
      var nid = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      items.push({
        id: nid, tipo: tipo, nome: nome, qtd: qtd, data: data,
        size: (tipo === 'Roupas') ? draft.size : '',
        validade: (tipo === 'Alimentos') ? val : '',
        obs: obs, baixa: false
      });
      toast('' + nome + ' registrado na tabela');
    }
    save(); closeModal(); renderAll();
  }

  /* ---------------- linhas ---------------- */
  function rowHtml(it, withActions) {
    var st = vstat(it);
    var val = st
      ? '<span class="val" style="color:' + st.cor + '"><span class="dot" style="background:' + st.cor +
        '"></span>' + br(it.validade) + '</span>'
      : '<span class="muted">\u2014</span>';
    function stt(c, t) { return '<span class="st"><span class="dot" style="background:' + c + '"></span>' + t + '</span>'; }
    var sit = it.baixa ? stt('#A9B1AC', 'Utilizado')
      : (st ? stt(st.cor, st.txt) : stt('#2F7D4F', 'Em estoque'));
    var sz = it.size ? '<span class="sz">' + esc(it.size) + '</span>' : '<span class="muted">\u2014</span>';
    var acts = '';
    if (withActions) {
      acts = '<td class="c"><div class="act">' +
        (it.baixa
          ? '<button class="abtn un" data-act="undo" data-id="' + it.id + '">Reverter</button>'
          : '<button class="abtn ok" data-act="done" data-id="' + it.id + '">Dar baixa</button>') +
        '<button class="abtn ed" data-act="edit" data-id="' + it.id + '">Editar</button>' +
        '<button class="abtn rm" data-act="del" data-id="' + it.id + '">Excluir</button>' +
        '</div></td>';
    }
    return '<tr class="' + (it.baixa ? 'done' : '') + '" data-id="' + it.id + '">' +
      '<td class="nm">' + esc(it.nome) + '</td>' +
      '<td><span class="tp"><span class="dot" style="background:' + TIPO_COR[it.tipo] + '"></span>' + esc(it.tipo) + '</span></td>' +
      '<td class="c">' + sz + '</td>' +
      '<td class="r num">' + qtdTxt(it) + '</td>' +
      '<td class="c num">' + br(it.data) + '</td>' +
      '<td class="c num">' + val + '</td>' +
      '<td>' + sit + '</td>' + acts + '</tr>';
  }

  /* ---------------- tabela 1 ---------------- */
  function renderT1() {
    var tipo = document.getElementById('f1Tipo').value;
    var vf = document.getElementById('f1Val').value;
    var q = document.getElementById('f1Busca').value.trim().toLowerCase();
    var list = items.filter(function (it) {
      if (it.baixa) return false;
      if (tipo !== 'all' && it.tipo !== tipo) return false;
      if (vf !== 'all') { var s = vstat(it); if (!s || s.k !== vf) return false; }
      if (q && (it.nome + ' ' + it.tipo + ' ' + it.size + ' ' + it.obs).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) { return b.data.localeCompare(a.data) || b.id - a.id; });
    document.querySelector('#tbl1 tbody').innerHTML = list.map(function (i) { return rowHtml(i, false); }).join('');
    document.getElementById('e1').style.display = list.length ? 'none' : '';

    var kg = 0, un = 0;
    list.forEach(function (i) { if (i.tipo === 'Alimentos') kg += +i.qtd || 0; else un += +i.qtd || 0; });
    document.getElementById('ft1n').textContent = list.length + ' itens';
    document.getElementById('ft1q').textContent =
      (kg ? kg.toFixed(kg % 1 ? 2 : 0).replace('.', ',') + ' kg' : '') + (kg && un ? '  +  ' : '') + (un ? un + ' un' : '') || '\u2014';
    var ex = list.filter(function (i) { var s = vstat(i); return s && s.k === 'exp'; }).length;
    var so = list.filter(function (i) { var s = vstat(i); return s && s.k === 'soon'; }).length;
    document.getElementById('ft1i').textContent = ex || so
      ? (so ? so + ' vencendo' : '') + (ex ? (so ? ', ' : '') + ex + ' vencido(s)' : '')
      : 'tudo dentro do prazo';

    var est = items.filter(function (i) { return !i.baixa; });
    var c = { ok: 0, soon: 0, exp: 0 };
    est.forEach(function (i) { var s = vstat(i); if (s) c[s.k]++; });
    document.getElementById('k1').textContent = est.length;
    document.getElementById('k2').textContent = c.ok;
    document.getElementById('k3').textContent = c.soon;
    document.getElementById('k4').textContent = c.exp;
  }

  /* ---------------- tabela 2 ---------------- */
  function renderT2() {
    var st = document.getElementById('f2St').value;
    var tipo = document.getElementById('f2Tipo').value;
    var q = document.getElementById('f2Busca').value.trim().toLowerCase();
    var list = items.filter(function (it) {
      if (st === 'estoque' && it.baixa) return false;
      if (st === 'baixa' && !it.baixa) return false;
      if (tipo !== 'all' && it.tipo !== tipo) return false;
      if (q && (it.nome + ' ' + it.tipo + ' ' + it.size + ' ' + it.obs).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) { return (a.baixa - b.baixa) || b.data.localeCompare(a.data) || b.id - a.id; });
    document.querySelector('#tbl2 tbody').innerHTML = list.map(function (i) { return rowHtml(i, true); }).join('');
    document.getElementById('e2').style.display = list.length ? 'none' : '';

    var est = items.filter(function (i) { return !i.baixa; });
    document.getElementById('k5').textContent = items.length;
    document.getElementById('k6').textContent = est.length;
    document.getElementById('k7').textContent = items.length - est.length;
    document.getElementById('k8').textContent = est.filter(function (i) {
      var s = vstat(i); return s && s.k === 'exp';
    }).length;
  }

  /* ---------------- gráficos ---------------- */
  var pie = null, line = null, bar = null;

  function baseOpts() {
    Chart.defaults.font.family = "'Public Sans', Arial, sans-serif";
    Chart.defaults.color = '#4B5651';
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {} }
    };
  }

  var centro = {
    id: 'centro',
    afterDatasetsDraw: function (ch) {
      var ds = ch.data.datasets[0];
      var tot = ds.data.reduce(function (a, b) { return a + b; }, 0);
      var ctx = ch.ctx;
      var cx = (ch.chartArea.left + ch.chartArea.right) / 2;
      var cy = (ch.chartArea.top + ch.chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4B5651'; ctx.font = '700 12px Public Sans, Arial, sans-serif';
      ctx.fillText('Total', cx, cy - 20);
      ctx.fillStyle = '#1F2623'; ctx.font = '800 34px Public Sans, Arial, sans-serif';
      ctx.fillText(tot, cx, cy + 5);
      ctx.fillStyle = '#4B5651'; ctx.font = '600 10px Public Sans, Arial, sans-serif';
      ctx.fillText('itens', cx, cy + 27);
      ctx.restore();
      if (!tot) return;
      ctx.save();
      ch.getDatasetMeta(0).data.forEach(function (arc, i) {
        var v = ds.data[i]; if (!v) return;
        var pct = v / tot * 100;
        var ang = (arc.startAngle + arc.endAngle) / 2;
        var rad = (arc.innerRadius + arc.outerRadius) / 2;
        var x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
        var txt = v + ' (' + pct.toFixed(1) + '%)';
        ctx.font = '800 12px Public Sans, Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineJoin = 'round';
        ctx.strokeText(txt, x, y);
        ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y);
      });
      ctx.restore();
    }
  };

  function renderCharts() {
    var TP = ['Alimentos', 'Roupas', 'Higiene'];
    var cnt = { Alimentos: 0, Roupas: 0, Higiene: 0 };
    items.forEach(function (i) { if (cnt[i.tipo] != null) cnt[i.tipo]++; });
    var tot = items.length || 1;

    /* ---- pizza ---- */
    if (!pie) {
      pie = new Chart(document.getElementById('pieTipo'), {
        type: 'doughnut',
        data: {
          labels: TP,
          datasets: [{ data: TP.map(function (t) { return cnt[t]; }),
            backgroundColor: TP.map(function (t) { return TIPO_COR[t]; }),
            borderWidth: 2, borderColor: '#fff' }]
        },
        options: (function () {
          var o = baseOpts(); o.cutout = '55%'; o.layout = { padding: 12 };
          o.plugins.tooltip = { callbacks: { label: function (c) {
            var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
            return c.label + ': ' + c.parsed + ' itens (' + (t ? (c.parsed / t * 100).toFixed(1) : 0) + '%)';
          } } };
          return o;
        })(),
        plugins: [centro]
      });
    } else {
      pie.data.datasets[0].data = TP.map(function (t) { return cnt[t]; });
      pie.update('none');
    }
    document.getElementById('legTipo').innerHTML = TP.map(function (t) {
      return '<div class="lg"><span class="dot" style="background:' + TIPO_COR[t] + '"></span>' +
        '<span class="lgn">' + t + '</span><span class="lgv">' + cnt[t] + '</span>' +
        '<span class="lgp">' + (cnt[t] / tot * 100).toFixed(1) + '%</span></div>';
    }).join('');

    /* ---- linha do tempo ---- */
    var byM = {};
    items.forEach(function (i) {
      var d = parseD(i.data); if (!d) return;
      var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      byM[k] = (byM[k] || 0) + 1;
    });
    var keys = Object.keys(byM).sort();
    var labs = keys.map(function (k) { return MES[+k.slice(5, 7) - 1] + '/' + k.slice(2, 4); });
    var vals = keys.map(function (k) { return byM[k]; });
    if (!line) {
      line = new Chart(document.getElementById('lineMes'), {
        type: 'line',
        data: { labels: labs, datasets: [{
          data: vals, borderColor: '#3D5A80', backgroundColor: 'rgba(61,90,128,.10)',
          borderWidth: 2, fill: true, tension: .32,
          pointBackgroundColor: '#3D5A80', pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 4, pointHoverRadius: 6
        }] },
        options: (function () {
          var o = baseOpts();
          o.layout = { padding: { top: 22 } };
          o.plugins.tooltip = { callbacks: { label: function (c) { return c.parsed.y + ' arrecada\u00e7\u00f5es'; } } };
          o.scales = {
            x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
            y: { beginAtZero: true, grid: { color: '#ECEEEB' },
                 ticks: { font: { size: 11 }, precision: 0 } }
          };
          return o;
        })(),
        plugins: [{
          id: 'lbl',
          afterDatasetsDraw: function (ch) {
            var ctx = ch.ctx;
            ch.getDatasetMeta(0).data.forEach(function (p, i) {
              var v = ch.data.datasets[0].data[i];
              ctx.save();
              ctx.font = '800 11.5px Public Sans, Arial, sans-serif';
              ctx.textAlign = 'center'; ctx.fillStyle = '#1F2623';
              ctx.fillText(v, p.x, p.y - 12);
              ctx.restore();
            });
          }
        }]
      });
    } else {
      line.data.labels = labs; line.data.datasets[0].data = vals; line.update('none');
    }

    /* ---- validade ---- */
    var ali = items.filter(function (i) { return !i.baixa && i.tipo === 'Alimentos' && i.validade; });
    ali.sort(function (a, b) { return a.validade.localeCompare(b.validade); });
    var top = ali.slice(0, 12);
    var wrap = document.getElementById('wrapVal');
    document.getElementById('e3').style.display = top.length ? 'none' : '';
    wrap.style.display = top.length ? '' : 'none';
    if (top.length) {
      wrap.style.height = Math.max(240, top.length * 34 + 40) + 'px';
      var bl = top.map(function (i) { return i.nome + '  (' + br(i.validade) + ')'; });
      var bv = top.map(function (i) { return dias(i.validade); });
      var bc = top.map(function (i) { var s = vstat(i); return s.cor; });
      if (!bar) {
        bar = new Chart(document.getElementById('barVal'), {
          type: 'bar',
          data: { labels: bl, datasets: [{ data: bv, backgroundColor: bc, borderRadius: 4, borderSkipped: false }] },
          options: (function () {
            var o = baseOpts();
            o.indexAxis = 'y';
            o.layout = { padding: { right: 46 } };
            o.plugins.tooltip = { callbacks: { label: function (c) {
              var n = c.parsed.x;
              return n < 0 ? ('Vencido h\u00e1 ' + Math.abs(n) + ' dias') : ('Faltam ' + n + ' dias');
            } } };
            o.scales = {
              x: { grid: { color: '#ECEEEB' }, ticks: { font: { size: 11 },
                   callback: function (v) { return v + 'd'; } } },
              y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, autoSkip: false } }
            };
            return o;
          })(),
          plugins: [{
            id: 'blbl',
            afterDatasetsDraw: function (ch) {
              var ctx = ch.ctx, ds = ch.data.datasets[0];
              ch.getDatasetMeta(0).data.forEach(function (b, i) {
                var v = ds.data[i];
                ctx.save();
                ctx.font = '800 11px Public Sans, Arial, sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = ds.backgroundColor[i];
                ctx.textAlign = v < 0 ? 'right' : 'left';
                ctx.fillText(v + 'd', b.x + (v < 0 ? -7 : 7), b.y);
                ctx.restore();
              });
            }
          }]
        });
      } else {
        bar.data.labels = bl;
        bar.data.datasets[0].data = bv;
        bar.data.datasets[0].backgroundColor = bc;
        bar.resize(); bar.update('none');
      }
    }

    /* ---- KPIs ---- */
    var kg = items.filter(function (i) { return i.tipo === 'Alimentos'; })
      .reduce(function (a, i) { return a + (+i.qtd || 0); }, 0);
    var ro = items.filter(function (i) { return i.tipo === 'Roupas'; })
      .reduce(function (a, i) { return a + (+i.qtd || 0); }, 0);
    var hi = items.filter(function (i) { return i.tipo === 'Higiene'; })
      .reduce(function (a, i) { return a + (+i.qtd || 0); }, 0);
    document.getElementById('k9').textContent = items.length;
    document.getElementById('k10').textContent = kg.toFixed(kg % 1 ? 1 : 0).replace('.', ',');
    document.getElementById('k11').textContent = ro;
    document.getElementById('k12').textContent = hi;
  }

  function renderAll() {
    renderT1(); renderT2(); renderCharts();
    var est = items.filter(function (i) { return !i.baixa; }).length;
    document.getElementById('hdrSub').textContent =
      'Controle de arrecada\u00e7\u00f5es \u00b7 ' + items.length + ' registros \u00b7 ' + est + ' em estoque';
  }

  /* ---------------- eventos ---------------- */
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (x) { x.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      b.classList.add('active');
      document.getElementById(b.dataset.tab).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () {
        [pie, line, bar].forEach(function (c) { if (c) { c.resize(); c.update('none'); } });
      }, 70);
    });
  });
  document.querySelectorAll('.col-header').forEach(function (h) {
    h.addEventListener('click', function () {
      var b = document.getElementById(h.dataset.target);
      var col = h.classList.toggle('collapsed');
      b.classList.toggle('hidden', col);
      var s = h.querySelector('.col-state');
      if (s) s.textContent = col ? 'Mostrar' : 'Ocultar';
      setTimeout(function () {
        [pie, line, bar].forEach(function (c) { if (c) { c.resize(); c.update('none'); } });
      }, 70);
    });
  });

  document.getElementById('btnAdd').addEventListener('click', function () { openModal(null); });
  document.getElementById('mClose').addEventListener('click', closeModal);
  document.getElementById('mCancel').addEventListener('click', closeModal);
  ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  document.querySelectorAll('.tipo-opt').forEach(function (el) {
    el.addEventListener('click', function () {
      document.querySelectorAll('.tipo-opt').forEach(function (x) { x.classList.remove('on'); });
      el.classList.add('on');
      draft.tipo = el.dataset.tipo;
      document.getElementById('mErr').className = 'err';
      applyTipo();
    });
  });
  document.querySelectorAll('.sz-opt').forEach(function (el) {
    el.addEventListener('click', function () {
      document.querySelectorAll('.sz-opt').forEach(function (x) { x.classList.remove('on'); });
      el.classList.add('on');
      draft.size = el.dataset.sz;
    });
  });
  document.getElementById('mVal').addEventListener('change', previewVal);
  document.getElementById('mVal').addEventListener('input', previewVal);
  document.getElementById('mSave').addEventListener('click', saveItem);

  ['f1Tipo', 'f1Val', 'f1Busca'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(id === 'f1Busca' ? 'input' : 'change', function () {
      var on = el.value && el.value !== 'all';
      on ? el.setAttribute('data-active', '1') : el.removeAttribute('data-active');
      renderT1();
    });
  });
  document.getElementById('f1Clear').addEventListener('click', function () {
    ['f1Tipo', 'f1Val'].forEach(function (i) {
      var e = document.getElementById(i); e.value = 'all'; e.removeAttribute('data-active');
    });
    var b = document.getElementById('f1Busca'); b.value = ''; b.removeAttribute('data-active');
    renderT1();
  });

  ['f2St', 'f2Tipo', 'f2Busca'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(id === 'f2Busca' ? 'input' : 'change', function () {
      var on = el.value && el.value !== 'all';
      on ? el.setAttribute('data-active', '1') : el.removeAttribute('data-active');
      renderT2();
    });
  });
  document.getElementById('f2Clear').addEventListener('click', function () {
    ['f2St', 'f2Tipo'].forEach(function (i) {
      var e = document.getElementById(i); e.value = 'all'; e.removeAttribute('data-active');
    });
    var b = document.getElementById('f2Busca'); b.value = ''; b.removeAttribute('data-active');
    renderT2();
  });

  /* ações da tabela 2 */
  document.getElementById('tbl2').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.abtn') : null;
    if (!b) return;
    var id = +b.dataset.id;
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    if (b.dataset.act === 'done') {
      it.baixa = true; save(); renderAll(); toast('Baixa registrada: ' + it.nome);
    } else if (b.dataset.act === 'undo') {
      it.baixa = false; save(); renderAll(); toast('\u21A9 ' + it.nome + ' voltou ao estoque');
    } else if (b.dataset.act === 'edit') {
      openModal(id);
    } else if (b.dataset.act === 'del') {
      if (confirm('Excluir definitivamente "' + it.nome + '"?\\n\\nEsta a\u00e7\u00e3o n\u00e3o pode ser desfeita.')) {
        items = items.filter(function (x) { return x.id !== id; });
        save(); renderAll(); toast('\uD83D\uDDD1 ' + it.nome + ' exclu\u00eddo', true);
      }
    }
  });

  /* ordenação das tabelas */
  [['tbl1', renderT1], ['tbl2', renderT2]].forEach(function (cfg) {
    var tid = cfg[0], dir = {};
    document.querySelectorAll('#' + tid + ' th[data-col]').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = +th.dataset.col;
        dir[col] = (dir[col] === 1) ? -1 : 1;
        document.querySelectorAll('#' + tid + ' th').forEach(function (x) { x.classList.remove('srt', 'desc'); });
        th.classList.add('srt'); if (dir[col] === -1) th.classList.add('desc');
        var tb = document.querySelector('#' + tid + ' tbody');
        var rows = Array.prototype.slice.call(tb.querySelectorAll('tr'));
        rows.sort(function (a, b) {
          var va, vb;
          if (col === 3) { va = parseFloat(a.children[3].textContent) || 0; vb = parseFloat(b.children[3].textContent) || 0; }
          else if (col === 4 || col === 5) {
            var f = function (t) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(t); return m ? m[3] + m[2] + m[1] : ''; };
            va = f(a.children[col].textContent); vb = f(b.children[col].textContent);
          } else { va = a.children[col].textContent.trim().toLowerCase(); vb = b.children[col].textContent.trim().toLowerCase(); }
          return va < vb ? -dir[col] : (va > vb ? dir[col] : 0);
        });
        rows.forEach(function (r) { tb.appendChild(r); });
      });
    });
  });

  /* exportar CSV */
  document.getElementById('btnCsv').addEventListener('click', function () {
    var head = ['Item', 'Tipo', 'Tamanho', 'Quantidade', 'Unidade', 'Data', 'Validade', 'Situacao', 'Observacoes'];
    var lines = [head.join(';')];
    items.forEach(function (i) {
      lines.push([i.nome, i.tipo, i.size || '', String(i.qtd).replace('.', ','),
        i.tipo === 'Alimentos' ? 'kg' : 'un', br(i.data), i.validade ? br(i.validade) : '',
        i.baixa ? 'Utilizado' : 'Em estoque', (i.obs || '').replace(/[;\n]/g, ' ')
      ].join(';'));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'gestao-doacoes-' + iso(today()) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
    toast('CSV exportado');
  });

  /* limpar base */
  document.getElementById('btnWipe').addEventListener('click', function () {
    if (!confirm('Apagar TODAS as arrecada\u00e7\u00f5es?\\n\\nOs dados de exemplo tamb\u00e9m ser\u00e3o removidos.')) return;
    items = []; save(); renderAll(); toast('Base zerada', true);
  });

  /* ---------------- nuvem: login + sincronização ---------------- */
  function gate(show, msg) {
    document.getElementById('gate').className = show ? 'show' : '';
    if (msg) document.getElementById('gateMsg').textContent = msg;
  }
  function initCloud() {
    var gatePwd = document.getElementById('gatePwd');
    var gateErr = document.getElementById('gateErr');
    document.getElementById('gateBtn').addEventListener('click', function () {
      gateErr.textContent = '';
      if (!gatePwd.value) return;
      window.DonationBackend.login(gatePwd.value).then(function () {
        gatePwd.value = '';
      }).catch(function (error) {
        gateErr.textContent = error.message;
      });
    });
    gatePwd.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') document.getElementById('gateBtn').click();
    });
    document.getElementById('lnkOut').addEventListener('click', function (event) {
      event.preventDefault();
      window.DonationBackend.logout();
    });

    /* importar dados do navegador antigo */
    var imp = document.getElementById('imp');
    document.getElementById('lnkImp').addEventListener('click', function (e) { e.preventDefault(); imp.className = 'show'; });
    document.getElementById('impNo').addEventListener('click', function () { imp.className = ''; });
    document.getElementById('impOk').addEventListener('click', function () {
      try {
        var arr = JSON.parse(document.getElementById('impTxt').value);
        if (!Array.isArray(arr) || !arr.length) throw 0;
        var base = Date.now() * 1000;
        arr.forEach(function (o, i) {
          var safeTipo = TIPO_COR[o && o.tipo] ? o.tipo : 'Alimentos';
          var rec = {
            id: base + i,
            nome: String(o && o.nome != null ? o.nome : ''),
            tipo: String(safeTipo),
            size: String(o && o.size != null ? o.size : ''),
            qtd: Number(o && o.qtd != null ? o.qtd : 0) || 0,
            data: String(o && o.data != null ? o.data : ''),
            validade: String(o && o.validade != null ? o.validade : ''),
            obs: String(o && o.obs != null ? o.obs : ''),
            baixa: !!(o && o.baixa)
          };
          items.push(rec);
        });
        save(); renderAll(); imp.className = ''; document.getElementById('impTxt').value = '';
        toast('' + arr.length + ' registros importados');
      } catch (x) { toast('Conte\u00fado inv\u00e1lido. Copie novamente.', true); }
    });
    window.DonationBackend.start({
      onItems: function (records) { items = records; renderAll(); },
      onGate: gate,
      onError: function (message) { toast(message, true); }
    });
  }

  /* ---------------- start ---------------- */
  load();
  renderAll();
  initCloud();
  window.addEventListener('resize', function () {
    setTimeout(function () {
      [pie, line, bar].forEach(function (c) { if (c) { c.resize(); c.update('none'); } });
    }, 120);
  });
})();
