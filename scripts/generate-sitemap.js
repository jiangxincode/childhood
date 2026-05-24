/**
 * Generate sitemap.xml with lastmod and image sitemap.
 * Page lastmod is read from `git log` of each html file.
 * Image paths (with non-ASCII characters) are URL-encoded per sitemap spec.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SITE = 'https://jiangxincode.github.io/childhood';

// page path (relative to repo root) -> { title, image (relative path), priority }
const pages = [
    // Home
    { url: '', title: '童年游戏合集', image: 'images/logo.svg', priority: '1.0', changefreq: 'daily' },

    // Card games
    { url: 'apps/card-game/knife-kills-chicken/index.html', title: '刀杀鸡 - 经典童年卡牌游戏', image: 'images/card-game/刀杀鸡.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/card-game/dragon-tiger-fight/index.html',  title: '龙虎斗 - 经典童年卡牌游戏', image: 'images/card-game/龙虎斗.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/card-game/animal-chess/index.html',        title: '兽棋 - 童年动物卡牌对战游戏', image: 'images/card-game/兽旗.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/card-game/chinese-army-chess/index.html',  title: '军师旅团营 - 童年翻翻棋军棋卡牌游戏', image: 'images/card-game/军师旅团营.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/card-game/cat-and-mouse/index.html',       title: '猫捉老鼠 - 经典童年卡牌追逐游戏', image: 'images/card-game/猫捉老鼠.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/card-game/little-emperor/index.html',      title: '小皇帝 - 经典童年卡牌游戏', image: 'images/card-game/小皇帝.jpg', priority: '0.8', changefreq: 'weekly' },

    // Classic board games
    { url: 'apps/board-game/reversi/index.html',            title: '黑白棋 - 奥赛罗经典棋盘游戏', image: 'images/board-game/黑白棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/tic-tac-toe/index.html',        title: '井字棋 - 三连棋经典策略游戏', image: 'images/board-game/井字棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/gomoku/index.html',             title: '五子棋 - 经典连珠棋盘游戏', image: 'images/board-game/五子棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/checkers/index.html',           title: '国际跳棋 - 经典策略棋盘游戏', image: 'images/board-game/国际跳棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/chinese-chess/index.html',      title: '中国象棋 - 经典中国传统棋盘游戏', image: 'images/board-game/象棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/international-chess/index.html',title: '国际象棋 - 世界经典棋盘策略游戏', image: 'images/board-game/国际象棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/chinese-army-chess/index.html', title: '军棋 - 陆战棋盘版经典军事游戏', image: 'images/board-game/军棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/chinese-checkers/index.html',   title: '中国跳棋 - 六角星形跳棋经典棋盘游戏', image: 'images/board-game/中国跳棋.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/board-game/go/index.html',                 title: '围棋 - 中国古代经典棋盘游戏', image: 'images/board-game/围棋.jpg', priority: '0.8', changefreq: 'weekly' },

    // Dice games
    { url: 'apps/dice-game/flying-chess/index.html',        title: '飞行棋 - 经典童年骰子棋盘游戏', image: 'images/dice-game/飞行棋.jpg', priority: '0.8', changefreq: 'weekly' },

    // Childhood board games
    { url: 'apps/childhood-board-game/lang-chi-yang/index.html',     title: '狼吃羊 - 童年怀旧棋盘对战游戏', image: 'images/childhood-board-game/狼吃羊.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/bie-mao-keng/index.html',      title: '憋茅坑 - 童年怀旧地方棋盘游戏', image: 'images/childhood-board-game/憋茅坑.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/xiao-mao-diao-yu/index.html',  title: '小猫钓鱼 - 童年怀旧棋盘游戏', image: 'images/childhood-board-game/小猫钓鱼.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/zuan-niu-jiao-jian/index.html',title: '钻牛角尖 - 童年怀旧棋盘游戏', image: 'images/childhood-board-game/钻牛角尖.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/bai-si-long/index.html',       title: '摆四龙 - 童年怀旧棋盘游戏', image: 'images/childhood-board-game/摆四龙.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/ma-yi-ban-jia/index.html',     title: '蚂蚁搬家 - 童年怀旧棋盘游戏', image: 'images/childhood-board-game/蚂蚁搬家.jpg', priority: '0.8', changefreq: 'weekly' },
    { url: 'apps/childhood-board-game/si-bu-ding/index.html',        title: '四步钉 - 童年怀旧棋盘游戏', image: 'images/childhood-board-game/四步钉.jpg', priority: '0.8', changefreq: 'weekly' },
];

// Encode each path segment, keep slashes
function encodePath(p) {
    return p.split('/').map(encodeURIComponent).join('/');
}

// Get last commit date for a file as ISO 8601 string (e.g. 2026-05-24)
function getLastMod(filePath) {
    const repoRoot = path.resolve(__dirname, '..');
    const target = filePath || 'index.html';
    try {
        const out = execSync(`git log -1 --format=%cI -- "${target}"`, {
            cwd: repoRoot,
            encoding: 'utf8',
        }).trim();
        if (!out) return null;
        // Keep only YYYY-MM-DD as recommended by Google
        return out.slice(0, 10);
    } catch (e) {
        return null;
    }
}

// XML escape
function xmlEscape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const today = new Date().toISOString().slice(0, 10);

const lines = [];
lines.push('<?xml version="1.0" encoding="UTF-8"?>');
lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
lines.push('        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

for (const p of pages) {
    const pageFile = p.url || 'index.html';
    const lastmod = getLastMod(pageFile) || today;
    const locUrl = p.url ? `${SITE}/${encodePath(p.url)}` : `${SITE}/`;
    const imgUrl = `${SITE}/${encodePath(p.image)}`;

    lines.push('  <url>');
    lines.push(`    <loc>${locUrl}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${p.changefreq}</changefreq>`);
    lines.push(`    <priority>${p.priority}</priority>`);
    lines.push('    <image:image>');
    lines.push(`      <image:loc>${imgUrl}</image:loc>`);
    lines.push(`      <image:title>${xmlEscape(p.title)}</image:title>`);
    lines.push('    </image:image>');
    lines.push('  </url>');
}

lines.push('</urlset>');
lines.push('');

const out = path.resolve(__dirname, '..', 'sitemap.xml');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${out}`);
