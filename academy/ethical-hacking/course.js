(() => {
  const course = window.ETHICAL_HACKING_COURSE;
  if (!course) return;
  const $ = (s, root=document) => root.querySelector(s);
  const progressKey = 'alberto-ethical-hacking-progress-v1';
  let completed = new Set();
  try { completed = new Set(JSON.parse(localStorage.getItem(progressKey) || '[]')); } catch(e) {}
  const total = course.modules.reduce((n,m)=>n+m.lessons.length,0);
  const save = () => { try { localStorage.setItem(progressKey, JSON.stringify([...completed])); } catch(e) {} };
  const progress = () => {
    const pct = Math.round(completed.size/total*100);
    $('#global-progress').style.width = pct + '%';
  };
  const renderModules = () => {
    $('#module-list').innerHTML = course.modules.map((m,mi) => {
      const done = m.lessons.filter((l,li)=>completed.has(m.id+'-'+li)).length;
      return '<article class="module-card" id="module-'+m.id+'"><button class="module-toggle" aria-expanded="false" aria-controls="body-'+m.id+'"><span class="module-index">MODULE '+m.id+'</span><span><span class="module-title">'+m.title+'</span><span class="module-subtitle">'+m.subtitle+'</span></span><span class="module-meta">'+done+'/'+m.lessons.length+' LESSONS　＋</span></button><div class="module-body" id="body-'+m.id+'"><p class="module-outcome">'+m.outcome+'</p><div class="lesson-list">'+m.lessons.map((l,li)=>'<button class="lesson-button '+(completed.has(m.id+'-'+li)?'done':'')+'" data-module="'+mi+'" data-lesson="'+li+'"><span class="lesson-number">'+String(li+1).padStart(2,'0')+'</span><span class="lesson-name">'+l.title+'</span></button>').join('')+'</div></div></article>';
    }).join('');
    document.querySelectorAll('.module-toggle').forEach(b=>b.addEventListener('click',()=>{
      const card=b.closest('.module-card'); const open=card.classList.toggle('open'); b.setAttribute('aria-expanded',String(open));
      const meta=b.querySelector('.module-meta'); meta.textContent=meta.textContent.replace(/[＋−]$/,open?'−':'＋');
    }));
    document.querySelectorAll('.lesson-button').forEach(b=>b.addEventListener('click',()=>openLesson(+b.dataset.module,+b.dataset.lesson)));
    progress();
  };
  const renderLab = () => {
    const l=course.lab;
    $('#lab-content').innerHTML =
      '<article class="lab-card"><h3>01 / Host architecture</h3><p><strong>'+l.host+'</strong></p><p>'+l.recommendation+'</p><p>'+l.sizing+'</p></article>'+
      '<article class="lab-card"><h3>02 / Virtual machines</h3><ul>'+l.machines.map(x=>'<li><strong>'+x[0]+':</strong> '+x[1]+'</li>').join('')+'</ul></article>'+
      '<article class="lab-card wide"><h3>03 / Network isolation</h3><p>'+l.network+'</p></article>'+
      '<article class="lab-card wide"><h3>04 / Safety rules</h3><p>'+l.safety+'</p></article>';
  };
  const openLesson=(mi,li)=>{
    const m=course.modules[mi], l=m.lessons[li], key=m.id+'-'+li;
    $('#dialog-kicker').textContent='MODULE '+m.id+' / LESSON '+String(li+1).padStart(2,'0');
    const quiz=l.quiz.map((q,qi)=>'<div class="quiz-item" data-correct="'+q.correct+'"><h4>'+(qi+1)+'. '+q.q+'</h4><div class="quiz-options">'+q.options.map((o,oi)=>'<button type="button" data-option="'+oi+'">'+String.fromCharCode(65+oi)+'. '+o+'</button>').join('')+'</div><div class="quiz-feedback" aria-live="polite"></div></div>').join('');
    $('#lesson-content').innerHTML='<article class="lesson-inner"><div class="module-meta">'+m.title+'</div><h2>'+l.title+'</h2><p class="objective">'+l.objective+'</p><h3>Learning objectives & key concepts</h3><div class="concept-chips">'+l.concepts.map(x=>'<span>'+x+'</span>').join('')+'</div><h3>Deep dive</h3>'+l.deep.map((p,i)=>'<p><strong>0'+(i+1)+' /</strong> '+p+'</p>').join('')+'<h3>Guided practical lab</h3><div class="lab-box"><p>'+l.lab+'</p><p><strong>Suggested tools:</strong> '+l.tools.map(t=>'<span class="tool-tag">'+t+'</span>').join(' ')+'</p></div><div class="output-box"><strong>Deliverable:</strong> '+l.output+'</div><h3>Knowledge check · 3 questions</h3><p>Seleziona una risposta per ogni domanda. Il feedback viene mostrato subito; puoi riprovare.</p>'+quiz+'<div class="lesson-actions"><button class="complete-button '+(completed.has(key)?'completed':'')+'" id="mark-complete">'+(completed.has(key)?'✓ Lezione completata':'Segna come completata')+'</button><small>PROGRESSO SALVATO IN QUESTO BROWSER</small></div></article>';
    document.querySelectorAll('.quiz-item').forEach(item=>{
      item.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
        const correct=+item.dataset.correct, selected=+btn.dataset.option;
        item.querySelectorAll('button').forEach(b=>{b.classList.remove('correct','wrong');b.disabled=false;});
        btn.classList.add(selected===correct?'correct':'wrong');
        const qi=[...item.parentElement.querySelectorAll('.quiz-item')].indexOf(item);
        item.querySelector('.quiz-feedback').textContent=selected===correct?'Corretto. '+l.quiz[qi].why:'Non ancora. Rileggi i concetti della lezione e riprova.';
      }));
    });
    $('#mark-complete').addEventListener('click',()=>{
      if(completed.has(key)) completed.delete(key); else completed.add(key);
      save(); renderModules(); progress(); openLesson(mi,li);
    });
    const dlg=$('#lesson-dialog'); if(!dlg.open) dlg.showModal();
  };
  $('#dialog-close').addEventListener('click',()=>$('#lesson-dialog').close());
  $('#lesson-dialog').addEventListener('click',e=>{if(e.target===$('#lesson-dialog'))$('#lesson-dialog').close();});
  renderModules(); renderLab(); progress();
})();