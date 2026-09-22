/**
 * 拼豆记录 App
 * - 首页（拼豆消耗记录）/ 豆池 / 豆色配置 / 记录详情
 * - 库存与记录均保存在 localStorage
 */
(function () {
  'use strict';

  /* ================= 数据层 ================= */

  var SERIES_CONFIG = {
    A: 26, B: 32, C: 29, D: 26, E: 24,
    F: 25, G: 21, H: 23, M: 15
  };
  var COLOR_SERIES = Object.keys(SERIES_CONFIG);

  var STORE_KEY = 'pindou_stocks_v1';
  var RECORD_KEY = 'pindou_records_v1';

  var stocks = loadJson(STORE_KEY, {});
  var records = loadJson(RECORD_KEY, []);

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveStocks() {
    localStorage.setItem(STORE_KEY, JSON.stringify(stocks));
  }

  function saveRecords() {
    localStorage.setItem(RECORD_KEY, JSON.stringify(records));
  }

  function getStock(colorId) {
    var v = Number(stocks[colorId]);
    return isFinite(v) && v > 0 ? v : 0;
  }

  function getSeriesTotal(series) {
    var total = 0;
    for (var i = 1; i <= SERIES_CONFIG[series]; i++) {
      total += getStock(series + i);
    }
    return total;
  }

  function getColorIds(series) {
    var ids = [];
    for (var i = 1; i <= SERIES_CONFIG[series]; i++) {
      ids.push(series + i);
    }
    return ids;
  }

  /* ================= 吐司 ================= */

  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 3000);
  }

  /* ================= 页面 / Tab 切换 ================= */

  var tabItems = document.querySelectorAll('.tab-item');
  var pages = document.querySelectorAll('.page');

  function showPage(target) {
    tabItems.forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.target === target);
    });
    pages.forEach(function (page) {
      page.classList.toggle('is-active', page.dataset.page === target);
    });
  }

  tabItems.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showPage(tab.dataset.target);
    });
  });

  /* ================= 豆池列表 ================= */

  function settingIconSvg() {
    return (
      '<svg width="28" height="22" viewBox="0 0 28 22" fill="none" ' +
      'stroke="currentColor" stroke-width="2.3" stroke-linecap="round">' +
      '<path d="M2 3h24"/>' +
      '<path d="M2 8.7h18"/>' +
      '<path d="M2 14.3h24"/>' +
      '<path d="M2 20h12"/>' +
      '</svg>'
    );
  }

  function renderPoolList() {
    var list = document.getElementById('poolList');
    if (!list) return;

    list.innerHTML = COLOR_SERIES.map(function (key) {
      return (
        '<div class="pool-card" data-series="' + key + '">' +
        '<span class="pool-card__badge">' + key + '</span>' +
        '<span class="pool-card__text">' + key + '色系当前剩余数量：' +
        '<span class="pool-card__count" data-series-count="' + key + '">' +
        getSeriesTotal(key) +
        '</span>' +
        '</span>' +
        '<button class="pool-card__setting" type="button" data-setting="' + key +
        '" aria-label="' + key + '色系豆色配置">' + settingIconSvg() + '</button>' +
        '</div>'
      );
    }).join('');
  }

  renderPoolList();

  document.getElementById('poolList').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-setting]');
    if (!btn) return;
    e.stopPropagation();
    openConfig(btn.dataset.setting);
  });

  /* ================= 豆色配置页 ================= */

  var configGrid = document.getElementById('configGrid');
  var configCountBar = document.getElementById('configCountBar');
  var stockInput = document.getElementById('stockInput');
  var stockError = document.getElementById('stockError');

  var config = { series: null, colorIds: [], selected: [] };

  function openConfig(series) {
    config.series = series;
    config.colorIds = getColorIds(series);
    // 进入时不默认选中任何豆色
    config.selected = [];
    stockInput.value = '';
    stockError.textContent = '';
    renderConfigGrid();
    updateCountBar();
    showPage('config');
    tabItems.forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.target === 'pool');
    });
  }

  function renderConfigGrid() {
    var html = config.colorIds.map(function (id) {
      var selected = config.selected.indexOf(id) !== -1;
      return (
        '<button type="button" class="color-cell' +
        (selected ? ' is-selected' : '') +
        '" data-color="' + id + '">' + id + '</button>'
      );
    }).join('');

    var allSelected = config.selected.length === config.colorIds.length;
    html += (
      '<button type="button" class="color-cell' +
      (allSelected ? ' is-selected' : '') +
      '" data-select-all>全选</button>'
    );

    configGrid.innerHTML = html;
  }

  function updateCountBar() {
    if (config.selected.length === 0) {
      configCountBar.textContent = '请选择豆色';
    } else if (config.selected.length === 1) {
      var id = config.selected[0];
      configCountBar.textContent = id + '当前剩余数量：' + getStock(id);
    } else {
      var sum = config.selected.reduce(function (acc, cid) {
        return acc + getStock(cid);
      }, 0);
      configCountBar.textContent =
        '已选 ' + config.selected.length + ' 项，当前剩余数量总和：' + sum;
    }
  }

  configGrid.addEventListener('click', function (e) {
    var cell = e.target.closest('.color-cell');
    if (!cell) return;

    // 选择发生变化后，之前的错误提示（如"请先选择豆色"）不再适用
    stockError.textContent = '';

    if (cell.hasAttribute('data-select-all')) {
      var allSelected = config.selected.length === config.colorIds.length;
      // 已全选再点 = 全部取消；否则全选
      config.selected = allSelected ? [] : config.colorIds.slice();
      renderConfigGrid();
      updateCountBar();
      return;
    }

    var colorId = cell.dataset.color;
    var idx = config.selected.indexOf(colorId);
    if (idx === -1) {
      // 未选中 → 选中（可累加多选）
      config.selected.push(colorId);
    } else {
      // 已选中 → 再点一次直接取消（允许一个都不选）
      config.selected.splice(idx, 1);
    }
    renderConfigGrid();
    updateCountBar();
  });

  document.getElementById('backToPool').addEventListener('click', function () {
    showPage('pool');
  });

  stockInput.addEventListener('input', function () {
    stockError.textContent = '';
  });

  /* ================= 豆色库存保存弹窗 ================= */

  var modal = document.getElementById('confirmModal');
  var modalLine1 = document.getElementById('modalLine1');
  var modalLine2 = document.getElementById('modalLine2');
  var pendingValue = null;

  document.getElementById('saveStockBtn').addEventListener('click', function () {
    var raw = stockInput.value.trim();

    if (config.selected.length === 0) {
      stockError.textContent = '请先选择豆色';
      return;
    }

    if (raw === '' || !/^\d+$/.test(raw)) {
      stockError.textContent = '请输入非负整数的库存数量';
      stockInput.focus();
      return;
    }

    pendingValue = parseInt(raw, 10);

    var currentSum = config.selected.reduce(function (acc, id) {
      return acc + getStock(id);
    }, 0);

    if (config.selected.length === 1) {
      modalLine1.textContent = '该豆色当前库存为：' + currentSum;
      modalLine2.textContent = '该豆色保存后库存为：' + pendingValue;
    } else {
      modalLine1.textContent = '所选豆色当前总库存为：' + currentSum;
      modalLine2.textContent =
        '所选豆色保存后总库存为：' + pendingValue * config.selected.length;
    }

    modal.hidden = false;
  });

  document.getElementById('modalCancel').addEventListener('click', function () {
    modal.hidden = true;
    pendingValue = null;
  });

  document.getElementById('modalConfirm').addEventListener('click', function () {
    if (pendingValue === null) return;

    config.selected.forEach(function (id) {
      stocks[id] = pendingValue;
    });
    saveStocks();

    modal.hidden = true;
    pendingValue = null;

    renderPoolList();
    showPage('pool');
  });

  /* ================= 首页：拼豆记录列表 ================= */

  function formatDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function renderRecordList() {
    var list = document.getElementById('recordList');
    if (!list) return;

    // 最新创建的排在最上面（创建按钮之下）
    var html = records.slice().reverse().map(function (r) {
      return (
        '<div class="record-swipe" data-record="' + r.id + '">' +
        '<button class="record-del" type="button" data-del="' + r.id + '">删除</button>' +
        '<button class="record-card" type="button" data-record-card="' + r.id + '">' +
        '<p class="record-card__name"></p>' +
        '<p class="record-card__date">创建日期：' + formatDate(r.createdAt) + '</p>' +
        '</button>' +
        '</div>'
      );
    }).join('');

    list.innerHTML = html;

    // 名称通过 textContent 写入，避免转义问题
    list.querySelectorAll('.record-swipe').forEach(function (wrap) {
      var id = wrap.dataset.record;
      var record = records.filter(function (r) { return String(r.id) === String(id); })[0];
      if (record) {
        wrap.querySelector('.record-card__name').textContent = record.name;
      }
    });
  }

  renderRecordList();

  // 点击记录进入详情（左滑位移不算点击）
  document.getElementById('recordList').addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      deleteRecord(delBtn.dataset.del);
      return;
    }
    var card = e.target.closest('[data-record-card]');
    // 刚结束横向拖拽时不触发进入详情
    if (card && swipe.moved) return;
    if (card && !card.classList.contains('is-open')) {
      openRecordDetail(card.dataset.recordCard);
    } else if (card && card.classList.contains('is-open')) {
      // 已展开删除按钮时，再点一次仅收起
      closeAllSwipe();
    }
  });

  function deleteRecord(id) {
    // 注：删除记录暂不返还库存，规则后续再定
    records = records.filter(function (r) { return String(r.id) !== String(id); });
    saveRecords();
    renderRecordList();
  }

  /* ---------- 左滑删除（Pointer Events，兼容触屏与鼠标拖拽） ---------- */

  var swipe = { card: null, pointerId: null, startX: 0, startY: 0, dx: 0, locked: null, moved: false };

  function closeAllSwipe(except) {
    document.querySelectorAll('.record-card.is-open').forEach(function (c) {
      if (c !== except) c.classList.remove('is-open');
    });
  }

  function cardBaseOffset(card) {
    return card.classList.contains('is-open') ? -78 : 0;
  }

  var recordListEl = document.getElementById('recordList');

  recordListEl.addEventListener('pointerdown', function (e) {
    var card = e.target.closest('.record-card');
    if (!card) return;
    swipe.card = card;
    swipe.pointerId = e.pointerId;
    swipe.startX = e.clientX;
    swipe.startY = e.clientY;
    swipe.dx = cardBaseOffset(card);
    swipe.locked = null;
    swipe.moved = false;
    try { card.setPointerCapture && card.setPointerCapture(e.pointerId); } catch (err) {}
    card.style.transition = 'none';
  });

  recordListEl.addEventListener('pointermove', function (e) {
    if (!swipe.card || e.pointerId !== swipe.pointerId) return;
    var deltaX = e.clientX - swipe.startX;
    var deltaY = e.clientY - swipe.startY;

    if (swipe.locked === null) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      swipe.locked = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }
    if (swipe.locked !== 'x') return;

    swipe.moved = true;
    var next = Math.max(-90, Math.min(0, cardBaseOffset(swipe.card) + deltaX));
    swipe.dx = next;
    swipe.card.style.transform = 'translateX(' + next + 'px)';
  });

  function endSwipe() {
    if (!swipe.card) return;
    var card = swipe.card;
    card.style.transition = '';
    card.style.transform = '';

    if (swipe.locked === 'x') {
      closeAllSwipe(card);
      if (swipe.dx < -40) {
        card.classList.add('is-open');
      } else {
        card.classList.remove('is-open');
      }
    }
    swipe.card = null;
    swipe.pointerId = null;
  }

  recordListEl.addEventListener('pointerup', endSwipe);
  recordListEl.addEventListener('pointercancel', endSwipe);

  /* ================= 记录详情页 ================= */

  var detailGrid = document.getElementById('detailGrid');

  function openRecordDetail(id) {
    var record = records.filter(function (r) { return String(r.id) === String(id); })[0];
    if (!record) return;

    detailGrid.innerHTML = record.items.map(function (item) {
      return (
        '<div class="detail-card">' +
        '<span class="detail-card__badge"></span>' +
        '<div class="detail-card__lines">' +
        '<p>已消耗：<span class="d-consumed"></span></p>' +
        '<p>剩余库存：<span class="d-remain"></span></p>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    var cards = detailGrid.querySelectorAll('.detail-card');
    record.items.forEach(function (item, i) {
      cards[i].querySelector('.detail-card__badge').textContent = item.color;
      cards[i].querySelector('.d-consumed').textContent = item.consumed;
      // 剩余库存取豆池当前最新库存
      cards[i].querySelector('.d-remain').textContent = getStock(item.color);
    });

    showPage('detail');
    tabItems.forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.target === 'home');
    });
  }

  document.getElementById('backToHome').addEventListener('click', function () {
    showPage('home');
  });

  /* ================= 创建拼豆记录：底部抽屉 ================= */

  var sheetMask = document.getElementById('sheetMask');
  var sheet = document.getElementById('createSheet');
  var beanRowsEl = document.getElementById('beanRows');
  var beanSectionLabel = document.getElementById('beanSectionLabel');
  var plateNameInput = document.getElementById('plateName');

  // 抽屉内的行状态：[{ series:'A', color:'A1' }]，数量从 DOM 输入框读取
  var beanRows = [];

  function seriesOptionsHtml(selected) {
    return COLOR_SERIES.map(function (s) {
      return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
  }

  function colorOptionsHtml(series, selected) {
    return getColorIds(series).map(function (cid) {
      return '<option value="' + cid + '"' + (cid === selected ? ' selected' : '') + '>' + cid + '</option>';
    }).join('');
  }

  /** 新增行的默认值：选第一个尚未被其他行使用的色号 */
  function firstFreeColor(excludeIndex) {
    var used = {};
    beanRows.forEach(function (row, i) {
      if (i !== excludeIndex) used[row.color] = true;
    });
    for (var s = 0; s < COLOR_SERIES.length; s++) {
      var ids = getColorIds(COLOR_SERIES[s]);
      for (var k = 0; k < ids.length; k++) {
        if (!used[ids[k]]) return { series: COLOR_SERIES[s], color: ids[k] };
      }
    }
    return { series: 'A', color: 'A1' };
  }

  function renderBeanRows() {
    beanSectionLabel.textContent = beanRows.length > 1 ? '配置豆池' : '选择豆色';

    beanRowsEl.innerHTML = beanRows.map(function (row, index) {
      var isLast = index === beanRows.length - 1;
      var isFirst = index === 0;
      return (
        '<div class="bean-row" data-row="' + index + '">' +
        '<div class="bean-row__pills">' +
        '<div class="select-pill"><select data-field="series">' +
        seriesOptionsHtml(row.series) + '</select></div>' +
        '<div class="select-pill"><select data-field="color">' +
        colorOptionsHtml(row.series, row.color) + '</select></div>' +
        '</div>' +
        '<div class="bean-row__num">' +
        '<input class="sheet-pill" data-field="consumed" type="number" ' +
        'inputmode="numeric" min="1" step="1" placeholder="请输入" />' +
        '<button class="round-btn" type="button" data-add' +
        (isLast ? '' : ' hidden') + '>+</button>' +
        '<button class="round-btn" type="button" data-remove' +
        (isFirst ? ' hidden' : '') + '>&minus;</button>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function openSheet() {
    // 每次打开彻底重置，避免上次输入残留
    beanRows = [{ series: 'A', color: 'A1' }];
    plateNameInput.value = '';
    renderBeanRows();
    sheetMask.hidden = false;
    sheet.hidden = false;
  }

  function closeSheet() {
    sheetMask.hidden = true;
    sheet.hidden = true;
  }

  document.getElementById('createBtn').addEventListener('click', openSheet);
  sheetMask.addEventListener('click', closeSheet);

  // 名称：超过 10 个字截断并吐司
  plateNameInput.addEventListener('input', function () {
    if (plateNameInput.value.length > 10) {
      plateNameInput.value = plateNameInput.value.slice(0, 10);
      showToast('名称字数已达上限');
    }
  });

  // 行内操作（事件委托）
  beanRowsEl.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-add]');
    var removeBtn = e.target.closest('[data-remove]');
    var rowEl = e.target.closest('.bean-row');
    if (!rowEl) return;
    var index = Number(rowEl.dataset.row);

    if (addBtn) {
      var free = firstFreeColor();
      beanRows.push({ series: free.series, color: free.color });
      renderBeanRows();
      return;
    }
    if (removeBtn && beanRows.length > 1) {
      beanRows.splice(index, 1);
      renderBeanRows();
    }
  });

  beanRowsEl.addEventListener('change', function (e) {
    var select = e.target.closest('select');
    if (!select) return;
    var rowEl = select.closest('.bean-row');
    var index = Number(rowEl.dataset.row);
    var field = select.dataset.field;
    var row = beanRows[index];

    if (field === 'series') {
      var newSeries = select.value;
      // 切换色系后，默认选该色系第一个未被占用的色号
      var used = {};
      beanRows.forEach(function (r, i) { if (i !== index) used[r.color] = true; });
      var ids = getColorIds(newSeries);
      var pick = ids[0];
      for (var i = 0; i < ids.length; i++) {
        if (!used[ids[i]]) { pick = ids[i]; break; }
      }
      row.series = newSeries;
      row.color = pick;
      renderBeanRows();
      return;
    }

    if (field === 'color') {
      var newColor = select.value;
      var duplicate = beanRows.some(function (r, i) {
        return i !== index && r.color === newColor;
      });
      if (duplicate) {
        showToast('该豆色已添加');
        // 回退该行下拉框
        rowEl.querySelector('[data-field="color"]').value = row.color;
        return;
      }
      row.color = newColor;
      row.series = newColor.charAt(0);
    }
  });

  // 保存拼豆记录
  document.getElementById('sheetSaveBtn').addEventListener('click', function () {
    var name = plateNameInput.value.trim();
    if (name === '') {
      showToast('请输入豆盘名称');
      return;
    }

    var rowEls = beanRowsEl.querySelectorAll('.bean-row');
    var items = [];

    for (var i = 0; i < rowEls.length; i++) {
      var row = beanRows[i];
      var raw = rowEls[i].querySelector('[data-field="consumed"]').value.trim();

      // 每行都必填，且为正整数
      if (raw === '' || !/^\d+$/.test(raw) || parseInt(raw, 10) < 1) {
        showToast('请完善所有豆色的消耗数量');
        return;
      }

      var consumed = parseInt(raw, 10);
      if (consumed > getStock(row.color)) {
        showToast('超出当前库存数');
        return;
      }

      items.push({ color: row.color, consumed: consumed });
    }

    // 立即扣减库存
    items.forEach(function (item) {
      stocks[item.color] = getStock(item.color) - item.consumed;
    });
    saveStocks();

    // 保存记录
    records.push({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name,
      createdAt: Date.now(),
      items: items
    });
    saveRecords();

    closeSheet();
    renderRecordList();
    renderPoolList();
  });
})();
