#! /bin/bash
cd ~
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 10.21.0
nvm use 10.21.0

cd ~
mkdir -p .pkg-cache/v2.6
cp /buildTarget/node-arm64 ~/.pkg-cache/v2.6/built-v10.17.0-linux-arm64

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
mkdir -p node_modules/sqlite3/lib/binding/napi-v64-linux-arm64
cp /buildTarget/node_sqlite3.node node_modules/sqlite3/lib/binding/napi-v64-linux-arm64
npm install
npm run buildUI
node node_modules/.bin/pkg -t node10-linux-arm64 -o mms-arm64 .
cp mms-arm64 /buildTarget