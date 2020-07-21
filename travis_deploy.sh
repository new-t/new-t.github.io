#!/bin/bash
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "skip deploy for pull request..."
  exit 0
fi

if [ "$TRAVIS_BRANCH" = "master" ]; then
  export DEPLOY_BRANCH="gh-pages-master"
else
  export DEPLOY_BRANCH="gh-pages"
fi

CDN_URL="https://cdn.jsdelivr.net/gh/thuhole/webhole@$DEPLOY_BRANCH"
VERSION_NUMBER="v$(grep -oP '"version": "\K[^"]+' package.json | head -n1).$TRAVIS_BUILD_NUMBER"

echo "DEPLOY_BRANCH=$DEPLOY_BRANCH, VERSION_NUMBER=$VERSION_NUMBER, CDN_URL=$CDN_URL"
git config --global user.name "thuhole"
git config --global user.email "thuhole@users.noreply.github.com"
git remote rm origin
git remote add origin https://thuhole:"${GH_TOKEN}"@github.com/thuhole/webhole.git
CI=false PUBLIC_URL=$CDN_URL REACT_APP_BUILD_INFO=$VERSION_NUMBER npm run build
#额，这里用了个骚操作来修复Service Worker在Precache CDN内容的时候index.html返回content-type text/plain的问题
sed -i 's|https://cdn.jsdelivr.net/gh/thuhole/webhole@'"$DEPLOY_BRANCH"'/index.html|./index.html|g' build/*-*
sed -i 's|https://cdn.jsdelivr.net/gh/thuhole/webhole@'"$DEPLOY_BRANCH"'/service-worker.js|./service-worker.js|g' build/*-*
sed -i 's|"https://cdn.jsdelivr.net/gh/thuhole/webhole@'"$DEPLOY_BRANCH"'","/service-worker.js"|".","/service-worker.js"|' build/static/js/*.js
sed -i 's|storage.googleapis.com/workbox-cdn/releases/4.3.1|cdn.jsdelivr.net/npm/workbox-cdn@4.3.1/workbox|g' build/service-worker.js
npm run deploy