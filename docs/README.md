# DailyPolitics CMS – Editorial Admin

This repository contains the **DailyPolitics Editorial CMS**, a Node.js + Express application deployed behind Nginx and AWS ALB.

The admin interface is exposed at:

👉 **https://editorial.dailypolitics.com/admin/**

This document describes the **architecture, deployment, Nginx configuration, and operational runbook**.

---

## 1. Architecture Overview

### High-level flow

Browser → AWS ALB (HTTPS) → Nginx (EC2) → Node.js (Express)

- Nginx serves static assets
- Nginx proxies `/admin/*` to Node on `127.0.0.1:8080`
- ALB terminates TLS

---

## 2. Project Structure

```
/home/ubuntu/platform/node/dailypolitics-cms
├── public/
│   ├── css/
│   ├── js/
│   └── robots.txt
├── index.js
├── bootstrap.js
└── README.md
```

---

## 3. Node.js Application

### Static Assets

```js
this.app.use(express.static(path.join(__dirname, "public")));
```

### Sessions

- express-session
- Cookie: `JSSESSIONID`
- Proxy aware (`app.set('trust proxy', 1)`)

---

## 4. Nginx Configuration Summary

### Static assets (use alias)

```nginx
location /css/ {
  alias /home/ubuntu/platform/node/dailypolitics-cms/public/css/;
  try_files $uri =404;
}
```

### Admin proxy

```nginx
location ^~ /admin/ {
  proxy_pass http://127.0.0.1:8080;
  proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}
```

### POST-safe admin redirect

```nginx
location = /admin {
  if ($request_method = POST) {
    rewrite ^ /admin/ last;
  }
  return 301 /admin/;
}
```

---

## 5. Permissions

```bash
sudo chmod -R o+rX /home/ubuntu/platform/node/dailypolitics-cms/public
```

---

## 6. systemd Service

```ini
[Service]
WorkingDirectory=/home/ubuntu/platform/node/dailypolitics-cms
ExecStart=/usr/bin/node index.js
Environment=NODE_ENV=production
Environment=PORT=8080
```

---

## 7. Verification

```bash
curl -I https://editorial.dailypolitics.com/css/main.css
curl -I https://editorial.dailypolitics.com/admin/
```

---

## 8. Troubleshooting Highlights

- 404 CSS → alias vs root issue
- Login redirect loop → missing proxy headers
- POST /admin broken → unsafe 301 redirect
- CSP errors → inline handlers blocked

---

## 9. Status

✅ Static assets OK  
✅ Sessions OK  
✅ Admin login stable  
