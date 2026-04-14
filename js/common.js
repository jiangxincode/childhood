document.addEventListener('DOMContentLoaded', function () {
    var style = document.createElement('style');
    style.textContent = [
        '.github-link{position:fixed;top:16px;right:16px;z-index:9999;opacity:0.7;transition:opacity 0.2s;}',
        '.github-link:hover{opacity:1;}',
        '.back-home{position:fixed;top:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:6px;',
            'padding:6px 14px;border-radius:20px;background:rgba(0,0,0,0.45);color:#fff;',
            'font-size:14px;text-decoration:none;opacity:0.75;transition:opacity 0.2s;}',
        '.back-home:hover{opacity:1;}',
    ].join('');
    document.head.appendChild(style);

    // GitHub 图标（所有页面）
    var a = document.createElement('a');
    a.className = 'github-link';
    a.href = 'https://github.com/jiangxincode/childhood';
    a.target = '_blank';
    a.title = '源码仓库';
    a.innerHTML = '<svg height="32" width="32" viewBox="0 0 16 16" fill="#fff"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
    document.body.appendChild(a);

    // 返回主页按钮（仅子页面，即路径中含 /apps/）
    if (window.location.pathname.indexOf('/apps/') !== -1) {
        // 计算到根目录的相对路径（apps/card-game/xxx/index.html 需要 ../../../）
        var depth = window.location.pathname.replace(/\/[^/]*$/, '').split('/apps/')[1];
        var levels = depth ? depth.split('/').length + 1 : 1;
        var prefix = new Array(levels + 1).join('../');

        var back = document.createElement('a');
        back.className = 'back-home';
        back.href = prefix + 'index.html';
        back.title = '返回游戏列表';
        back.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="#fff"><path d="M8 0L0 6v10h5v-5h6v5h5V6z"/></svg> 游戏列表';
        document.body.appendChild(back);
    }
});
