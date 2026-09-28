/* ==========================================================================
   Neon 主题交互脚本
   渐进增强：所有效果在禁用 JS 时都不会破坏页面可读性
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var COPY_LABEL = '复制';
  var DONE_LABEL = '已复制';

  /* ------------------------------------------------------------------
     1. 顶栏滚动状态 + 回到顶部按钮
     ------------------------------------------------------------------ */
  var header = doc.getElementById('site-header');
  var toTop = doc.getElementById('to-top');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 420);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     2. 移动端汉堡菜单
     ------------------------------------------------------------------ */
  var toggle = doc.getElementById('nav-toggle');
  var nav = doc.getElementById('site-nav');

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.nav-link')) closeNav();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ------------------------------------------------------------------
     3. 回到顶部
     ------------------------------------------------------------------ */
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     4. 代码块：注入工具栏 + 复制按钮
     ------------------------------------------------------------------ */
  function legacyCopy(text, done) {
    var ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    try { doc.execCommand('copy'); done(); } catch (err) { /* 忽略 */ }
    doc.body.removeChild(ta);
  }

  function bindCopy(btn, getText) {
    btn.addEventListener('click', function () {
      function done() {
        btn.textContent = DONE_LABEL;
        btn.classList.add('is-done');
        setTimeout(function () {
          btn.textContent = COPY_LABEL;
          btn.classList.remove('is-done');
        }, 1800);
      }

      var text = getText();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () {
          legacyCopy(text, done);
        });
      } else {
        legacyCopy(text, done);
      }
    });
  }

  function buildOne(container, pre) {
    if (!pre || container.getAttribute('data-neon-code') === '1') return;
    container.setAttribute('data-neon-code', '1');

    var lang = 'code';
    var m = String(container.className || '').match(/highlight\s+([a-z0-9+#._-]+)/i);
    if (m && m[1] && m[1] !== 'highlight') lang = m[1];

    var bar = doc.createElement('div');
    bar.className = 'code-toolbar';
    bar.setAttribute('aria-hidden', 'true');

    var dots = doc.createElement('span');
    dots.className = 'code-dots';
    dots.innerHTML = '<i class="code-dot"></i><i class="code-dot"></i><i class="code-dot"></i>';

    var langEl = doc.createElement('span');
    langEl.className = 'code-lang';
    langEl.textContent = lang;

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = COPY_LABEL;
    btn.setAttribute('aria-label', '复制代码');
    bindCopy(btn, function () { return pre.innerText; });

    bar.appendChild(dots);
    bar.appendChild(langEl);
    bar.appendChild(btn);

    if (container.tagName === 'PRE') container.classList.add('has-toolbar');
    container.appendChild(bar);
  }

  function buildCodeBlocks() {
    var root = doc.querySelector('.post-content');
    if (!root) return;

    Array.prototype.forEach.call(root.querySelectorAll('figure.highlight'), function (fig) {
      buildOne(fig, fig.querySelector('pre'));
    });

    Array.prototype.forEach.call(root.querySelectorAll('pre'), function (pre) {
      if (pre.closest('figure.highlight')) return;
      buildOne(pre, pre);
    });
  }

  /* ------------------------------------------------------------------
     5. 滚动入场动画
     ------------------------------------------------------------------ */
  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;

    var targets = doc.querySelectorAll(
      '.hero, .card, .post-header, .toc, .post-content, .post-nav, .term, .archive-year, .page-header'
    );
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

    Array.prototype.forEach.call(targets, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i, 8) * 45) + 'ms';
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     6. 目录滚动高亮
     ------------------------------------------------------------------ */
  function setupToc() {
    var tocRoot = doc.querySelector('.toc-body');
    if (!tocRoot) return;

    var links = Array.prototype.slice.call(tocRoot.querySelectorAll('a[href^="#"]'));
    var map = [];

    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch (e) { /* 保持原样 */ }
      var el = doc.getElementById(id);
      if (el) map.push({ el: el, a: a });
    });
    if (!map.length) return;

    var ticking = false;

    function highlight() {
      ticking = false;
      var pos = (window.scrollY || window.pageYOffset || 0) + 130;
      var current = map[0];

      for (var i = 0; i < map.length; i++) {
        if (map[i].el.offsetTop <= pos) current = map[i];
      }

      links.forEach(function (a) {
        var li = a.parentElement;
        if (li) li.classList.remove('toc-item-active');
      });
      if (current.a.parentElement) current.a.parentElement.classList.add('toc-item-active');
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(highlight);
    }, { passive: true });

    highlight();
  }

  /* ------------------------------------------------------------------
     启动
     ------------------------------------------------------------------ */
  function init() {
    buildCodeBlocks();
    setupReveal();
    setupToc();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
