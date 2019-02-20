#! /bin/bash
cd ~
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 8.15.0
nvm use 8.15.0

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
node node_modules/.bin/pkg -t node8-linux-arm -o mms-arm .
cp mms-arm /buildTarget
