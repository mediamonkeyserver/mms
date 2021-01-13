#! /bin/bash
cd ~
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 10.21.0
nvm use 10.21.0

cd ~
mkdir -p .pkg-cache/v2.6
cd ~/.pkg-cache/v2.6
cp /buildTarget/node-arm64 ./fetched-v8.11.3-linux-arm64

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
npm run buildUI
node node_modules/.bin/pkg -t node8-linux-arm64 -o mms-arm64 .
cp mms-arm64 /buildTarget
cp -r node_modules/sqlite3/lib/binding/* /buildTarget