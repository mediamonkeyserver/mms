#! /bin/bash
cd ~
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 8.15.0
nvm use 8.15.0

cd ~
mkdir -p .pkg-cache/v2.5
cd ~/.pkg-cache/v2.5
cp /buildTarget/node-arm64 ./fetched-v8.11.3-linux-arm64
#wget https://github.com/robertsLando/pkg-binaries/raw/master/arm64/fetched-v8.11.3-linux-arm64

cd /
git clone https://github.com/mediamonkeyserver/mms.git
cd /mms
npm install
node node_modules/.bin/pkg -t node8-linux-arm64 -o mms-arm64 .
cp mms-arm64 /buildTarget
