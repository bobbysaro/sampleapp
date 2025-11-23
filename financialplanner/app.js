// Simple tab switcher
document.addEventListener('DOMContentLoaded',function(){
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p=>{
        if(p.id===target){ p.hidden = false } else { p.hidden = true }
      })
    })
  })

  // Helper to create a new table row for a section
  function createRow(type){
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    const amountTd = document.createElement('td');
    const balanceTd = document.createElement('td');
    const dateTd = document.createElement('td');
    const actionsTd = document.createElement('td');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = (type==='income')? 'Income source' : (type==='utilities')? 'Utility name' : 'Bill name';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.step = '0.01';
    amountInput.placeholder = '0.00';
    amountInput.className = 'amount-input';
    amountInput.addEventListener('input',()=> calculateTotal(type));

    // optional balance field only for bills
    let balanceInput = null;
    if(type === 'bills'){
      balanceInput = document.createElement('input');
      balanceInput.type = 'number';
      balanceInput.step = '0.01';
      balanceInput.placeholder = '0.00';
      balanceInput.className = 'balance-input';
      balanceInput.addEventListener('input',()=> calculateTotal(type));
    }

    const dateInput = document.createElement('input');
    dateInput.type = 'date';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete-row';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click',()=>{ tr.remove(); calculateTotal(type); });

    nameTd.appendChild(nameInput);
    amountTd.appendChild(amountInput);
    if(type === 'bills') balanceTd.appendChild(balanceInput);
    dateTd.appendChild(dateInput);
    actionsTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(amountTd);
    if(type === 'bills') tr.appendChild(balanceTd);
    tr.appendChild(dateTd);
    tr.appendChild(actionsTd);
    return tr;
  }

  function formatCurrency(n){
    return '$' + Number(n || 0).toFixed(2);
  }

  function calculateTotal(sectionId){
    const section = document.getElementById(sectionId);
    if(!section) return;
    // sum only the amount inputs for the main total
    const amounts = section.querySelectorAll('input.amount-input');
    let total = 0;
    amounts.forEach(a=>{
      const v = parseFloat(a.value);
      if(!isNaN(v)) total += v;
    });
    const span = document.querySelector('.total-amount[data-for="'+sectionId+'"]');
    if(span) span.textContent = formatCurrency(total);

    // if bills, also compute balance total
    if(sectionId === 'bills'){
      const balances = section.querySelectorAll('input.balance-input');
      let btotal = 0;
      balances.forEach(a=>{
        const v = parseFloat(a.value);
        if(!isNaN(v)) btotal += v;
      });
      const bspan = document.querySelector('.total-amount[data-for="bills-balance"]');
      if(bspan) bspan.textContent = formatCurrency(btotal);
    }
  }

  // Initialize each tab with one row
  ['income','utilities','bills'].forEach(sectionId=>{
    const section = document.getElementById(sectionId);
    const tbody = section.querySelector('tbody');
    tbody.appendChild(createRow(sectionId));
    calculateTotal(sectionId);
  });

  // Add row buttons
  document.querySelectorAll('.add-row').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const target = btn.dataset.target;
      const section = document.getElementById(target);
      const tbody = section.querySelector('tbody');
      tbody.appendChild(createRow(target));
      calculateTotal(target);
    })
  });

  // Save / Load support using localStorage
  function storageKey(sectionId){ return 'financialplanner_' + sectionId }

  function saveTab(sectionId){
    const section = document.getElementById(sectionId);
    if(!section) return;
    const rows = [];
    section.querySelectorAll('tbody tr').forEach(tr=>{
      const name = (tr.querySelector('input[type="text"]') || {}).value || '';
      const amountEl = tr.querySelector('input.amount-input');
      const amount = amountEl && amountEl.value !== '' ? parseFloat(amountEl.value) : '';
      const date = (tr.querySelector('input[type="date"]') || {}).value || '';
      let balance = '';
      const balEl = tr.querySelector('input.balance-input');
      if(balEl) balance = balEl.value !== '' ? parseFloat(balEl.value) : '';
      rows.push({name,amount,date,balance});
    });
    try{
      localStorage.setItem(storageKey(sectionId), JSON.stringify(rows));
      console.info('Saved', rows.length, 'rows to', storageKey(sectionId));
    }catch(e){ console.error('Save failed', e) }
    // also try to POST to local backend to append to CSV files (if available)
    saveToServer(sectionId, rows).then(ok=>{
      if(ok) console.info('Saved to server for', sectionId);
    }).catch(err=>{
      console.warn('Server save failed (is server running?)', err);
    });
  }

  async function saveToServer(sectionId, rows){
    try{
      const res = await fetch('http://127.0.0.1:5000/save/' + sectionId, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({rows})
      });
      if(!res.ok){
        const txt = await res.text();
        throw new Error('server error: ' + res.status + ' ' + txt);
      }
      return true;
    }catch(e){
      throw e;
    }
  }

  function clearRows(sectionId){
    const section = document.getElementById(sectionId);
    const tbody = section.querySelector('tbody');
    tbody.innerHTML = '';
  }

  function loadTab(sectionId){
    const raw = localStorage.getItem(storageKey(sectionId));
    if(!raw) return false;
    let rows = [];
    try{ rows = JSON.parse(raw) }catch(e){ console.error('Load parse error', e); return false }
    const section = document.getElementById(sectionId);
    if(!section) return false;
    const tbody = section.querySelector('tbody');
    // if no saved rows, do nothing
    if(!rows || rows.length === 0) return false;
    tbody.innerHTML = '';
    rows.forEach(r=>{
      const tr = createRow(sectionId);
      const nameEl = tr.querySelector('input[type="text"]');
      const amountEl = tr.querySelector('input.amount-input');
      const dateEl = tr.querySelector('input[type="date"]');
      if(nameEl) nameEl.value = r.name || '';
      if(amountEl) amountEl.value = (r.amount !== '' && r.amount !== null && r.amount !== undefined) ? r.amount : '';
      if(dateEl) dateEl.value = r.date || '';
      const balEl = tr.querySelector('input.balance-input');
      if(balEl) balEl.value = (r.balance !== '' && r.balance !== null && r.balance !== undefined) ? r.balance : '';
      tbody.appendChild(tr);
    });
    calculateTotal(sectionId);
    return true;
  }

  // wire save/load buttons
  document.querySelectorAll('.save-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      saveTab(btn.dataset.target);
      btn.textContent = 'Saved';
      setTimeout(()=> btn.textContent = (btn.dataset.target==='income')? 'Save Income' : (btn.dataset.target==='utilities')? 'Save Utilities' : 'Save Bills', 900);
    })
  });
  document.querySelectorAll('.load-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const ok = loadTab(btn.dataset.target);
      if(!ok) {
        btn.textContent = 'No Save';
        setTimeout(()=> btn.textContent = (btn.dataset.target==='income')? 'Load Income' : (btn.dataset.target==='utilities')? 'Load Utilities' : 'Load Bills', 900);
      } else {
        btn.textContent = 'Loaded';
        setTimeout(()=> btn.textContent = (btn.dataset.target==='income')? 'Load Income' : (btn.dataset.target==='utilities')? 'Load Utilities' : 'Load Bills', 900);
      }
    })
  });

  // Auto-load saved data if present
  ['income','utilities','bills'].forEach(id=>{
    const loaded = loadTab(id);
    if(!loaded){
      // ensure at least one row is present (already added earlier)
      // calculate totals for the existing row
      calculateTotal(id);
    }
  });

  // ----------------
  // Export / Import
  // ----------------
  function gatherRows(sectionId){
    const section = document.getElementById(sectionId);
    if(!section) return [];
    const rows = [];
    section.querySelectorAll('tbody tr').forEach(tr=>{
      const name = (tr.querySelector('input[type="text"]') || {}).value || '';
      const amountEl = tr.querySelector('input.amount-input');
      const amount = amountEl && amountEl.value !== '' ? parseFloat(amountEl.value) : '';
      const date = (tr.querySelector('input[type="date"]') || {}).value || '';
      let balance = '';
      const balEl = tr.querySelector('input.balance-input');
      if(balEl) balance = balEl.value !== '' ? parseFloat(balEl.value) : '';
      rows.push({name,amount,date,balance});
    });
    return rows;
  }

  function downloadBlob(filename, content, type='application/json'){
    const blob = new Blob([content], {type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }

  function exportJSON(sectionId){
    const rows = gatherRows(sectionId);
    const name = sectionId + '-' + new Date().toISOString().slice(0,10) + '.json';
    downloadBlob(name, JSON.stringify(rows, null, 2), 'application/json');
  }

  function toCSV(rows, sectionId){
    const header = (sectionId === 'bills') ? ['name','amount','balance','date'] : ['name','amount','date'];
    const escape = v => {
      if(v === null || v === undefined) return '';
      const s = String(v);
      if(s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    };
    const lines = [header.join(',')];
    rows.forEach(r=>{
      if(sectionId === 'bills'){
        lines.push([escape(r.name), escape(r.amount), escape(r.balance), escape(r.date)].join(','));
      } else {
        lines.push([escape(r.name), escape(r.amount), escape(r.date)].join(','));
      }
    });
    return lines.join('\n');
  }

  function exportCSV(sectionId){
    const rows = gatherRows(sectionId);
    const csv = toCSV(rows, sectionId);
    const name = sectionId + '-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadBlob(name, csv, 'text/csv');
  }

  function parseCSV(text){
    // Very small CSV parser that handles quoted fields and commas inside quotes.
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l=>l.trim() !== '');
    if(lines.length === 0) return rows;
    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for(let i=0;i<line.length;i++){
        const ch = line[i];
        if(inQuotes){
          if(ch === '"'){
            if(line[i+1] === '"'){ cur += '"'; i++; } else { inQuotes = false; }
          } else { cur += ch }
        } else {
          if(ch === ','){ result.push(cur); cur = ''; }
          else if(ch === '"'){ inQuotes = true; }
          else { cur += ch }
        }
      }
      result.push(cur);
      return result;
    };
    const header = parseLine(lines[0]).map(h=>h.trim().toLowerCase());
    for(let r=1;r<lines.length;r++){
      const fields = parseLine(lines[r]);
      const obj = {};
      header.forEach((h, idx)=>{
        obj[h] = fields[idx] !== undefined ? fields[idx] : '';
      });
      rows.push(obj);
    }
    return {header, rows};
  }

  function importDataToSection(sectionId, rows){
    // rows is array of objects possibly with keys: name, amount, date, balance
    const section = document.getElementById(sectionId);
    const tbody = section.querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach(r=>{
      const tr = createRow(sectionId);
      const nameEl = tr.querySelector('input[type="text"]');
      const amountEl = tr.querySelector('input.amount-input');
      const dateEl = tr.querySelector('input[type="date"]');
      if(nameEl) nameEl.value = r.name || r[ 'name' ] || r[Object.keys(r)[0]] || '';
      if(amountEl) amountEl.value = (r.amount !== '' && r.amount !== null && r.amount !== undefined) ? r.amount : '';
      if(dateEl) dateEl.value = r.date || r[ 'date' ] || '';
      const balEl = tr.querySelector('input.balance-input');
      if(balEl) balEl.value = (r.balance !== '' && r.balance !== null && r.balance !== undefined) ? r.balance : (r['bal'] || r['balance'] || '');
      tbody.appendChild(tr);
    });
    calculateTotal(sectionId);
  }

  // wire export buttons
  document.querySelectorAll('.export-json').forEach(btn=> btn.addEventListener('click', ()=> exportJSON(btn.dataset.target)));
  document.querySelectorAll('.export-csv').forEach(btn=> btn.addEventListener('click', ()=> exportCSV(btn.dataset.target)));

  // wire import UI: buttons open file input; file inputs parse and import
  document.querySelectorAll('.import-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.target;
      const input = document.querySelector('.import-file[data-target="'+target+'"]');
      if(input) input.click();
    });
  });
  document.querySelectorAll('.import-file').forEach(input=>{
    input.addEventListener('change', (ev)=>{
      const file = ev.target.files && ev.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const target = input.dataset.target;
        // try JSON first
        let parsed = null;
        try{
          const trimmed = text.trim();
          if(trimmed.startsWith('{') || trimmed.startsWith('[')){
            parsed = JSON.parse(trimmed);
            if(Array.isArray(parsed)){
              // convert to expected row format
              const rows = parsed.map(p=>({name: p.name||p.name||'', amount: p.amount!==undefined? p.amount : (p.amount||''), date: p.date||'', balance: p.balance!==undefined? p.balance : ''}));
              importDataToSection(target, rows);
              return;
            }
          }
        }catch(err){ parsed = null }
        // fallback to CSV
        try{
          const {header, rows} = parseCSV(text);
          // map rows into normalized objects
          const normalized = rows.map(r=>{
            const obj = {};
            // try find likely fields
            obj.name = r.name || r[header.find(h=>/name|source|bill|utility/.test(h))] || '';
            obj.amount = r.amount || r[header.find(h=>/amount|amt|value/.test(h))] || '';
            obj.balance = r.balance || r[header.find(h=>/balance|bal/.test(h))] || '';
            obj.date = r.date || r[header.find(h=>/date/.test(h))] || '';
            return obj;
          });
          importDataToSection(input.dataset.target, normalized);
          return;
        }catch(err){ console.error('Import failed', err); alert('Failed to parse file'); }
      };
      reader.readAsText(file);
      // clear input so same file can be chosen again
      input.value = '';
    });
  });

});
