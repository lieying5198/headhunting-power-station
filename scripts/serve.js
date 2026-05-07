/**
 * 本地预览服务
 * 运行: node scripts/serve.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME 类型
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// 创建服务器
const server = http.createServer((req, res) => {
    // 解析 URL
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // 根路径返回 index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // 构建文件路径
    const filePath = path.join(PUBLIC_DIR, pathname);
    
    // 安全检查：防止路径遍历
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在
                res.writeHead(404);
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - 页面未找到</title>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                                background: #0D1B2A; 
                                color: #fff; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                min-height: 100vh; 
                                margin: 0;
                            }
                            .container { text-align: center; }
                            h1 { font-size: 4rem; color: #FF6B35; margin-bottom: 20px; }
                            p { color: #A8B2C1; margin-bottom: 30px; }
                            a { color: #FF6B35; text-decoration: none; }
                            a:hover { text-decoration: underline; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>404</h1>
                            <p>页面未找到，请返回首页</p>
                            <a href="/">返回首页</a>
                        </div>
                    </body>
                    </html>
                `);
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// API 路由处理
server.on('request', (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API 路由
    if (parsedUrl.pathname.startsWith('/api/')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            handleAPI(parsedUrl.pathname, body, res);
        });
    }
});

// API 处理函数
function handleAPI(pathname, body, res) {
    const data = body ? JSON.parse(body) : {};
    
    // 用户数据文件路径
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    
    switch (pathname) {
        case '/api/register':
            // 注册
            try {
                let users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
                
                // 检查是否已注册
                const existing = users.find(u => u.phone === data.phone);
                if (existing) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '该手机号已注册' }));
                    return;
                }
                
                // 创建新用户
                const newUser = {
                    id: 'USR' + Date.now().toString(36).toUpperCase(),
                    name: data.name,
                    phone: data.phone,
                    wechat: data.wechat,
                    referralCode: data.referralCode || null,
                    level: 'free',
                    createdAt: new Date().toISOString(),
                    referrals: [],
                    earnings: 0
                };
                
                users.push(newUser);
                fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '注册成功',
                    data: { userId: newUser.id }
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
            break;
            
        case '/api/verify-referral':
            // 验证推荐码
            try {
                let users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
                const referrer = users.find(u => 
                    u.id === data.code || 
                    u.phone === data.code ||
                    u.wechat === data.code
                );
                
                if (referrer) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        valid: true,
                        referrerName: referrer.name
                    }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        valid: false 
                    }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
            break;
            
        default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'API 不存在' }));
    }
}

// 启动服务器
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🦁 猎头加油站 - 本地预览服务器          ║
╠════════════════════════════════════════════╣
║  访问地址: http://localhost:${PORT}           ║
║  按 Ctrl+C 停止服务器                       ║
╚════════════════════════════════════════════╝
    `);
});
