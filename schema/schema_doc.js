document.body.addEventListener('click',e => {
    let el = e.target;
    while(el && !el.classList.contains('schema')) {
        el = el.parentElement;
    }
    if(!el) {
        return
    }
    el.classList.toggle('open');
});
Array.from(document.querySelectorAll('button.toggle-content')).forEach(b => {
    b.addEventListener('click', e => {
        b.setAttribute('aria-checked', b.getAttribute('aria-checked')=='true' ? 'false' : 'true');
    });
});

