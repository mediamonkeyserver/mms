#! /bin/bash
# Based on info from: https://chrislea.com/2018/08/20/cross-compiling-node-js-for-arm-on-ubuntu/
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh
bash install_nvm.sh
. ~/.nvm/nvm.sh   # to make nvm usable from shell
nvm install 8.15.0
nvm use 8.15.0

export CC="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-gcc"
export CXX="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export LINK="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export SOLINK="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export SOLINK_MODULE="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-g++"
export AS="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-as"
export AR="/synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/bin/aarch64-unknown-linux-gnueabi-ar"

export CC_host="gcc"
export CXX_host="g++" 
export LINK_host="g++" 
export SOLINK_host="g++" 
export SOLINK_MODULE_host="g++" 

cp /synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/aarch64-unknown-linux-gnueabi/sysroot/usr/lib/* /synotoolkit/build_env/ds.rtd1296-6.2/usr/local/aarch64-unknown-linux-gnueabi/aarch64-unknown-linux-gnueabi/sysroot/usr/lib64/ -r

cd /
mkdir sqlite3
cd sqlite
npm install sqlite3 --build-from-source --target_arch=arm
cp -r /sqlite/node_modules/sqlite3/lib/binding /local