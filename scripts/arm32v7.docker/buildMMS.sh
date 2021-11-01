#! /bin/bash
cd ~
. ~/.nvm/nvm.sh   # to make nvm usable from shell
#nvm install 8.15.0
nvm install 16.13.0
#nvm use 8.15.0
nvm use 16.13.0

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
npm run buildUI
node node_modules/.bin/pkg -t node16-linux-armv7 -o mms-arm .
cp mms-arm /buildTarget
cp -r node_modules/sqlite3/lib/binding/* /buildTarget